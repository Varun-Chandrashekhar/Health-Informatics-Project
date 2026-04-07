"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { supabase } from '@/utils/supabase';
import { LogOut, Shield, Users, FlaskConical, Beaker } from 'lucide-react';

interface ParticipantRow {
  user_id: string;
  assigned_condition: string;
  is_admin: boolean;
  session_count: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Fetch participants
  useEffect(() => {
    if (!user?.isAdmin) return;

    const fetchParticipants = async () => {
      // Fetch all non-admin users
      const { data: users, error: userErr } = await supabase
        .from('users')
        .select('user_id, assigned_condition, is_admin')
        .eq('is_admin', false)
        .order('user_id', { ascending: true });

      if (userErr || !users) {
        console.error("Failed to fetch users:", userErr);
        setDataLoading(false);
        return;
      }

      // Fetch session counts per user
      const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('user_id');

      const sessionCounts: Record<string, number> = {};
      if (!sessErr && sessions) {
        for (const s of sessions) {
          sessionCounts[s.user_id] = (sessionCounts[s.user_id] || 0) + 1;
        }
      }

      const rows: ParticipantRow[] = users.map(u => ({
        user_id: u.user_id,
        assigned_condition: u.assigned_condition || 'control',
        is_admin: u.is_admin || false,
        session_count: sessionCounts[u.user_id] || 0,
      }));

      setParticipants(rows);
      setDataLoading(false);
    };

    fetchParticipants();
  }, [user]);

  const toggleCondition = async (userId: string, currentCondition: string) => {
    const newCondition = currentCondition === 'control' ? 'experimental' : 'control';
    setUpdating(userId);

    const { error } = await supabase
      .from('users')
      .update({ assigned_condition: newCondition })
      .eq('user_id', userId);

    if (!error) {
      setParticipants(prev =>
        prev.map(p => p.user_id === userId ? { ...p, assigned_condition: newCondition } : p)
      );
    } else {
      console.error("Failed to update condition:", error);
    }

    setUpdating(null);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse w-10 h-10 bg-blue-600 rounded-full"></div>
      </div>
    );
  }

  const controlCount = participants.filter(p => p.assigned_condition === 'control').length;
  const experimentalCount = participants.filter(p => p.assigned_condition === 'experimental').length;
  const totalSessions = participants.reduce((sum, p) => sum + p.session_count, 0);

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Manage participant conditions</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{participants.length}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Participants</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Beaker className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{controlCount} <span className="text-sm font-bold text-slate-400">/ {experimentalCount}</span></p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Control / Experimental</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalSessions}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Total Sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">All Participants</h2>
          </div>

          {dataLoading ? (
            <div className="p-12 text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-400 text-sm">Loading participants...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Participant</th>
                    <th className="text-left px-6 py-3">Condition</th>
                    <th className="text-center px-6 py-3">Sessions</th>
                    <th className="text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {participants.map((p) => (
                    <tr key={p.user_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{p.user_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                          p.assigned_condition === 'experimental'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.assigned_condition === 'experimental' ? 'bg-purple-500' : 'bg-slate-400'
                          }`}></span>
                          {p.assigned_condition === 'experimental' ? 'Experimental' : 'Control'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-700">{p.session_count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleCondition(p.user_id, p.assigned_condition)}
                          disabled={updating === p.user_id}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 ${
                            p.assigned_condition === 'experimental'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {updating === p.user_id ? '...' : p.assigned_condition === 'experimental' ? 'Switch to Control' : 'Switch to Experimental'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
