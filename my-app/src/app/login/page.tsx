"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password setup state
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupFullName, setSetupFullName] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryUserId, setRecoveryUserId] = useState('');
  const [recoveryFullName, setRecoveryFullName] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // If already logged in, redirect (block redirect if we are currently prompting for password setup)
  if (!loading && user && !showPasswordSetup && !showForgotPassword) {
    if (user.isAdmin) {
      router.replace('/admin');
    } else {
      router.replace('/');
    }
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedUser = userId.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      setSubmitting(false);
      return;
    }

    const result = await login(trimmedUser, trimmedPass);

    if (result.success) {
      // Check if this is a default password (password === userId) — prompt to change
      // Only require P01 - P20 to change their password
      if (trimmedPass === trimmedUser && trimmedUser.toUpperCase().startsWith('P')) {
        setPendingUserId(trimmedUser);
        setShowPasswordSetup(true);
        setSubmitting(false);
      } else {
        router.push('/');
      }
    } else {
      setError(result.error || 'Login failed.');
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!setupFullName.trim()) {
      setSetupError('Please enter your full name.');
      return;
    }

    if (newPassword.length < 3) {
      setSetupError('Password must be at least 3 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);

    const res = await fetch('/api/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pendingUserId, newPassword, fullName: setupFullName }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      setSetupError(json.error || 'Failed to save password. Please try again.');
      setSavingPassword(false);
      return;
    }

    // Continue to home
    router.push('/');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryUserId.trim() || !recoveryFullName.trim() || !recoveryNewPassword.trim()) {
      setRecoveryError('Please fill in all fields.');
      return;
    }

    if (recoveryNewPassword.length < 3) {
      setRecoveryError('Password must be at least 3 characters.');
      return;
    }

    setRecoverySubmitting(true);

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: recoveryUserId.trim(), 
        fullName: recoveryFullName.trim(), 
        newPassword: recoveryNewPassword 
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      setRecoveryError(json.error || 'Reset failed. Please verify your details.');
      setRecoverySubmitting(false);
      return;
    }

    setRecoverySuccess(true);
    setRecoverySubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse w-10 h-10 bg-blue-600 rounded-full"></div>
      </div>
    );
  }

  // Forgot Password screen
  if (showForgotPassword) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 text-slate-800 p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Reset Password</h1>
            <p className="text-slate-400 text-sm mt-1">Verify your identity to choose a new password.</p>
          </div>

          {recoverySuccess ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 text-center">
                Password updated successfully! You can now sign in with your new password.
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setRecoverySuccess(false);
                }}
                className="w-full bg-slate-900 text-white font-bold py-4 px-4 rounded-xl transition-all"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {recoveryError && (
                <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {recoveryError}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="recoveryUserId" className="block text-sm font-bold text-slate-700 mb-2">Participant ID</label>
                  <input
                    id="recoveryUserId"
                    type="text"
                    value={recoveryUserId}
                    onChange={(e) => setRecoveryUserId(e.target.value)}
                    placeholder="e.g. P01"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="recoveryFullName" className="block text-sm font-bold text-slate-700 mb-2">Your Full Name</label>
                  <input
                    id="recoveryFullName"
                    type="text"
                    value={recoveryFullName}
                    onChange={(e) => setRecoveryFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="recoveryNewPassword" className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                  <input
                    id="recoveryNewPassword"
                    type="password"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="Choose a new password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recoverySubmitting}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 flex justify-center items-center"
                >
                  {recoverySubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : "Update Password"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                >
                  Back to Login
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    );
  }

  // Password setup screen
  if (showPasswordSetup) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 text-slate-800 p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Finalize Account</h1>
            <p className="text-slate-400 text-sm mt-1">Please provide your details to continue.</p>
          </div>

          {setupError && (
            <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {setupError}
            </div>
          )}

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label htmlFor="setupFullName" className="block text-sm font-bold text-slate-700 mb-2">First and Last Name</label>
              <input
                id="setupFullName"
                type="text"
                value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
                placeholder="Spelled exactly as on your ID"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-bold text-slate-700 mb-2">Private Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a password"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 flex justify-center items-center"
            >
              {savingPassword ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : "Set Up Account"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Login screen
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-slate-100">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">CBT Assistant</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in with your participant ID</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="userId" className="block text-sm font-bold text-slate-700 mb-2">Username</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. P01"
              autoComplete="username"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">Password</label>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md shadow-blue-600/20 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {submitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-slate-300 text-center mt-8">Research Study — Authorized Participants Only</p>
      </div>
    </main>
  );
}
