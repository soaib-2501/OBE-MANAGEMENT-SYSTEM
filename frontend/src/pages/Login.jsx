import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setError('Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">OBE Management System</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in as Administrator or Faculty</p>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4">{error}</div>}

        <label className="block text-sm font-medium text-slate-700 mb-1">Username or email</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-6 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded font-semibold disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {signupOpen && (
          <p className="text-sm text-slate-500 mt-4 text-center">
            First-time setup?{' '}
            <Link to="/signup" className="text-slate-900 font-semibold hover:underline">Create the administrator</Link>
          </p>
        )}
      </form>
    </div>
  );
}
