import axios from 'axios';
import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { api } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setSession = useSessionStore(s => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = response.data.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      setSession(token, payload.sub, payload.role, payload.tenant_id);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Login failed');
      } else {
        setError('Login failed');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4 pb-12">
      <div className="flex flex-col items-center mb-6">
        <div className="h-16 w-auto p-2 bg-surface rounded-2xl border border-border/80 shadow-xs mb-3 flex items-center justify-center">
          <img src="/mccia-logo.svg" alt="MCCIA" className="h-full w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-primary">MCCIA DispatchFlow</h1>
        <p className="text-xs text-muted mt-0.5">MSME Document Automation & OCR Portal</p>
      </div>

      <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="mb-5 pb-3 border-b border-border">
          <h2 className="text-lg font-heading font-bold text-text">Sign In</h2>
          <p className="text-xs text-muted mt-0.5">Access your enterprise workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="text-danger text-sm bg-danger/10 p-3 rounded-xl border border-danger/20">{error}</div>}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted font-body">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="operator@company.com"
              className="px-3.5 py-2.5 border rounded-xl border-border bg-bg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all" 
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted font-body">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="px-3.5 py-2.5 border rounded-xl border-border bg-bg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all" 
              required
            />
          </div>
          <button type="submit" className="mt-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover shadow-md hover:shadow-lg transition-all text-sm">
            Sign In to DispatchFlow
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-muted tracking-widest">OR</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Set mock JWT and admin session
              const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vQG1jY2lhLmluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoxLCJleHAiOjE5OTk5OTk5OTl9.demo';
              setSession(demoToken, 'demo@mccia.in', 'admin', 1);
            }}
            className="bg-accent text-white py-2.5 rounded-xl font-bold hover:bg-accent-hover shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>🚀</span> Instant Demo Mode Sign In
          </button>
        </form>
      </div>
      
      <div className="mt-5 text-center text-xs text-muted bg-surface/80 border border-border p-3 rounded-xl">
        Sample Demo Login: <span className="font-mono text-text font-semibold">demo@mccia.in</span> / <span className="font-mono text-text font-semibold">password123</span>
      </div>
    </div>
  );
}
