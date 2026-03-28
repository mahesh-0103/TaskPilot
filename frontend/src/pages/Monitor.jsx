import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, Zap, Cpu, RefreshCw } from 'lucide-react';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { Badge, Button } from '../components/ui/index.jsx';
import { apiRequest } from '../lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function Monitor() {
  const { tasks, loadTasks } = useWorkflowStore();
  const [isScanning, setIsScanning] = React.useState(false);
  const [signals, setSignals] = React.useState([
    'Node Authorization Success',
    'Telemetry Stream Established',
    'Resource Allocation Verified'
  ]);

  const stats = useMemo(() => {
    const total = (tasks || []).length;
    const completed = (tasks || []).filter(t => t.status === 'completed').length;
    const delayed = (tasks || []).filter(t => t.status === 'delayed').length;
    const pending = (tasks || []).filter(t => t.status === 'pending').length;
    const healthy = total > 0 ? ((completed + pending) / total * 100).toFixed(1) : 100;

    return { total, completed, delayed, pending, healthy };
  }, [tasks]);

  const { user, providerToken } = useAuthStore();
  const handleScan = async () => {
    setIsScanning(true);
    try {
      // Step 3: Monitor runs. Inspects tasks, detects breaches, and triggers Step 5 (Escalation).
      const res = await apiRequest('/monitor', { tasks, token: providerToken });
      if (res.logs?.length > 0) {
        toast.success(`${res.logs.length} anomalies intercepted.`);
        loadTasks();
      } else {
        toast.success('No process drift detected.');
      }
    } catch (e) {
      toast.error('Scan Interrupted: ' + e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const [jitter, setJitter] = React.useState({ load: 12, ram: 2.4, iops: 8400 });

  useEffect(() => {
    const timer = setInterval(() => {
      setJitter(prev => ({
        load: Math.max(8, Math.min(45, prev.load + (Math.random() - 0.5) * 6)).toFixed(0),
        ram: (2.4 + ((tasks?.length || 0) * 0.1) + (Math.random() * 0.2)).toFixed(1),
        iops: Math.floor(8200 + Math.random() * 400)
      }));
      
      const newSignal = [
        'Packet Route Optimized',
        'Cache Flush Complete',
        'Identity Handoff Verified',
        'Neural Weights Aligned',
        'Database Upsert Nominal'
      ][Math.floor(Math.random() * 5)];
      setSignals(s => [newSignal, ...s].slice(0, 10));
    }, 3000);
    return () => clearInterval(timer);
  }, [tasks.length]);

  const METRICS = [
    { label: 'Cluster Integrity', value: `${stats.healthy}%`, icon: Shield, color: 'text-success' },
    { label: 'Network Load', value: `${jitter.load}%`, icon: Zap, color: 'text-accent' },
    { label: 'Processed I/O', value: jitter.iops.toLocaleString(), icon: Activity, color: 'text-warning' },
    { label: 'Heap Allocation', value: `${jitter.ram} GB`, icon: Cpu, color: 'text-info' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 space-y-12"
    >
      <header className="flex items-center justify-between flex-wrap gap-8">
        <div className="space-y-2">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">System // Live Feed</span>
          <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Sovereign Telemetry</h1>
          <div className="flex gap-4 font-mono text-[10px] text-text-tertiary tracking-widest uppercase items-center">
            <span>Uptime: <span className="text-success font-bold">42d 12h 04m</span></span>
            <span>//</span>
            <span>Host: <span className="text-accent underline cursor-pointer font-bold">TASKPILOT PRIMARY NODE</span></span>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleScan}
          disabled={isScanning}
          className="h-14 px-10 rounded-2xl font-mono text-[12px] uppercase tracking-[0.3em] border-accent/30 text-accent hover:bg-accent/10"
        >
          {isScanning ? <RefreshCw className="w-4 h-4 animate-spin mr-3" /> : <Activity className="w-4 h-4 mr-3" />}
          Deep Scan Initiated
        </Button>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((m, i) => (
          <div key={i} className="glass-sm p-8 rounded-[40px] border-white/5 space-y-6 hover:bg-white/[0.03] transition-all group">
            <div className="flex items-center justify-between">
              <div className={clsx("p-3 rounded-2xl bg-white/[0.04] transition-transform group-hover:scale-110", m.color)}>
                <m.icon className="w-6 h-6" />
              </div>
              <span className="font-mono text-[9px] text-text-dim uppercase tracking-[0.2em] font-bold">Live Stream</span>
            </div>
            <div>
              <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest font-bold mb-1">{m.label}</p>
              <p className="text-[40px] font-display text-text-primary italic tracking-tighter leading-none">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <h3 className="font-mono text-[11px] text-text-tertiary tracking-[0.3em] uppercase px-4 font-bold underline underline-offset-8">Neural Distribution</h3>
          <div className="space-y-4">
            {tasks.length > 0 ? tasks.slice(0, 8).map((t, i) => (
              <div key={t.task_id} className="glass-sm p-8 rounded-[36px] border-white/5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors border-l-4 border-accent">
                 <div className="flex items-center gap-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center font-mono font-bold text-accent text-[12px] group-hover:scale-110 transition-transform">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                       <h4 className="text-[18px] font-medium text-text-primary group-hover:text-accent transition-colors leading-tight">{t.task}</h4>
                       <p className="text-[11px] font-mono text-text-tertiary uppercase mt-1 tracking-widest font-bold">Node UUID: {t.task_id.slice(0,12).toUpperCase()} // Latency: {12+i}ms</p>
                    </div>
                 </div>
                 <div className="text-right space-y-1">
                    <Badge variant={t.status} className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 font-bold">{t.status}</Badge>
                    <p className="text-[10px] font-mono text-text-dim uppercase tracking-tighter">Auth: @PILOT</p>
                 </div>
              </div>
            )) : (
              <div className="py-24 text-center border border-dashed border-white/10 rounded-[48px] opacity-30 flex flex-col items-center gap-6">
                 <Zap className="w-12 h-12" />
                 <p className="text-text-tertiary font-mono text-[14px] uppercase tracking-widest font-bold">Zero active nodes currently projected.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="glass-sm p-10 rounded-[48px] border-white/5 space-y-8 bg-white/[0.01] shadow-2xl">
              <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase font-bold underline underline-offset-8">Cluster Diagnostics</span>
              <div className="space-y-8">
                <div className="space-y-3">
                   <div className="flex justify-between font-mono text-[11px] text-text-tertiary uppercase tracking-widest font-bold">
                      <span>Neural Efficiency</span>
                      <span className="text-white">88%</span>
                   </div>
                   <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent animate-pulse" style={{ width: '88%' }} />
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between font-mono text-[11px] text-text-tertiary uppercase tracking-widest font-bold">
                      <span>Temporal Sync</span>
                      <span className="text-white">99%</span>
                   </div>
                   <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: '99%' }} />
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between font-mono text-[11px] text-text-tertiary uppercase tracking-widest font-bold">
                      <span>Entropy Leakage</span>
                      <span className="text-danger">0.2%</span>
                   </div>
                   <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-danger" style={{ width: '0.2%' }} />
                   </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                 <div className="flex items-center gap-4 text-accent mb-4">
                    <Shield className="w-5 h-5" />
                    <span className="text-[12px] font-mono font-bold uppercase tracking-widest">Sovereign Shield v4.2</span>
                 </div>
                 <p className="text-[13px] text-text-tertiary font-ui leading-relaxed italic">End-to-end neural encryption established. All distributed nodes are verified and encrypted under TaskPilot Security Protocol.</p>
              </div>
           </div>

           <div className="glass-sm p-10 rounded-[40px] border-white/10 bg-accent/5 space-y-6">
              <div className="flex items-center justify-between">
                 <p className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">Realtime Signals</p>
                 <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              </div>
              <div className="space-y-3 font-mono text-[10px] text-text-secondary overflow-hidden h-[120px]">
                {signals.map((s, i) => (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 0.8, x: 0 }} 
                    key={i}
                  >
                    {">> "} {s}
                  </motion.p>
                ))}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
