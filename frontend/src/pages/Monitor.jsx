import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Info, RotateCw, Loader2, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, EmptyState, Button } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import client from '../api/client.js';
import toast from 'react-hot-toast';
import { getDeadlineCountdown } from '../utils/time.js';

export default function Monitor() {
  const { user, providerToken } = useAuthStore();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [delayLoading, setDelayLoading] = useState(false);
  const [delayedId, setDelayedId] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['monitor-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 8000,
    enabled: !!user,
  });

  const delayedTasks = tasks.filter(t => t.status === 'delayed');
  const selectedTask = tasks.find(t => t.task_id === selectedId);

  const handleDelay = async () => {
    if (!selectedId) return;
    setDelayLoading(true);
    try {
      await client.post('/simulate-delay', { task_id: selectedId, token: providerToken });
      setDelayedId(selectedId);
      qc.invalidateQueries(['monitor-tasks']);
      toast('Task marked delayed. Run Self-Heal to recover.', { icon: '⚠️' });
      if (providerToken) {
        setTimeout(() => toast.success('📧 Email notification sent', { duration: 4000 }), 800);
      }
    } catch (e) {
      // Error handled by interceptor
    } finally {
      setDelayLoading(false);
    }
  };

  const { text: countdownText, urgency } = selectedTask
    ? getDeadlineCountdown(selectedTask.deadline)
    : { text: '—', urgency: 'none' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-12 pb-20 lg:pb-6 max-w-4xl"
    >
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-[48px] font-normal font-display text-text-primary tracking-tight leading-tight italic">
          Threat Monitoring
        </h1>
        <p className="text-[16px] text-text-tertiary font-ui max-w-md leading-relaxed">
          Real-time analysis of execution velocity and potential timeline disruptions.
        </p>
      </header>

      {/* Info banner - Premium Subtle */}
      <div className="bg-accent/5 ring-1 ring-accent/20 flex items-start gap-4 p-6 rounded-3xl backdrop-blur-sm">
        <Activity className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[14px] text-text-secondary leading-relaxed">
          This terminal permits manual intervention to simulate <span className="text-accent font-medium italic">entropy</span> within the system. Select an objective to induce a delay and observe the autonomous recovery protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Task selector */}
          <div className="bg-bg-elevated/10 ring-1 ring-white/5 p-8 rounded-[32px] space-y-6">
            <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Select Objective</h2>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className={clsx(
                'w-full h-14 rounded-2xl px-5',
                'bg-bg-base/50 ring-1 ring-white/10 shadow-inner',
                'text-text-primary text-[15px] font-ui outline-none cursor-pointer',
                'focus:ring-accent/40 transition-all appearance-none'
              )}
            >
              <option value="">— Select from Active Directive —</option>
              {tasks.map(t => (
                <option key={t.task_id} value={t.task_id}>
                  {t.owner} • {t.task.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          {/* Selected task detail */}
          <AnimatePresence>
            {selectedTask && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-base ring-1 ring-white/10 rounded-[32px] p-8 shadow-2xl space-y-6 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Activity className="w-24 h-24 stroke-[1px]" />
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge variant={selectedTask.priority} className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5">{selectedTask.priority}</Badge>
                    <span className="font-mono text-[10px] text-text-tertiary tracking-widest uppercase">ID: {selectedTask.task_id?.slice(0, 8)}</span>
                  </div>

                  <p className="text-[20px] font-ui text-text-primary font-medium leading-tight">{selectedTask.task}</p>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] font-mono text-text-tertiary uppercase mb-1">Assigned</p>
                      <p className="text-[15px] font-ui text-text-primary italic">@{selectedTask.owner}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-text-tertiary uppercase mb-1">Window</p>
                      <p className={clsx(
                        'text-[15px] font-mono',
                        urgency === 'overdue' || urgency === 'critical' ? 'text-danger' : 'text-text-primary'
                      )}>
                        {countdownText}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="lg"
                    className="w-full h-16 text-[15px] font-bold rounded-2xl shadow-2xl shadow-danger/20"
                    onClick={handleDelay}
                    disabled={delayLoading || delayedId === selectedId}
                  >
                    {delayLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Disrupting...</> :
                      delayedId === selectedId ? 'Directive Disrupted ✓' : 'Simulate Disruption'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Feed */}
        <div className="bg-bg-elevated/5 ring-1 ring-white/5 rounded-[32px] p-8 flex flex-col">
          <header className="flex items-center justify-between mb-8">
            <h3 className="text-[12px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Live Disruption Feed</h3>
            <button
              onClick={() => qc.invalidateQueries(['monitor-tasks'])}
              className="text-text-tertiary hover:text-accent transition-colors p-2 rounded-full hover:bg-white/5"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </header>

          {delayedTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 grayscale opacity-20">
              <CheckCircle className="w-16 h-16 mb-6 stroke-[1px]" />
              <p className="text-[18px] font-display italic">Zero Entropy Detected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {delayedTasks.map(t => (
                <div key={t.task_id} className="p-6 rounded-2xl bg-danger/5 ring-1 ring-danger/10 flex items-start gap-4 group">
                  <div className="w-2 h-2 rounded-full bg-danger mt-2 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-ui text-text-primary font-medium truncate mb-1">{t.task}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-text-tertiary italic">@{t.owner}</span>
                      <span className="text-danger font-mono text-[10px] uppercase tracking-widest">DRIVE_LATENCY_DETECTED</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
