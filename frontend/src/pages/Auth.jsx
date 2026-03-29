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
        className="w-full max-w-[460px] p-10 sm:p-14 rounded-[56px] bg-[#1a1b1e] shadow-[20px_20px_60px_#101113,-20px_-20px_60px_#24252a] border border-white/[0.05] relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 blur-[100px] rounded-full" />
        
        <div className="flex flex-col items-center justify-center gap-6 mb-16">
          <div className="w-24 h-24 rounded-[36px] bg-gradient-to-br from-accent to-[#1a1b1e] shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(255,255,255,0.02)] flex items-center justify-center p-5 overflow-hidden group transition-all duration-500 hover:scale-[1.05] relative z-10">
             <div className="absolute inset-0 bg-accent transition-opacity opacity-0 group-hover:opacity-20" />
             <img src={logo} alt="Logo" className="w-full h-full object-contain relative z-20 brightness-110 drop-shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          </div>
          <div className="text-center">
            <h1 className="text-[48px] font-display italic text-text-primary leading-tight tracking-tighter">TaskPilot</h1>
            <p className="text-[11px] font-mono text-text-secondary mt-3 uppercase tracking-[0.4em] font-bold">Workflows That Think</p>
          </div>
        </div>

        <div className="space-y-12">
          <div className="text-center space-y-5">
            <h2 className="text-[24px] font-display text-text-primary italic tracking-tight">Synthesis Ready</h2>
            <p className="text-[16px] text-text-secondary leading-relaxed px-4 opacity-100 font-medium">
              Connect your Google account to unlock autonomous scheduling, monitoring, and self-healing systems.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="group w-full flex items-center justify-center gap-5 py-6 bg-[#1a1b1e] rounded-[32px] shadow-[12px_12px_24px_#111214,-12px_-12px_24px_#232428] hover:shadow-[inset_6px_6px_12px_#111214,inset_-6px_-6px_12px_#232428] transition-all duration-500 text-[17px] font-bold text-text-primary cursor-pointer active:scale-[0.97] border border-white/[0.03]"
          >
            <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center border border-white/10 group-hover:bg-accent/40 transition-all duration-300 shadow-inner">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            Connect Workspace Identity
          </button>

          <div className="pt-10 border-t border-white/[0.05] text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[12px] font-mono text-success uppercase tracking-[3px] font-bold">Secure Gateway Active</span>
            </div>
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-widest opacity-60 px-8 leading-relaxed">
              Proprietary encryption for all cross-platform node telemetry.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
