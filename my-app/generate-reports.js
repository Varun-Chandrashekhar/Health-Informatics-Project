import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

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

const OUT_DIR = path.join(process.cwd(), 'participant_reflections');

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function draftEmailsAndScreenshots() {
  console.log("Starting to generate reflection reports and screenshots...");
  
  await ensureDir(OUT_DIR);

  // Fetch all unique users who have sessions
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('user_id');
    
  if (userErr) {
    console.error("Error fetching users:", userErr);
    return;
  }
  
  // Launch Puppeteer instance
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
  } catch (e) {
    console.error("Failed to launch Puppeteer:", e);
    return;
  }
  
  let successCount = 0;

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

    // Prepare their personal directory
    const userDir = path.join(OUT_DIR, user.user_id);
    await ensureDir(userDir);

    const sessionIds = sessions.map(s => s.id);
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('session_id, role, content, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (msgErr) console.error("Messages Fetch Error:", msgErr);

    const messagesBySession = {};
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (!messagesBySession[msg.session_id]) messagesBySession[msg.session_id] = [];
        messagesBySession[msg.session_id].push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
      }
    }

    const totalInteractions = sessions.length;
    let preStressTotal = 0, postStressTotal = 0, postStressCount = 0;
    const sessionHistorySummary = [];
    
    sessions.forEach(s => {
      if (s.pre_stress != null) preStressTotal += s.pre_stress;
      if (s.post_stress != null) {
        postStressTotal += s.post_stress;
        postStressCount++;
      }
      let sessionContext = `Date: ${new Date(s.started_at).toLocaleDateString()}\n`;
      if (s.session_summary) sessionContext += `Summary: ${s.session_summary}\n`;
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
      - Do NOT provide advice, interpretation, or diagnosis.
      - Keep tone observational, neutral, and empathetic but detached.
      - Maximum 150 words.
      - Address the user directly (e.g., "Hello Participant," "Over the past 5 days, you...").
      - Conclude the email thanking them.
    `;

    const finalPrompt = `${instructions}\n\n[NUMERICAL DATA]\n${numericalDescription}\n\n[SESSION HISTORY SUMMARIES]\n${sessionHistorySummary.length > 0 ? sessionHistorySummary.join('\n') : "No detailed summaries available."}`;

    try {
      const { text: emailBody } = await generateText({
        model: openai('gpt-4o'),
        prompt: finalPrompt,
      });
      
      const emailDraft = `
Subject: Your 5-Day Study Reflection
=========================================
${emailBody}

[Stats Attachment]
See your attached interactive graph snapshot.
=========================================
`;
      // Write the text email
      fs.writeFileSync(path.join(userDir, 'reflection_email.txt'), emailDraft.trim());
      console.log(`Email drafted for ${user.user_id}`);

      // Now capture the screenshot with Puppeteer
      const page = await browser.newPage();
      // Set a nice desktop viewport
      await page.setViewport({ width: 1024, height: 1200 });
      
      const url = `http://localhost:3000/reflection?user_id=${user.user_id}`;
      console.log(`Capturing screenshot for ${user.user_id} (${url})...`);
      
      // Go to the page and wait until there are no more than 0 network connections for at least 500 ms.
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait a little extra to ensure recharts renders the animation
      await new Promise(r => setTimeout(r, 1500));
      
      const screenshotPath = path.join(userDir, 'reflection_dashboard.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
      
      await page.close();
      successCount++;

    } catch (e) {
      console.error(`Failed to generate text or screenshot for ${user.user_id}`, e);
    }
  }
  
  await browser.close();
  
  if (successCount > 0) {
    console.log(`\nSuccess! Wrote ${successCount} reports to ${OUT_DIR}`);
  } else {
    console.log("No valid sessions found across any user to generate drafts.");
  }
}

draftEmailsAndScreenshots();
