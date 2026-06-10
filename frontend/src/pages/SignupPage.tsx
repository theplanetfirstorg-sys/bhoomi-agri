import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useAuthStore } from '../hooks/useAuth';
import { User } from '../types';

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/signup', form
      );
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/farms');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const perks = [
    '14-day free trial, no credit card required',
    'AI advisor with full farm context',
    'Disease & pest diagnosis from photos',
    'Sri Lanka market price intelligence',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-leaf-50 via-white to-earth-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-leaf-600 shadow-lg mb-3">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start farming smarter</h1>
          <p className="text-gray-500 text-sm mt-1">Free 14-day trial · No credit card</p>
        </div>

        {/* Perks */}
        <div className="mb-5 space-y-1.5">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-leaf-500 flex-shrink-0" />
              {p}
            </div>
          ))}
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" placeholder="Sunil Perera" value={form.name} onChange={update('name')} required />
            </div>
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="sunil@example.com" value={form.email} onChange={update('email')} required />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input type="tel" className="input" placeholder="+94 77 123 4567" value={form.phone} onChange={update('phone')} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={update('password')} required minLength={8} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Start free trial'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-leaf-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
