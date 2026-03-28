import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Shield, Activity, RefreshCw, AlertTriangle, 
  ChevronRight, ArrowRight, Cpu, Network, History,
  Filter, MoreVertical, Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Button, Divider } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import { apiRequest } from '../lib/api';
import toast from 'react-hot-toast';

export default function SelfHeal() {
  const { user } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const [isHealing, setIsHealing] = useState(false);
  const [delayed, setDelayed] = useState([]);

  useEffect(() => {
    if (user?.id) loadTasks(user.id);
  }, [user]);

  useEffect(() => {
    setDelayed((tasks || []).filter(t => t.status === 'delayed').slice(0, 3));
  }, [tasks]);

  const handleSelfHeal = async () => {
    setIsHealing(true);
    try {
      // Backend /self-heal applies rules to delayed tasks
      const res = await apiRequest('/self-heal', { tasks });
      if (res.healed_tasks?.length > 0) {
        toast.success(`${res.healed_tasks.length} temporal anomalies corrected.`);
        loadTasks();
      } else {
        toast.success('System is already at peak alignment.');
      }
    } catch (e) {
      toast.error('Phase Shift Failed: ' + e.message);
    } finally {
      setIsHealing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="space-y-4">
           <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase">TaskPilot // Self-Heal</span>
           <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Self-Heal Engine</h1>
           <p className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">Autonomous bottleneck resolution & recovery</p>
        </div>
        <div className="flex bg-white/5 rounded-2xl p-2 items-center gap-4 border border-white/5 shadow-inner">
           <div className="px-4 py-2 flex items-center gap-2 group cursor-pointer text-text-tertiary">
              <Network className="w-4 h-4" />
              <span className="text-[11px] font-mono tracking-widest uppercase">Search Healing Logs...</span>
           </div>
           <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">+</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Core Engine Controls */}
        <section className="lg:col-span-8 space-y-12">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-sm p-10 rounded-[40px] border-white/5 space-y-6 bg-white/[0.01] hover:bg-white/[0.03] transition-colors relative group overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <h3 className="text-[28px] font-display italic text-accent tracking-tight">01 // Path Optimization</h3>
                    <p className="text-[16px] text-text-secondary font-ui leading-relaxed">
                       Analyzes failed task nodes and re-routes logic through secondary high-availability workflows. Identifies recursive loops and applies forced-break parameters automatically.
                    </p>
                 </div>
                 <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-40 h-40" />
                 </div>
              </div>

              <div className="glass-sm p-10 rounded-[40px] border-white/5 space-y-6 bg-white/[0.01] hover:bg-white/[0.03] transition-colors relative group overflow-hidden border-l-4 border-l-accent">
                 <div className="relative z-10 space-y-6">
                    <h3 className="text-[28px] font-display italic text-accent tracking-tight">02 // Resource Reclamation</h3>
                    <p className="text-[16px] text-text-secondary font-ui leading-relaxed">
                       Aggressively terminates orphaned processes from delayed tasks, reallocating compute tokens to high-priority threads without manual intervention.
                    </p>
                 </div>
                 <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity">
                    <Cpu className="w-40 h-40" />
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">Delayed Tasks Waiting for Patch</h2>
                 <span className="font-mono text-[10px] text-accent tracking-widest uppercase">{delayed.length} items detected</span>
              </div>
              
              <div className="space-y-4">
                 {delayed.length === 0 ? (
                    <div className="glass-sm p-12 text-center italic text-text-tertiary font-ui rounded-[32px] border-white/5">
                       No critical path failures detected. System nominal.
                    </div>
                 ) : delayed.map((t, i) => (
                    <div key={t.task_id} className="glass-sm px-10 py-8 rounded-[32px] border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group flex items-center justify-between">
                       <div className="space-y-2">
                          <p className="font-mono text-[13px] text-text-primary">TP-{t.task_id.slice(0,3).toUpperCase()}: <span className="text-white font-medium">{t.task}</span></p>
                       </div>
                       <div className="text-right">
                          <p className="font-mono text-[10px] text-accent uppercase tracking-widest group-hover:text-white transition-colors">Proposed Fix</p>
                          <p className="font-mono text-[12px] text-text-tertiary">{i % 2 === 0 ? 'Flush buffer & restart worker' : 'Switch to Backup-B endpoint'}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="pt-8 flex flex-col items-center">
              <Button 
                onClick={handleSelfHeal}
                disabled={isHealing || delayed.length === 0}
                variant="outline" 
                className={clsx(
                  "w-full h-24 rounded-[32px] font-mono text-[14px] uppercase tracking-[0.5em] transition-all duration-500",
                  "border-accent/40 text-accent hover:bg-accent/10 hover:border-accent",
                  isHealing && "bg-accent/20 border-accent animate-pulse"
                )}
              >
                {isHealing ? 'Healing Pulse Initiated...' : 'Initiate Self-Heal Protocol'}
              </Button>
           </div>
        </section>

        {/* Heal Parameters Sidebar */}
        <aside className="lg:col-span-4 space-y-10">
           <section className="glass-sm p-10 rounded-[40px] border-white/5 space-y-12 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-2">
                 <span className="font-mono text-[10px] text-text-tertiary tracking-[0.4em] uppercase">Heal Parameters</span>
                 <button className="text-text-tertiary">×</button>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                 <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">Auto-recovery threshold</span>
                    <Badge variant="ghost" className="text-[10px] text-text-dim uppercase tracking-widest">Adjustable</Badge>
                 </div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-[32px] font-display italic text-text-primary">850ms</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">Snapshot frequency</span>
                    <Badge variant="success" className="text-[9px] uppercase tracking-widest">Real-Time</Badge>
                 </div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-[32px] font-display italic text-text-primary">60 SEC</span>
                 </div>
              </div>

              <div className="h-[250px] glass-sm rounded-[32px] border-white/10 relative overflow-hidden group">
                 <img 
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000" 
                    alt="System Topology" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 transition-transform duration-[2000ms] group-hover:scale-110"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
                 <div className="absolute bottom-8 left-8">
                    <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest mb-1 block">Latest System Topology Map (TP-MAP-V4)</span>
                 </div>
              </div>
           </section>

           <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'EFFICIENCY DELTA', value: '98.4%', sub: '+6.4% recovered', color: 'text-success' },
                { label: 'MEAN REPAIR TIME', value: '2.1s', sub: '-99.8% Latency', color: 'text-accent' },
                { label: 'FAILURE RECURRENCE', value: '0.02%', sub: 'STABLE STATE', color: 'text-text-secondary' },
              ].map((stat, i) => (
                <div key={i} className="space-y-2">
                   <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest">{stat.label}</p>
                   <p className={`text-[18px] font-display italic ${stat.color} leading-none`}>{stat.value}</p>
                   <p className="text-[8px] font-mono uppercase tracking-tighter opacity-40">{stat.sub}</p>
                </div>
              ))}
           </div>
        </aside>
      </div>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-10 right-10 w-16 h-16 bg-accent rounded-[20px] shadow-[0_20px_60px_rgba(37,99,235,0.3)] flex items-center justify-center text-white ring-8 ring-accent/10 z-50"
      >
        <Plus className="w-8 h-8" />
      </motion.button>
    </motion.div>
  );
}
