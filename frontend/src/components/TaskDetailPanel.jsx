import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Calendar, Shield, Zap, Terminal, 
  Trash2, CheckCircle, AlertTriangle, ExternalLink,
  Cpu, Share2, Archive
} from 'lucide-react';
import { Badge, Button, Divider } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function TaskDetailPanel({ task, onClose }) {
  const { user, providerToken } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCalendar = async () => {
    if (!providerToken) {
       toast.error('Google Auth Required for Sync');
       return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${providerToken}`
        },
        body: JSON.stringify({
          task_id: task.task_id,
          user_id: user.id,
          summary: task.task,
          description: `Strategic objective: ${task.task}`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        })
      });
      if (!response.ok) throw new Error('Sync failed');
      toast.success('Objective Synchronized to Google Calendar');
    } catch (e) {
      toast.error('Calendar Sync Failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-[440px] bg-[#0A0A0A] border-l border-white/5 z-50 p-10 overflow-y-auto shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <span className="font-mono text-[11px] text-accent tracking-[0.2em] uppercase">TP-{task.task_id.slice(0,3).toUpperCase()} // Detail</span>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-text-tertiary hover:text-text-primary transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Task Heading */}
      <section className="space-y-6 mb-12">
        <h2 className="text-[44px] leading-tight font-display italic text-text-primary tracking-tight">{task.task}</h2>
        <p className="text-[17px] text-text-secondary font-ui leading-relaxed">
           Refining vector clusters for high-speed retrieval of encrypted task nodes. High computational load expected on Node-04.
        </p>
      </section>

      {/* Attributes */}
      <div className="space-y-10">
        <div className="space-y-4">
           <span className="font-mono text-[10px] text-text-tertiary tracking-[0.2em] uppercase">Assigned Resources</span>
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent text-[10px] flex items-center justify-center font-mono">AK</div>
              <div className="w-8 h-8 rounded-full bg-warning text-[10px] flex items-center justify-center font-mono">ML</div>
              <div className="w-8 h-8 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-mono">+2</div>
           </div>
        </div>

        <div className="space-y-4">
           <span className="font-mono text-[10px] text-text-tertiary tracking-[0.2em] uppercase">Execution Map</span>
           <div className="glass-sm h-[300px] rounded-[32px] overflow-hidden relative border-white/10">
              <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1000" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale brightness-50" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full animate-ping" />
           </div>
        </div>

        {/* Console Log Log Overlay */}
        <div className="glass-sm p-6 rounded-2xl border-white/5 bg-white/[0.01]">
           <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest mb-3">System Log 402-A</p>
           <p className="font-mono text-[11px] text-accent leading-relaxed">Initializing sandbox environment...<br/>Awaiting handshake ...</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-14 space-y-4">
        <Button 
          variant="accent" 
          onClick={handleSyncToCalendar}
          disabled={isSyncing}
          className="w-full h-16 rounded-xl font-mono text-[11px] uppercase tracking-widest shadow-xl shadow-accent/20"
        >
          {isSyncing ? <span className="animate-pulse">Syncing...</span> : 'Execute Sub-Routine (Sync)'}
        </Button>
        <Button 
          variant="ghost" 
          className="w-full h-16 rounded-xl font-mono text-[11px] uppercase tracking-widest border border-white/5 hover:bg-white/5"
        >
          <Archive className="w-4 h-4 mr-2" /> Archive Task
        </Button>
      </div>
    </motion.div>
  );
}
