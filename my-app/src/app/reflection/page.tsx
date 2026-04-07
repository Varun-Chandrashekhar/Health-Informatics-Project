"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

export default function ReflectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchReflectionData = async () => {
      try {
        const response = await fetch(`/api/reflection?user_id=${user.userId}`);
        const result = await response.json();

        if (response.ok) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to fetch reflection data.");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchReflectionData();
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center">
          <svg className="animate-spin mb-4 h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-semibold text-slate-600">Generating your 5-day reflection...</p>
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
          <button onClick={() => router.push('/')} className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Your 5-Day Reflection</h1>
          <p className="text-slate-600">A look back at your interactions and stress levels over the past 5 days.</p>
        </div>

        {/* Numeric Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Interactions</p>
            <p className="text-4xl font-extrabold text-blue-600 mt-2">{data.totalInteractions}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Avg Pre-Stress</p>
            <p className="text-4xl font-extrabold text-orange-500 mt-2">{data.averagePreStress}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Avg Post-Stress</p>
            <p className="text-4xl font-extrabold text-emerald-500 mt-2">{data.averagePostStress !== null ? data.averagePostStress : 'N/A'}</p>
          </div>
        </div>

        {/* Narrative Review */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <span className="text-blue-500 mr-2">✦</span>
            Observational Summary
          </h2>
          <div className="prose prose-slate prose-p:leading-relaxed text-slate-700 bg-slate-50/50 p-6 rounded-2xl">
            {data.narrativeReflection}
          </div>
        </div>

        {/* Line Chart */}
        {data.chartData && data.chartData.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Stress Trends</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 10]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="preStress"
                    name="Pre-Chat Stress"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="postStress"
                    name="Post-Chat Stress"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
