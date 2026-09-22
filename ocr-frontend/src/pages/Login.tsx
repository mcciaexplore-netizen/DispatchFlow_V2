import axios from 'axios';
import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useSessionStore(s => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
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
        setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
      } else {
        setError('Authentication failed. Backend service unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vQG1jY2lhLmluIiwicm9sZSI6ImFkbWluIiwidGVuYW50X2lkIjoxLCJleHAiOjE5OTk5OTk5OTl9.demo';
    setSession(demoToken, 'demo@mccia.in', 'admin', 1);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="h-20 w-20 p-3.5 bg-gradient-to-br from-white to-primary/5 rounded-3xl border border-primary/20 shadow-md mb-4 flex items-center justify-center glow-primary">
          <img src="/mccia-logo.svg" alt="MCCIA" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-3xl font-heading font-black text-text tracking-tight">
          MCCIA DispatchFlow
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 max-w-sm">
          Autonomous OCR, Gate Pass & GST Invoice Platform for MSMEs
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md glass-card rounded-3xl border border-border/80 p-6 sm:p-8 shadow-xl">
        <div className="mb-6 pb-4 border-b border-border/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-extrabold text-text">Operator Login</h2>
            <p className="text-xs text-muted mt-0.5">Enter credentials to authenticate session</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
            Secured
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="text-xs font-semibold text-danger bg-danger/10 p-3.5 rounded-2xl border border-danger/20 flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted font-body">
              Operator Email
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="operator@company.com"
              className="px-4 py-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all shadow-2xs placeholder:text-muted/40" 
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted font-body">
              Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="px-4 py-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all shadow-2xs placeholder:text-muted/40" 
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="mt-2 w-full font-bold shadow-md rounded-xl"
          >
            Sign In to Workspace
          </Button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-muted tracking-widest">
              Instant Access
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <Button
            type="button"
            variant="accent"
            size="md"
            onClick={handleDemoSignIn}
            className="w-full font-bold shadow-sm rounded-xl"
          >
            <span>🚀</span> Instant Demo Mode Access
          </Button>
        </form>
      </div>
      
      <div className="mt-6 text-center text-xs text-muted max-w-xs flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span>MCCIA Smart Manufacturing & Digital Transformation Initiative</span>
      </div>
    </div>
  );
}

