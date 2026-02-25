"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

function PreChatForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const userId = searchParams.get('user_id');
  const condition = searchParams.get('condition') || 'control'; // default to control
  
  const [preStress, setPreStress] = useState<number>(5);
  const [userNeed, setUserNeed] = useState<string>("Reflect");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstSession, setIsFirstSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (userId && condition === 'experimental') {
      const checkFirstSession = async () => {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('condition', 'experimental')
          .limit(1);
          
        if (!error && data) {
          setIsFirstSession(data.length === 0);
        }
      };
      checkFirstSession();
    }
  }, [userId, condition]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800">
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-md text-center border border-slate-100">
          <h2 className="text-xl font-bold mb-4 text-red-500">Missing Identification</h2>
          <p className="text-slate-500 text-sm">Please make sure you are accessing this application using the exact link provided in your study email (it should include `?user_id=...`).</p>
        </div>
      </div>
    );
  }

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Ensure the user exists in our DB (if not, insert them)
      const { error: userError } = await supabase
        .from('users')
        .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
        
      if (userError) throw userError;

      // 2. Check if this is the "First Session" for the Experimental Condition to route them to Onboarding
      let isFirst = false;
      if (condition === 'experimental') {
        const { data: userSessions, error: sessionErr } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('condition', 'experimental')
          .limit(1);
          
        if (sessionErr) throw sessionErr;
        isFirst = userSessions.length === 0;
      }

      // 3. Create the Session
      const { data: currentSession, error: insertError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          condition: condition,
          pre_stress: preStress,
          user_need: (condition === 'experimental' && !isFirst) ? userNeed : null
        })
        .select()
        .single();
        
      if (insertError) throw insertError;

      // 4. Redirect to chat interface
      router.push(`/chat/${currentSession.id}`);
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to start session. Please try again or check your connection.");
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-10 border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Daily Check-in</h1>
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

          {condition === 'experimental' && (
            <div className="space-y-4 pt-8 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700">How would you like to engage today?</label>
              <div className="relative">
                <select 
                  value={userNeed} 
                  onChange={(e) => setUserNeed(e.target.value)}
                  className="w-full p-4 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="Vent">Just vent & express feelings</option>
                  <option value="Reflect">Reflect on thoughts and emotions</option>
                  <option value="Coping Strategies">Receive structured coping strategies</option>
                  <option value="Action Plan">Make a small action plan / goal-setting</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
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
            disabled={loading}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Start Conversation"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse w-10 h-10 bg-blue-600 rounded-full"></div>
      </div>
    }>
      <PreChatForm />
    </Suspense>
  );
}
