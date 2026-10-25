import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
    role: 'FACULTY',
  });
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
      setError('Passwords do not match.');
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
        setError('Could not create account.');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-10">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create administrator</h1>
        <p className="text-sm text-slate-500 mb-6">
          {signupOpen
            ? 'This creates the first administrator. Faculty accounts are added later from Users.'
            : 'Public signup is closed. Ask an administrator to create your account.'}
        </p>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)} required />
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
        <input className="w-full border rounded px-3 py-2 mb-4 text-sm" value={form.username}
          onChange={(e) => update('username', e.target.value)} autoComplete="username" required />

        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input type="email" className="w-full border rounded px-3 py-2 mb-4 text-sm" value={form.email}
          onChange={(e) => update('email', e.target.value)} autoComplete="email" required />

        {!signupOpen && (
          <p className="text-sm text-slate-600 mb-4">
            An administrator already exists. Faculty must be added from the Users page.
          </p>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-4 text-sm" value={form.password}
          onChange={(e) => update('password', e.target.value)} autoComplete="new-password" minLength={8} required />

        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-6 text-sm" value={form.confirm}
          onChange={(e) => update('confirm', e.target.value)} autoComplete="new-password" minLength={8} required />

        <button
          type="submit"
          disabled={loading || !signupOpen}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded font-semibold disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-900 font-semibold hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
