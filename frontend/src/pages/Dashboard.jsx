import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Activity, Clock, Shield, Terminal, 
  ChevronRight, ArrowUpRight, Plus, Search,
  Filter, MoreHorizontal, Layout, BarChart, LineChart
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer 
} from 'recharts';
import { Badge, Button, Divider } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import useModalStore from '../store/modalStore';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';

export default function Dashboard() {
  const { user, profile } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const { openQuickAdd } = useModalStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (user?.id) loadTasks(user.id);
    supabase.from('logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(6)
      .then(({ data }) => setLogs(data || []));
  }, [user]);

  const stats = [
    { label: 'TOTAL DIRECTIVES', value: tasks.length, trend: tasks.length > 0 ? '+100%' : '0%', color: 'text-primary' },
    { label: 'PENDING', value: tasks.filter(t => t.status === 'pending').length, color: 'text-accent' },
    { label: 'DELAYED', value: tasks.filter(t => t.status === 'delayed').length, color: 'text-danger' }
  ];

  const chartData = useMemo(() => [
    { name: '08:00', value: 4 },
    { name: '10:00', value: 7 },
    { name: '12:00', value: 12 },
    { name: '14:00', value: 9 },
    { name: '16:00', value: 15 },
    { name: '18:00', value: 18 },
    { name: '20:00', value: 22 },
  ], []);

  const [telemetry, setTelemetry] = useState({ latency: 12, nodes: 4, uptime: 99.9 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => ({
        latency: Math.max(8, Math.min(24, prev.latency + (Math.random() - 0.5) * 4)).toFixed(0),
        nodes: Math.max(3, Math.min(6, prev.nodes + (Math.random() > 0.8 ? 1 : Math.random() < 0.2 ? -1 : 0))),
        uptime: (99.9 + (Math.random() * 0.09)).toFixed(1)
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const actualSelectedTask = useMemo(() => 
    selectedTask ? tasks.find(t => t.task_id === selectedTask.task_id) : null,
    [tasks, selectedTask]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12 pb-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-accent tracking-[0.4em] uppercase font-bold">Workspace // Status:</span>
          <Badge variant="ghost" className="font-mono text-[11px] uppercase tracking-widest bg-accent/10 text-accent border-accent/20 px-4 py-2">System Epoch: v1.0.4</Badge>
        </div>
        <div className="flex items-center gap-4 text-text-tertiary">
           <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">System Node: {user?.id?.slice(0,8)}</span>
        </div>
      </div>

      <header className="space-y-6">
        <h1 className="text-[72px] leading-tight font-display italic text-text-primary tracking-tighter">
          Welcome, {profile?.display_name?.split(' ')[0] || 'Pilot'}.
        </h1>
        <div className="flex items-center gap-10 font-mono text-[11px] text-text-tertiary tracking-[0.3em] uppercase font-bold">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Status: <span className={providerToken ? "text-success font-bold" : "text-text-dim"}>{providerToken ? 'Sync Enabled' : 'Local Only'}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>NODES active: <span className="text-accent tabular-nums">{telemetry.nodes}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <span>UPTIME: <span className="text-text-secondary tabular-nums">{telemetry.uptime}%</span></span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Stats & Chart */}
        <div className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="glass-sm p-8 rounded-[32px] border-white/5 space-y-4 hover:bg-white/[0.03] transition-all group relative overflow-hidden">
                <p className="font-mono text-[10px] text-text-tertiary tracking-[0.4em] uppercase font-bold">{stat.label}</p>
                <span className={`text-[64px] font-display leading-none ${stat.color} tracking-tighter block`}>{stat.value}</span>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Activity className="w-24 h-24" />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-sm p-10 rounded-[40px] border-white/5 space-y-8 bg-white/[0.01]">
            <div className="flex items-center justify-between">
               <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-text-secondary font-bold">Directive Velocity // 24h</h2>
               <div className="flex gap-2">
                 <Badge variant="info" className="text-[9px]">Peak 22/hr</Badge>
               </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#71717A'}}
                  />
                  <YAxis hide />
                  <ReTooltip 
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#2563EB' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-text-secondary font-bold px-2">Active Strategic Directives</h2>
            <div className="glass-sm rounded-[40px] overflow-hidden border-white/5 bg-white/[0.01]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-10 py-6 text-[9px] font-mono text-text-tertiary uppercase tracking-widest font-bold">ID</th>
                    <th className="px-10 py-6 text-[9px] font-mono text-text-tertiary uppercase tracking-widest font-bold">Instruction</th>
                    <th className="px-10 py-6 text-[9px] font-mono text-text-tertiary uppercase tracking-widest text-right font-bold">Expiration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tasks.slice(0, 5).map((t) => (
                    <tr 
                      key={t.task_id} 
                      onClick={() => setSelectedTask(t)}
                      className="group hover:bg-white/[0.02] cursor-pointer transition-all"
                    >
                      <td className="px-10 py-6 font-mono text-[11px] text-text-dim group-hover:text-accent font-bold">{t.task_id.slice(0,6).toUpperCase()}</td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-full bg-accent text-[11px] text-white flex items-center justify-center font-mono font-bold shadow-lg shadow-accent/20">{t.owner?.charAt(0) || '?'}</div>
                          <div className="space-y-1">
                            <p className="text-[16px] font-medium text-text-primary group-hover:text-accent transition-colors truncate max-w-[400px]">{t.task}</p>
                            <Badge variant={t.status} className="text-[8px] uppercase font-mono px-2">{t.status}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right font-mono text-[11px] text-text-tertiary">{t.deadline?.split('T')[0] || 'EPOCH'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Logs Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="flex items-center justify-between px-2">
             <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-text-secondary font-bold">Telepathic Feed</h2>
             <button onClick={openQuickAdd} className="flex items-center text-[10px] font-mono text-accent hover:text-white transition-colors">
               <Plus className="w-4 h-4 mr-2" /> Quick Append
             </button>
           </div>
           <div className="glass-sm p-10 rounded-[40px] border-white/5 bg-white/[0.01] space-y-10 min-h-[800px]">
             {logs.map((log) => (
               <div key={log.log_id} className="flex gap-6 items-start relative group">
                 <div className="flex flex-col items-center">
                   <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(37,99,235,0.4)] mt-1.5" />
                   <div className="w-px h-full bg-white/5 absolute top-4 group-last:hidden" />
                 </div>
                 <div className="space-y-2 pb-6">
                   <div className="flex items-center gap-3">
                     <span className="font-mono text-[10px] text-accent font-bold">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</span>
                     <span className="text-[11px] text-text-primary font-bold uppercase tracking-widest">{log.action}</span>
                   </div>
                   <p className="text-[13px] text-text-tertiary leading-relaxed font-ui italic">{log.reason}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {actualSelectedTask && (
          <TaskDetailPanel task={actualSelectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}
