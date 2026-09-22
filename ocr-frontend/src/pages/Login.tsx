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

  const [isRegister, setIsRegister] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (isRegister) {
        if (!orgName.trim()) {
          setError('Organization name is required');
          setLoading(false);
          return;
        }
        await api.post('/auth/register', {
          name: orgName.trim(),
          admin_email: email.trim(),
          admin_password: password
        });
        setSuccessMsg('Account created successfully! Signing in...');
      }

      const formData = new FormData();
      formData.append('username', email.trim());
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

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-primary/10 via-accent/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative px-6 py-4 bg-gradient-to-b from-white to-slate-50/90 rounded-3xl border border-primary/20 shadow-xl mb-4 flex items-center justify-center glow-primary group hover:scale-105 transition-transform duration-300">
          <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-md" />
          <img src="/mccia-logo-transparent.png" alt="MCCIA" className="h-12 sm:h-14 w-auto object-contain relative z-10" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-bold text-primary tracking-wide uppercase">Enterprise OCR v2.0</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black text-text tracking-tight bg-gradient-to-r from-slate-900 via-primary to-slate-800 bg-clip-text text-transparent">
          MCCIA DispatchFlow
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1.5 max-w-md font-medium leading-relaxed">
          Autonomous Multilingual Vision OCR, Gate Pass & GST Invoicing Portal for MSMEs
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md glass-card rounded-3xl border border-white/80 p-7 sm:p-9 shadow-2xl relative">
        <div className="mb-6 pb-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-text tracking-tight">
              {isRegister ? 'Create Organization Account' : 'Operator Portal Login'}
            </h2>
            <p className="text-xs text-muted mt-0.5 font-medium">
              {isRegister ? 'Register your enterprise in 30 seconds' : 'Sign in to access your digitisation workspace'}
            </p>
          </div>
          <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase tracking-wider">
            Secured
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="text-xs font-semibold text-danger bg-danger/10 p-3.5 rounded-2xl border border-danger/20 flex items-start gap-2.5 animate-shake">
              <span className="text-sm">⚠</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs font-semibold text-accent bg-accent/10 p-3.5 rounded-2xl border border-accent/20 flex items-center gap-2">
              <span className="text-sm">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted font-body">
                Organization / Company Name
              </label>
              <input 
                type="text" 
                value={orgName} 
                onChange={e => setOrgName(e.target.value)} 
                placeholder="e.g. Mahratta Auto Precision Ltd"
                className="px-4 py-3 rounded-xl border border-border/80 bg-surface text-text focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm transition-all shadow-2xs placeholder:text-muted/40 font-medium" 
                required
              />
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
              className="px-4 py-3 rounded-xl border border-border/80 bg-surface text-text focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm transition-all shadow-2xs placeholder:text-muted/40 font-medium" 
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted font-body">
                Password
              </label>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="px-4 py-3 rounded-xl border border-border/80 bg-surface text-text focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm transition-all shadow-2xs placeholder:text-muted/40 font-medium" 
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="mt-2 w-full font-bold shadow-lg glow-primary rounded-xl text-sm"
          >
            {isRegister ? 'Register & Launch Workspace' : 'Sign In to Workspace'}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-primary hover:text-primary-hover font-bold transition-colors inline-flex items-center gap-1 py-1"
            >
              <span>{isRegister ? 'Already registered?' : 'New to DispatchFlow?'}</span>
              <span className="underline">{isRegister ? 'Sign in to account' : 'Create new organization account'}</span>
            </button>
          </div>
        </form>
      </div>
      
      {/* Footer Branding */}
      <div className="mt-8 text-center text-xs text-muted max-w-sm flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <span>MCCIA Center of Excellence for MSME Digital Modernisation</span>
      </div>
    </div>
  );
}

