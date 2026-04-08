"use client";

import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Send, LogOut } from 'lucide-react';
import { use } from 'react';

// Renders assistant message content as second-person bullet points.
// Splits on sentence boundaries or newlines and presents as a list.
function AssistantMessage({ content }: { content: string }) {
  // Split into bullet items: prefer existing newlines, otherwise split by sentences
  const rawLines = content.split(/\n+/).filter(l => l.trim().length > 0);
  
  // If the content is already multi-line, use those lines directly.
  // Otherwise split by sentence endings to create bullets.
  const bullets: string[] =
    rawLines.length > 1
      ? rawLines.map(l => l.replace(/^[-•*]\s*/, '').trim())
      : content
          .split(/(?<=[\.\?\!])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

  if (bullets.length <= 1) {
    // Short single-sentence: render inline, no bullet
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <ul className="space-y-1.5 leading-relaxed list-none pl-0">
      {bullets.map((bullet, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ChatPage({ params }: { params: Promise<{ session_id: string }> }) {
  const router = useRouter();
  const { session_id: sessionId } = use(params);
  const [initiated, setInitiated] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    body: {
      sessionId: sessionId
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Trigger AI first message on mount
  useEffect(() => {
    if (initiated) return;
    setInitiated(true);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], sessionId, initiate: true }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) return;
        // Stream the response and append as an assistant message via append()
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Vercel AI data stream format: lines starting with '0:' contain text chunks
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('0:')) {
              try {
                fullText += JSON.parse(line.slice(2));
              } catch {}
            }
          }
        }
        if (fullText) {
          append({ role: 'assistant', content: fullText });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset textarea height when input clears (after submission)
  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
    }
  }, [input]);

  const onTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !isEnding) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  const handleEndSession = () => {
    setIsEnding(true);
    setTimeout(() => {
      router.push(`/feedback/${sessionId}`);
    }, 400);
  };

  return (
    <main className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-800">CBT Assistant</h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Take a few minutes to talk about what&apos;s on your mind</p>
        </div>
        
        <button 
          onClick={handleEndSession}
          disabled={isEnding || messages.length === 0}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnding ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>End Conversation</span>
            </>
          )}
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 max-w-sm mx-auto text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-1">Getting ready…</p>
              <p className="text-sm">Your session is starting. The assistant will greet you shortly.</p>
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed
                ${m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                }`}
            >
              {m.role === 'assistant'
                ? <AssistantMessage content={m.content} />
                : <span className="whitespace-pre-wrap">{m.content}</span>
              }
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 text-slate-400 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex space-x-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="pb-4" />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end">
          <textarea
            ref={textareaRef}
            className="w-full bg-slate-100 text-slate-800 rounded-3xl pl-6 pr-14 py-4 min-h-[56px] max-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all shadow-inner text-[15px] resize-none overflow-y-auto"
            value={input}
            placeholder="Type your message here..."
            onChange={onTextareaInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isEnding}
            rows={1}
          />
          <button 
            type="submit" 
            disabled={isLoading || isEnding || !input.trim()}
            className="absolute right-2 bottom-2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
