import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import AuthFrame from '../components/AuthFrame';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
    role: 'ADMIN',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [signupOpen, setSignupOpen] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/signup/').then((res) => {
      const open = Boolean(res.data.signup_open || res.data.admin_signup_open);
      setSignupOpen(open);
      setForm((prev) => ({ ...prev, role: 'ADMIN' }));
    }).catch(() => setSignupOpen(false));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!signupOpen) {
      setError('Public signup is closed. Ask an administrator to create your account.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
        password: form.password,
        role: 'ADMIN',
      });
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (!data) {
        setError('Could not create account. Please try again.');
      } else if (typeof data === 'string') {
        setError(data);
      } else {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' '));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <div className="relative">
        {/* Subtle decorative glow around the card */}
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-indigo-600/30 via-blue-600/20 to-amber-500/20 blur-xl opacity-60" />

        <div className="relative rounded-3xl bg-slate-900/90 border border-slate-700/70 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl">
          {/* Top highlight gradient strip */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Card Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Initial Setup
              </span>
              <span className="text-[11px] text-slate-400 font-mono">System Admin</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">Create Administrator</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {signupOpen
                ? 'Create the initial root administrator. Faculty logins are created from the Users directory.'
                : 'Public signup is closed. Please ask your administrator to create your account.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-3 text-xs sm:text-sm text-red-300 animate-in fade-in duration-200">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">First name</label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="e.g. John"
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Last name</label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="e.g. Doe"
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="jdoe_admin"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="admin@university.edu"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <span className="text-[10px] text-slate-500">Min 8 characters</span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={(e) => update('confirm', e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !signupOpen}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Administrator...</span>
                </>
              ) : (
                <>
                  <span>Create Administrator Account</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Already have an account link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an administrator or faculty account?{' '}
              <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthFrame>
  );
}
