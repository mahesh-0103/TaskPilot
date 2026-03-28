import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { Sparkles, Shield, Lock } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading, loginWithGoogle } = useAuthStore();
  const [authLoading, setAuthLoading] = React.useState(false);

  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true });
  }, [session, loading]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060606] px-4 font-sans selection:bg-accent selection:text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] p-10 sm:p-14 rounded-[56px] bg-[#1a1b1e] shadow-[32px_32px_64px_#101113,-32px_-32px_64px_#24252a] border border-white/[0.02] relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 blur-[100px] rounded-full" />
        
        <div className="flex flex-col items-center justify-center gap-5 mb-14">
          <div className="w-20 h-20 rounded-[32px] bg-[#1a1b1e] shadow-[inset_8px_8px_16px_#131416,inset_-8px_-8px_16px_#212226] flex items-center justify-center border border-white/[0.03] group transition-all duration-500 hover:shadow-[8px_8px_16px_#131416,-8px_-8px_16px_#212226] p-4 overflow-hidden">
             <img src={logo} alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="text-center">
            <h1 className="text-[42px] font-headline tracking-tight text-text-primary leading-none italic">TaskPilot</h1>
            <p className="text-[12px] font-mono text-tertiary mt-2.5 uppercase tracking-[0.3em] opacity-40 font-bold font-mono">Workflows_That_Think</p>
          </div>
        </div>

        <div className="space-y-10">
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
        </div>
      </motion.div>
    </div>
  );
}
