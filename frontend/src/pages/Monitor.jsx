import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Shield, Search, MoreVertical, Terminal, Zap, Layout, Globe, Cpu } from 'lucide-react';
import { Badge, Button, Divider } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';

export default function Monitor() {
  const { user } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [delayed, setDelayed] = useState([]);

  useEffect(() => {
    loadTasks();
    const d = tasks.filter(t => t.status === 'delayed');
    setDelayed(d.length > 0 ? d : tasks.slice(0, 3));
  }, [tasks]);

  const activeTask = tasks[0] || { 
    task_id: '1092-ALPHA', 
    task: 'Heuristic Optimizer', 
    owner: 'System Root',
    status: 'active',
    priority: 'high',
    deadline: '04:12:44'
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
           <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase">System // Monitor</span>
           <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Live Monitoring</h1>
           <div className="flex gap-4 font-mono text-[10px] text-accent tracking-widest uppercase items-center">
              <span>Active_Threads: 14</span>
              <span className="text-text-dim">//</span>
              <span>System_Status: <span className="text-success">Nominal</span></span>
           </div>
        </div>
        <div className="flex bg-white/5 rounded-2xl p-2 items-center gap-4 border border-white/5">
           <div className="px-4 py-2 flex items-center gap-2 group cursor-pointer text-text-tertiary">
              <Search className="w-4 h-4" />
              <span className="text-[11px] font-mono tracking-widest uppercase">Query Task ID...</span>
           </div>
           <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">+</div>
           <div className="italic text-[20px] font-display text-text-tertiary w-8 text-center ring-1 ring-white/5 bg-white/5 rounded-lg">?</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Task Attributes & Visualizers */}
        <section className="lg:col-span-4 space-y-8">
           <div className="glass-sm rounded-[32px] p-8 border-white/5 space-y-8 bg-white/[0.01]">
              <h2 className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">Task Attributes</h2>
              <div className="space-y-4">
                 {[
                   { label: 'Identifier', value: `TP-${activeTask.task_id.slice(0, 8).toUpperCase()}`, color: 'text-accent' },
                   { label: 'Class', value: activeTask.task.slice(0, 20), color: 'text-primary' },
                   { label: 'Memory', value: '128MB / 512MB', color: 'text-text-secondary' },
                   { label: 'Priority', value: activeTask.priority.toUpperCase() + '_PATH', color: activeTask.priority === 'high' ? 'text-danger' : 'text-accent', icon: true },
                   { label: 'Owner', value: activeTask.owner, color: 'text-text-primary italic' },
                   { label: 'Uptime', value: '04:12:44:09', color: 'text-text-secondary' }
                 ].map((attr, i) => (
                   <div key={i} className="flex items-center justify-between py-2 group">
                      <span className="text-[13px] font-ui text-text-tertiary">{attr.label}</span>
                      <div className="flex items-center gap-3">
                         {attr.icon && <div className={`w-2 h-2 rounded-full ${attr.priority === 'high' ? 'bg-danger' : 'bg-accent'} ring-4 ring-current/10`} />}
                         <span className={`text-[13px] font-mono ${attr.color}`}>{attr.value}</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="glass-sm rounded-[32px] overflow-hidden group aspect-square relative border-white/5">
              <img 
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000" 
                alt="Thread Visualizer" 
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-[2000ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 space-y-1">
                 <Badge variant="ghost" className="bg-accent/20 text-accent font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 mb-2">Thread_Visualizer</Badge>
                 <h3 className="text-[28px] font-display italic text-text-primary leading-none">Core Logic Stream</h3>
              </div>
           </div>
        </section>

        {/* Center/Right Col: Delayed Queue & Healing Nodes */}
        <section className="lg:col-span-8 space-y-8">
           <div className="glass-sm rounded-[32px] p-8 border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                 <h2 className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">Delayed Task Queue</h2>
                 <span className="font-mono text-[10px] text-danger tracking-widest uppercase">3_FLAGS_PENDING</span>
              </div>
              <div className="space-y-6">
                 {delayed.map((t, i) => (
                   <div key={t.task_id} className="group flex items-center justify-between p-4 px-6 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                      <div className="flex items-center gap-8">
                         <span className="font-mono text-[12px] text-danger">TP-{t.task_id.slice(0,3).toUpperCase()}</span>
                         <span className="text-[17px] font-ui text-text-primary font-medium">{t.task}</span>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-danger/60 rounded-full" />
                         </div>
                         <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest">{Math.floor(Math.random() * 800) + 200}ms</span>
                         <span className="font-mono text-[10px] text-danger uppercase tracking-widest tabular-nums">TIMEOUT_RETRY</span>
                         <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-sm rounded-[32px] p-8 border-white/5 space-y-6 relative overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <span className="font-mono text-[10px] text-accent tracking-[0.2em] uppercase font-semibold">HEALING_PROTOCOLS</span>
                    <p className="text-[18px] text-text-secondary font-ui leading-relaxed">
                       3 active threads are currently undergoing self-correction. Predicted resolution time is under 400ms across all clusters.
                    </p>
                    <button className="font-mono text-[11px] text-text-tertiary uppercase tracking-widest border-b border-text-tertiary hover:text-text-primary hover:border-text-primary transition-all">View_Logs_All</button>
                 </div>
              </div>

              <div className="glass-sm rounded-[32px] h-[300px] border-white/5 relative overflow-hidden group">
                 <img 
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000" 
                    alt="Density Map" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
                 <div className="absolute bottom-8 left-8">
                    <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest mb-1 block">Node Density Map</span>
                    <h3 className="text-[28px] font-display italic text-text-primary leading-none">Satellite Hub Alpha</h3>
                 </div>
                 {/* Decorative Pulse */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-accent rounded-full animate-ping" />
                    <div className="w-4 h-4 bg-accent rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                 </div>
              </div>
           </div>
        </section>
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-[#060606]/90 backdrop-blur-3xl">
             <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
