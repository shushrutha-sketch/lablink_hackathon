import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import {
  FlaskConical,
  GraduationCap,
  Building,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { demoUsers, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (user: any) => {
    setError(null);
    setLoading(true);
    try {
      await login(user.email, 'password123');
      if (user.role === 'student') navigate('/discover');
      else if (user.role === 'faculty') navigate('/review');
      else if (user.role === 'admin') navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/30 mb-4">
          <FlaskConical className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
          Lab<span className="text-brand-600">Link</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          AI-Powered Campus Laboratory Resource-Sharing Platform with Explainable Fair-Share Allocation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl space-y-8">
        {/* Hackathon 1-Click Persona Picker */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Select a Demo Persona (1-Click Login)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-configured personas to test discovery, scheduling conflicts, and faculty approvals.
              </p>
            </div>
            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              Hackathon Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {demoUsers.map(u => {
              const roleMeta =
                u.role === 'admin'
                  ? {
                      icon: ShieldCheck,
                      color: 'text-rose-600',
                      bg: 'bg-rose-50',
                      badge: 'Admin',
                      desc: 'Full campus oversight, utilisation flags, equipment control.',
                    }
                  : u.role === 'faculty'
                  ? {
                      icon: Building,
                      color: 'text-indigo-600',
                      bg: 'bg-indigo-50',
                      badge: 'Faculty',
                      desc: `Department review queue for ${u.department_code || 'Lab'}.`,
                    }
                  : {
                      icon: GraduationCap,
                      color: 'text-emerald-600',
                      bg: 'bg-emerald-50',
                      badge: 'Student',
                      desc:
                        u.email === 'maya@campus.edu'
                          ? 'Urgent thesis deadline (competitor for H100).'
                          : u.email === 'alex@campus.edu'
                          ? 'High prior hours (competing for H100).'
                          : 'Zero past hours (highest fairness score).',
                    };

              const Icon = roleMeta.icon;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleDemoSelect(u)}
                  disabled={loading}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all group bg-white flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${roleMeta.bg}`}>
                        <Icon className={`w-4 h-4 ${roleMeta.color}`} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {roleMeta.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">
                        {u.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{u.email}</p>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{roleMeta.desc}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Sign in as {u.name.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Login Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Or sign in with email credentials</h3>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alex@campus.edu"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: password123</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
