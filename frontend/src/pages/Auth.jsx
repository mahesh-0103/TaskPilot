import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Mail, User, Shield, AtSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'workflow'
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  // Workflow Account State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true });
  }, [session, loading]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send',
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(isSignUp ? 'Provisioning Work Profile...' : 'Accessing Secure Workspace...');

    if (isSignUp) {
      if (!email || !username || !password) {
        toast.error('All strategic identifiers are required.', { id: toastId });
        setSubmitting(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nickname || username,
            username: username.toLowerCase(),
          }
        }
      });

      if (error) {
        toast.error(error.message, { id: toastId });
      } else {
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username.toLowerCase().trim(),
            display_name: nickname.trim() || username,
            email: email.trim(),
          });
        }
        if (!data.session) toast.success('Verification link dispatched.', { id: toastId });
        else {
          toast.success('Workspace established.', { id: toastId });
          navigate('/dashboard');
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Credentials rejected. Verification required.' : error.message, { id: toastId });
      } else {
        toast.success('Identity verified.', { id: toastId });
        navigate('/dashboard');
      }
    }
    setSubmitting(false);
  };

  const NeoInput = ({ label, icon: Icon, value, onChange, type = "text", placeholder, showPasswordToggle }) => (
    <div className="space-y-2">
      <label className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-tertiary ml-2 opacity-60 italic">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent transition-all duration-300">
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#1a1b1e] rounded-2xl shadow-[inset_4px_4px_8px_#131416,inset_-4px_-4px_8px_#212226] border border-white/[0.01] px-12 py-4 text-[14.5px] text-text-primary outline-none focus:ring-1 focus:ring-accent/30 transition-all font-ui placeholder:text-text-tertiary/20"
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer active:scale-90 transition-transform"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1b1e] px-4 font-sans selection:bg-accent/40 selection:text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] p-10 sm:p-14 rounded-[56px] bg-[#1a1b1e] shadow-[32px_32px_64px_#101113,-32px_-32px_64px_#24252a] border border-white/[0.02] relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 blur-[100px] rounded-full" />
        
        {/* Branding */}
        <div className="flex flex-col items-center justify-center gap-5 mb-12">
          <div className="w-20 h-20 rounded-[32px] bg-[#1a1b1e] shadow-[inset_8px_8px_16px_#131416,inset_-8px_-8px_16px_#212226] flex items-center justify-center border border-white/[0.03] group transition-all duration-500 hover:shadow-[8px_8px_16px_#131416,-8px_-8px_16px_#212226]">
            <span className="font-mono text-[28px] font-bold text-accent tracking-[2px] transition-transform duration-500 group-hover:scale-110">TP</span>
          </div>
          <div className="text-center">
            <h1 className="text-[42px] font-headline tracking-tight text-text-primary leading-none italic">TaskPilot</h1>
            <p className="text-[12px] font-mono text-tertiary mt-2.5 uppercase tracking-[0.3em] opacity-40 font-bold">Autonomous Architecture</p>
          </div>
        </div>

        {/* Primary Navigation Shell */}
        <div className="flex p-1.5 bg-[#1a1b1e] rounded-[24px] shadow-[inset_3px_3px_6px_#131416,inset_-3px_-3px_6px_#212226] mb-12">
          {[['google', 'Cloud Identity'], ['workflow', 'Work Account']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={clsx(
                "flex-1 py-4 text-[14px] font-bold transition-all duration-500 rounded-[20px] cursor-pointer",
                activeTab === key 
                  ? "bg-[#1a1b1e] shadow-[6px_6px_12px_#111214,-6px_-6px_12px_#232429] text-accent ring-1 ring-white/5" 
                  : "text-text-tertiary hover:text-text-secondary opacity-60 hover:opacity-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'google' ? (
            <motion.div
              key="google"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-10"
            >
              <div className="text-center space-y-4">
                <h2 className="text-[22px] font-semibold text-text-primary tracking-tight italic">Synthesis Ready</h2>
                <p className="text-[15px] text-text-tertiary leading-relaxed px-6 opacity-80">
                  Enable high-bandwidth synchronization with Google for autonomous scheduling and workspace auditing.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="group w-full flex items-center justify-center gap-4 py-5.5 bg-[#1a1b1e] rounded-[28px] shadow-[10px_10px_20px_#121315,-10px_-10px_20px_#222327] hover:shadow-[inset_4px_4px_8px_#131416,inset_-4px_-4px_8px_#212226] transition-all duration-500 text-[16px] font-bold text-text-primary cursor-pointer active:scale-[0.96] border border-white/[0.01]"
              >
                <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center border border-white/5 group-hover:bg-accent/20 transition-all duration-300">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                Connect Workspace Identity
              </button>

              <div className="pt-8 border-t border-white/[0.03] text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[11px] font-mono text-success uppercase tracking-[2px] font-bold">Secure Gateway Active</span>
                </div>
                <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-normal opacity-30 px-10 leading-relaxed">
                  Military-grade encryption for all cross-platform workflow transfers.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="workflow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              onSubmit={handleEmailAuth}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-6">
                <NeoInput label="Protocol Email" icon={Mail} value={email} onChange={setEmail} type="email" placeholder="professional@command.io" />
                
                {isSignUp && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-4 overflow-hidden"
                  >
                    <NeoInput label="User Handle" icon={AtSign} value={username} onChange={setUsername} placeholder="operator" />
                    <NeoInput label="Callsign" icon={User} value={nickname} onChange={setNickname} placeholder="Optional" />
                  </motion.div>
                )}

                <NeoInput label="Secure Key" icon={Shield} value={password} onChange={setPassword} type={showPass ? "text" : "password"} placeholder="••••••••" showPasswordToggle />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center gap-3 py-5.5 bg-[#1a1b1e] rounded-[28px] shadow-[10px_10px_20px_#121315,-10px_-10px_20px_#222327] hover:shadow-[inset_4px_4px_8px_#131416,inset_-4px_-4px_8px_#212226] transition-all duration-500 text-[16px] font-bold text-accent cursor-pointer active:scale-[0.96] border border-white/[0.01] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isSignUp ? 'Initialize Sequence' : 'Establish Connection'}</>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[12px] font-mono text-tertiary hover:text-accent transition-all duration-300 uppercase tracking-widest opacity-60 hover:opacity-100 hover:scale-105"
                >
                  {isSignUp ? 'Already registered?' : 'Need a new profile?'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
