import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Bell, Shield, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Badge, EmptyState, Button } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function Notifications() {
  const { user } = useAuthStore();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user
  });

  const clearAll = async () => {
    toast.success('Communication buffer cleared.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 space-y-12"
    >
      <header className="flex items-center justify-between flex-wrap gap-8">
        <div className="space-y-2">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Comms // Alerts</span>
          <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Signal Stream</h1>
          <div className="flex gap-4 font-mono text-[10px] text-text-tertiary tracking-widest uppercase items-center">
            <span>Buffer Status: <span className="text-success font-bold">Encrypted</span></span>
            <span>//</span>
            <span>Signals: <span className="text-accent font-bold">{notifications.length}</span></span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-11 px-6 rounded-xl bg-white/5 border border-white/5 font-mono text-[11px] uppercase tracking-widest hover:text-danger">
          <Trash2 className="w-4 h-4 mr-2" /> Clear Buffer
        </Button>
      </header>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((n, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={n.id}
              className="glass-sm p-6 rounded-[28px] border-white/5 flex items-start gap-6 group hover:bg-white/[0.02] transition-colors"
            >
              <div className={clsx(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                n.status === 'error' ? 'bg-danger/10 text-danger' : 
                n.status === 'success' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
              )}>
                {n.status === 'error' ? <AlertCircle className="w-5 h-5" /> : 
                 n.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 space-y-1">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-medium text-text-primary group-hover:text-accent transition-colors">{n.action}</h3>
                    <span className="text-[11px] font-mono text-text-tertiary uppercase tabular-nums">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
                 <p className="text-[14px] text-text-tertiary leading-relaxed max-w-2xl">{n.details || 'System message received.'}</p>
                 <div className="pt-2 flex gap-3">
                    <Badge variant="ghost" className="bg-white/5 font-mono text-[9px] uppercase">{n.module || 'CORE'}</Badge>
                    <Badge variant="ghost" className="bg-white/5 font-mono text-[9px] uppercase">{n.status || 'INFO'}</Badge>
                 </div>
              </div>
            </motion.div>
          ))
        ) : (
          <EmptyState
            icon={Shield}
            title="Secure Frequency"
            description="No pending alerts. All system protocols are nominal."
          />
        )}
      </div>

      {notifications.length > 0 && (
         <p className="text-center font-mono text-[11px] text-text-dim pt-8 tracking-[0.2em] uppercase italic">
            End of Buffer Transmission
         </p>
      )}
    </motion.div>
  );
}
