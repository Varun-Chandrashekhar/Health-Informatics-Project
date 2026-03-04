import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error("Missing environment variables. Please check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = createOpenAI({
  apiKey: openaiKey,
});

async function draftEmails() {
  console.log("Starting to draft reflection emails for all users...");
  
  // Fetch all unique users who have sessions
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('user_id');
    
  if (userErr) {
    console.error("Error fetching users:", userErr);
    return;
  }
  
  const allDrafts = [];
  
  for (const user of users) {
    console.log(`\nProcessing user: ${user.user_id}`);
    
    // Fetch sessions
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, started_at, pre_stress, post_stress, session_summary')
      .eq('user_id', user.user_id)
      .gte('started_at', fiveDaysAgo.toISOString())
      .order('started_at', { ascending: true });
      
    if (sessionErr || !sessions || sessions.length === 0) {
      console.log(`No recent sessions found for user ${user.user_id}`);
      continue;
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('session_id, role, content, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error("Messages Fetch Error:", msgErr);
    }

    const messagesBySession = {};
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (!messagesBySession[msg.session_id]) {
          messagesBySession[msg.session_id] = [];
        }
        messagesBySession[msg.session_id].push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
      }
    }

    const totalInteractions = sessions.length;
    let preStressTotal = 0;
    let postStressTotal = 0;
    let postStressCount = 0;
    const sessionHistorySummary = [];
    
    sessions.forEach(s => {
      if (s.pre_stress != null) preStressTotal += s.pre_stress;
      if (s.post_stress != null) {
        postStressTotal += s.post_stress;
        postStressCount++;
      }
      let sessionContext = `Date: ${new Date(s.started_at).toLocaleDateString()}\n`;
      if (s.session_summary) {
        sessionContext += `Summary: ${s.session_summary}\n`;
      }
      if (messagesBySession[s.id]) {
        sessionContext += `Transcript:\n${messagesBySession[s.id].join('\n')}\n`;
      } else {
        sessionContext += `Transcript: No messages recorded.\n`;
      }
      sessionHistorySummary.push(sessionContext);
    });

    const averagePreStress = parseFloat((preStressTotal / totalInteractions).toFixed(1));
    const averagePostStress = postStressCount > 0 ? parseFloat((postStressTotal / postStressCount).toFixed(1)) : 'N/A';
    
    const numericalDescription = `
      Total interactions over the past 5 days: ${totalInteractions}.
      Average reported stress before conversations: ${averagePreStress}/10.
      Average reported stress after conversations: ${averagePostStress !== 'N/A' ? averagePostStress + '/10' : 'N/A'}.
    `;

    const instructions = `
      You are generating a neutral study reflection email for a college student participant.
      Summarize engagement patterns and stress trends based on the provided numerical data and recent session summaries.
      
      CRITICAL CONSTRAINTS:
      - Do NOT provide advice.
      - Do NOT provide clinical interpretation.
      - Do NOT diagnose.
      - Keep tone observational, neutral, and empathetic but detached.
      - Maximum 150 words.
      - Address the user directly (e.g., "Hello Participant," "Over the past 5 days, you...").
      - Conclude the email thanking them for participating.
    `;

    const finalPrompt = `
      ${instructions}

      [NUMERICAL DATA]
      ${numericalDescription}

      [SESSION HISTORY SUMMARIES]
      ${sessionHistorySummary.length > 0 ? sessionHistorySummary.join('\n') : "No detailed summaries available."}
    `;

    try {
      const { text: emailBody } = await generateText({
        model: openai('gpt-4o'),
        prompt: finalPrompt,
      });
      
      const emailDraft = `
=========================================
To: User [${user.user_id}]
Subject: Your 5-Day Study Reflection
=========================================
${emailBody}

[Stats Attachment / Dashboard Link]
View your full interactive graph here: 
http://localhost:3000/reflection?user_id=${user.user_id}
=========================================
`;
      allDrafts.push(emailDraft);
      console.log(`Draft completed for ${user.user_id}`);
    } catch (e) {
      console.error(`Failed to generate text for ${user.user_id}`, e);
    }
  }
  
  if (allDrafts.length > 0) {
    const outputPath = path.join(process.cwd(), 'drafted-emails.txt');
    fs.writeFileSync(outputPath, allDrafts.join('\n\n'));
    console.log(`\nSuccess! Wrote ${allDrafts.length} exact email drafts to ${outputPath}`);
  } else {
    console.log("No valid sessions found across any user to generate drafts.");
  }
}

draftEmails();
