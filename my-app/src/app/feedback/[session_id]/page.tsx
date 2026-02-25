"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function FeedbackPage({ params }: { params: { session_id: string } }) {
  const router = useRouter();
  const sessionId = params.session_id;

  const [postStress, setPostStress] = useState<number>(5);
  const [helpfulness, setHelpfulness] = useState<number>(3);
  const [openEnded, setOpenEnded] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          post_stress: postStress,
          helpfulness_rating: helpfulness,
          open_ended_response: openEnded,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 font-sans">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-10 border border-slate-100 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank you for checking in today.</h2>
          <p className="text-slate-500 mb-8">Your responses have been recorded successfully. You can close this tab now and check back in with us anytime using the same link.</p>
          
          <div className="pt-6 border-t border-slate-100 text-left bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-2">Need immediate support?</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              This chatbot is an experimental research tool and is <strong>not a substitute for professional care.</strong>
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              If you are experiencing a crisis, please call or text <strong className="text-red-500">988</strong> or contact your local emergency services immediately.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-10 border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Wrap-up</h1>
        <p className="text-slate-500 text-sm mb-8">Please take a moment to reflect on your conversation.</p>
        
        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-10">
          
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
              value={postStress} 
              onChange={(e) => setPostStress(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all hover:bg-slate-300"
            />
            <div className="text-center font-bold text-3xl text-blue-600 pt-4 tracking-tight">{postStress}</div>
          </div>

          <div className="space-y-4 pt-8 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700">How helpful was this conversation?</label>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3 px-1">
              <span>1 (Not Helpful)</span>
              <span>5 (Very Helpful)</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={helpfulness} 
              onChange={(e) => setHelpfulness(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500 transition-all hover:bg-slate-300"
            />
            <div className="text-center font-bold text-3xl text-teal-600 pt-4 tracking-tight">{helpfulness}</div>
          </div>

          <div className="space-y-4 pt-8 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700">Anything you would like to add? <span className="text-slate-400 font-normal">(Optional)</span></label>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-32"
              placeholder="Any thoughts on what worked well or what could be improved..."
              value={openEnded}
              onChange={(e) => setOpenEnded(e.target.value)}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-slate-900 hover:bg-black text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Submit Feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}
