import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import AuthFrame from '../components/AuthFrame';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/signup/').then((res) => {
      setSignupOpen(Boolean(res.data.signup_open || res.data.admin_signup_open));
    }).catch(() => setSignupOpen(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username/email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 p-7 sm:p-9 relative overflow-hidden">
        {/* Top colored accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

        {/* Card Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Access your course files, assessment tools, and attainment reports.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-red-700">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="username">
              Username or Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="username"
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                placeholder="Enter username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
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

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
              <span className="text-xs text-slate-600">Remember credentials</span>
            </label>
            <span className="text-[11px] text-slate-400">JWT Protected</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:shadow-blue-600/30 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        {/* First-time Administrator Setup Link */}
        {signupOpen && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              First-time setup?{' '}
              <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                Create administrator account &rarr;
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
