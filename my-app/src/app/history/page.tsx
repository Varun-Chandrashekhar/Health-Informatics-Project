"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { ChevronDown, ChevronUp, ArrowLeft, MessageCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  started_at: string;
  completed_at: string;
  condition: string;
  pre_stress: number;
  post_stress: number | null;
  user_need: string | null;
  helpfulness_rating: number | null;
  session_summary: string | null;
  messages: Message[];
}

const NEED_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Vent': { label: '💬 Vent', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  'Reflect': { label: '🪞 Reflect', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Coping Strategies': { label: '🧠 Coping Strategies', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Action Plan': { label: '🎯 Action Plan', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function StressIndicator({ pre, post }: { pre: number; post: number | null }) {
  if (post === null) return null;
  const diff = post - pre;
  const improved = diff < 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${improved ? 'text-emerald-600' : diff > 0 ? 'text-red-500' : 'text-slate-400'}`}>
      {improved ? <TrendingDown className="w-3.5 h-3.5" /> : diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : null}
      <span>{pre} → {post}</span>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Fetch history
  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/history?user_id=${user.userId}`);
        const result = await response.json();

        if (response.ok) {
          setSessions(result.sessions || []);
        } else {
          setError(result.error || "Failed to fetch history.");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse w-10 h-10 bg-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin mb-4 h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-semibold text-slate-600">Loading your session history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800">
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-md text-center border border-slate-100">
          <h2 className="text-xl font-bold mb-4 text-red-500">Error</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Past Sessions</h1>
          <p className="text-slate-500">Review your previous conversations, summaries, and engagement styles.</p>
          {sessions.length > 0 && (
            <p className="text-sm text-slate-400 mt-2">{sessions.length} completed session{sessions.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Empty State */}
        {sessions.length === 0 && (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">No completed sessions yet</h2>
            <p className="text-sm text-slate-400">Once you complete a conversation, it will appear here with its full transcript and summary.</p>
          </div>
        )}

        {/* Session List */}
        {sessions.map((session) => {
          const isExpanded = expandedId === session.id;
          const badge = session.user_need ? NEED_BADGES[session.user_need] : null;

          return (
            <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className="w-full text-left px-6 py-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900">{formatDate(session.started_at)}</h3>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.started_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {badge && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.bg} ${badge.color} ${badge.border}`}>
                          {badge.label}
                        </span>
                      )}
                      <StressIndicator pre={session.pre_stress} post={session.post_stress} />
                      {session.helpfulness_rating && (
                        <span className="text-xs text-slate-400 font-medium">
                          Helpfulness: {session.helpfulness_rating}/5
                        </span>
                      )}
                    </div>

                    {session.session_summary && (
                      <p className={`text-sm text-slate-600 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {session.session_summary}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-500" />
                        : <ChevronDown className="w-4 h-4 text-slate-500" />
                      }
                    </div>
                  </div>
                </div>

                {!isExpanded && session.messages.length > 0 && (
                  <p className="text-xs text-blue-500 font-medium mt-2">
                    View full conversation ({session.messages.length} messages) →
                  </p>
                )}
              </button>

              {isExpanded && session.messages.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5 space-y-4 max-h-[500px] overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Full Conversation</h4>
                  {session.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                          ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                          }`}
                      >
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && session.messages.length === 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-8 text-center">
                  <p className="text-sm text-slate-400 italic">No messages were recorded for this session.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
