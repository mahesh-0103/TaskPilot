import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Activity, Clock, Shield, Terminal, 
  ChevronRight, ArrowUpRight, Plus, Search,
  Filter, MoreHorizontal, Layout
} from 'lucide-react';
import { Badge, Button, Divider } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadTasks();
    // Load recent activity logs from Supabase
    supabase.from('logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(6)
      .then(({ data }) => setLogs(data || []));
  }, []);

  const stats = [
    { label: 'TOTAL EXECUTIONS', value: '1,284', trend: '+12%', color: 'text-primary' },
    { label: 'PENDING', value: tasks.filter(t => t.status === 'pending').length, color: 'text-accent' },
    { label: 'DELAYED', value: tasks.filter(t => t.status === 'delayed').length, color: 'text-danger' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10 pb-20 max-w-[1400px] mx-auto"
    >
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-accent tracking-[0.2em] uppercase">System // Status:</span>
          <Badge variant="success" className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5">Active</Badge>
        </div>
        <div className="flex items-center gap-6 text-text-tertiary">
           <div className="flex items-center gap-2 group cursor-pointer">
              <Search className="w-4 h-4 group-hover:text-text-primary transition-colors" />
              <span className="text-[11px] font-mono tracking-widest hidden sm:inline">SEARCH COMMANDS...</span>
           </div>
           <Layout className="w-4 h-4 cursor-pointer hover:text-text-primary transition-colors" />
        </div>
      </div>

      {/* Greeting & Telemetry */}
      <header className="space-y-4">
        <h1 className="text-[64px] leading-none font-display italic text-text-primary tracking-tight">
          Good morning, {user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.username || 'Executive'}.
        </h1>
        <div className="flex items-center gap-6 font-mono text-[11px] text-text-tertiary tracking-wider uppercase">
          <span>LATENCY: <span className="text-success">12ms</span></span>
          <span>//</span>
          <span>DISTRIBUTED NODES: <span className="text-accent">04</span></span>
          <span>//</span>
          <span>UPTIME: <span className="text-text-secondary">99.9%</span></span>
        </div>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-sm p-8 rounded-[24px] border-white/5 space-y-6 hover:bg-white/[0.04] transition-all">
            <p className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">{stat.label}</p>
            <div className="flex items-baseline gap-4">
              <span className={`text-[64px] font-display leading-none ${stat.color}`}>{stat.value}</span>
              {stat.trend && <span className="text-success text-[14px] font-mono">{stat.trend}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Operational Queue */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-mono text-[13px] tracking-[0.2em] uppercase text-text-secondary font-semibold">Operational Queue</h2>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest hover:text-text-primary">
                <Filter className="w-3 h-3 mr-2" /> Filter
              </Button>
              <Button variant="ghost" size="sm" className="text-text-tertiary hover:text-text-primary">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="glass-sm rounded-[32px] overflow-hidden border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-6 text-[11px] font-mono text-text-tertiary uppercase tracking-widest font-medium">Task Identifier</th>
                  <th className="px-8 py-6 text-[11px] font-mono text-text-tertiary uppercase tracking-widest text-right font-medium">Owner</th>
                  <th className="px-8 py-6 text-[11px] font-mono text-text-tertiary uppercase tracking-widest text-right font-medium">Deadline</th>
                  <th className="px-8 py-6 text-[11px] font-mono text-text-tertiary uppercase tracking-widest text-right font-medium">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-24 text-center text-text-tertiary font-ui italic text-[15px]">No active directives in queue.</td>
                  </tr>
                ) : tasks.slice(0, 5).map((t) => (
                  <tr 
                    key={t.task_id} 
                    onClick={() => setSelectedTask(t)}
                    className="group hover:bg-white/[0.02] cursor-pointer transition-all duration-300"
                  >
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-5">
                        <div className={`w-1 h-8 rounded-full transition-shadow duration-500 ${
                          t.status === 'delayed' ? 'bg-danger shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'bg-accent shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                        }`} />
                        <div>
                          <p className="font-mono text-[14px] text-text-primary group-hover:text-accent transition-colors">TP-{t.task_id.slice(0,3).toUpperCase()}: {t.task}</p>
                          <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest mt-1">Status: {t.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-mono text-accent uppercase">
                          {t.owner.charAt(0)}
                        </div>
                        <span className="text-[14px] font-ui text-text-secondary">{t.owner}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                       <span className="font-mono text-[12px] text-text-tertiary uppercase">{t.deadline}</span>
                    </td>
                    <td className="px-8 py-7 text-right">
                      <Badge variant={t.priority} className="font-mono text-[10px] uppercase tracking-widest px-3">{t.priority}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Activity Feed */}
        <section className="lg:col-span-4 space-y-6">
          <h2 className="font-mono text-[13px] tracking-[0.2em] uppercase text-text-secondary font-semibold px-2">System Activity Feed</h2>
          <div className="glass-sm p-8 rounded-[32px] border-white/5 space-y-8 h-full min-h-[400px]">
            {logs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-30 italic text-[14px]">
                 No system logs recorded.
               </div>
            ) : logs.map((log) => (
              <div key={log.log_id} className="flex gap-5 items-start relative group">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent ring-4 ring-accent/10 mt-1.5" />
                  <div className="w-px h-full bg-white/5 absolute top-4 group-last:hidden" />
                </div>
                <div className="space-y-1 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[12px] text-accent">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <span className="text-[12px] text-text-primary font-semibold uppercase tracking-wider">{log.action}</span>
                  </div>
                  <p className="text-[13px] text-text-tertiary font-ui leading-relaxed">{log.reason}</p>
                  {log.decision_trace && <p className="font-mono text-[9px] text-text-dim uppercase tracking-[0.2em] pt-1">HASH: {log.decision_trace.slice(0, 12)}</p>}
                </div>
              </div>
            ))}

            <div className="flex gap-5 items-start opacity-40">
               <div className="w-2 h-2 rounded-full bg-text-tertiary mt-1.5" />
               <div className="space-y-1">
                  <span className="font-mono text-[12px]">09:15</span>
                  <p className="text-[13px] font-ui">System: automated daily cleanup of cache-nodes.</p>
               </div>
            </div>
          </div>
        </section>
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>

      {/* Floating Plus */}
      <Button 
        variant="accent" 
        className="fixed bottom-10 right-10 w-16 h-16 rounded-[20px] shadow-[0_20px_50px_rgba(37,99,235,0.3)] !p-0 z-50 flex items-center justify-center"
      >
        <Plus className="w-8 h-8" />
      </Button>
    </motion.div>
  );
}
