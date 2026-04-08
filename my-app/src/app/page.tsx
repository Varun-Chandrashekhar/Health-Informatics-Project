"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/AuthContext';
import { supabase } from '@/utils/supabase';
import { LogOut } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [preStress, setPreStress] = useState<number>(5);
  const [userNeed, setUserNeed] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstSession, setIsFirstSession] = useState<boolean | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Redirect admin to admin page
  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      router.replace('/admin');
    }
  }, [authLoading, user, router]);

  // Check first session for experimental users
  useEffect(() => {
    if (user && user.condition === 'experimental') {
      const checkFirstSession = async () => {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.userId)
          .eq('condition', 'experimental')
          .limit(1);

        if (!error && data) {
          setIsFirstSession(data.length === 0);
        }
      };
      checkFirstSession();
    }
  }, [user]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Ensure the user exists in our DB
      const { error: userError } = await supabase
        .from('users')
        .upsert({ user_id: user.userId }, { onConflict: 'user_id', ignoreDuplicates: true });

      if (userError) throw userError;

      // 2. Check first session for experimental
      let isFirst = false;
      if (user.condition === 'experimental') {
        const { data: userSessions, error: sessionErr } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.userId)
          .eq('condition', 'experimental')
          .limit(1);

        if (sessionErr) throw sessionErr;
        isFirst = userSessions.length === 0;
      }

      // 3. Create the Session
      const { data: currentSession, error: insertError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.userId,
          condition: user.condition,
          pre_stress: preStress,
          user_need: (user.condition === 'experimental' && !isFirst) ? userNeed : null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Redirect to chat
      router.push(`/chat/${currentSession.id}`);

    } catch (err: any) {
      console.error(err);
      setError(`Failed to start session: ${err.message || JSON.stringify(err)}. Please try again.`);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (authLoading || !user || user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse w-10 h-10 bg-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-10 border border-slate-100">

        {/* User Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daily Check-in</h1>
            <p className="text-slate-400 text-sm">Signed in as <span className="font-bold text-slate-600">{user.userId}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="text-slate-500 text-sm mb-8">Before we start chatting, please let us know how you're feeling right now.</p>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}

        <form onSubmit={handleStartSession} className="space-y-10">

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">Right now, how stressed do you feel?</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3 px-1">
              <span>0 (Not at all)</span>
              <span>10 (Extremely)</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={preStress}
              onChange={(e) => setPreStress(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all hover:bg-slate-300"
            />
            <div className="text-center font-bold text-3xl text-blue-600 pt-4 tracking-tight">{preStress}</div>
          </div>

          {user.condition === 'experimental' && (
            <div className="space-y-4 pt-8 border-t border-slate-100">
              {isFirstSession === false && (
                <>
                  <label className="block text-sm font-bold text-slate-700 mb-3">How would you like to engage today?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { value: 'Emotional expression', label: 'Express your feelings' },
                      { value: 'Cognitive reflection', label: 'Reflect on your thoughts' },
                      { value: 'Coping strategies', label: 'Get coping strategies' },
                      { value: 'Action planning', label: 'Make a plan' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer border rounded-2xl p-4 text-sm font-medium transition-all flex items-center shadow-sm ${
                          userNeed === option.value
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/50'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="userNeed"
                          value={option.value}
                          checked={userNeed === option.value}
                          onChange={(e) => setUserNeed(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 mr-3 flex items-center justify-center transition-colors ${
                          userNeed === option.value ? 'border-blue-500' : 'border-slate-300'
                        }`}>
                          {userNeed === option.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        {option.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {isFirstSession !== null && (
                <p className="text-sm text-slate-600 font-medium bg-blue-50 p-4 rounded-xl leading-relaxed mt-6 border border-blue-100">
                  {isFirstSession
                    ? "👋 Hi! This is your first session, so we will be focusing on defining your preferred personality and support style today."
                    : "👋 Welcome back to another session!"}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (user.condition === 'experimental' && isFirstSession === false && !userNeed)}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Start Conversation"}
          </button>

          <button
            type="button"
            onClick={() => router.push('/history')}
            className="w-full mt-4 bg-white border-2 border-blue-200 hover:border-blue-400 text-blue-700 font-bold py-4 px-4 rounded-xl transition-all shadow-sm hover:shadow flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            View Past Sessions
          </button>

          <button
            type="button"
            onClick={() => router.push('/reflection')}
            className="w-full mt-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-4 px-4 rounded-xl transition-all shadow-sm hover:shadow flex justify-center items-center"
          >
            View My 5-Day Reflection
          </button>
        </form>
      </div>
    </main>
  );
}
