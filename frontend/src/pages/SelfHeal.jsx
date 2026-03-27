import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, EmptyState, Button } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import client from '../api/client.js';
import toast from 'react-hot-toast';

export default function SelfHeal() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [healing, setHealing] = useState(false);
  const [healResults, setHealResults] = useState([]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['heal-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id);
      return data || [];
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  const delayed = tasks.filter(t => t.status === 'delayed');

  const getAction = (t) => t.depends_on?.length > 0 ? 'Extend deadline' : 'Reassign owner';

  const handleHeal = async () => {
    if (!delayed.length) { toast.error('No delayed tasks to heal.'); return; }
    setHealing(true);
    try {
      const { providerToken } = useAuthStore.getState();
      const { data } = await client.post('/self-heal', { tasks: delayed, token: providerToken });
      const healed = data.tasks || [];
      setHealResults(healed);
      qc.invalidateQueries(['heal-tasks']);
      toast.success(`${healed.length} task${healed.length !== 1 ? 's' : ''} healed successfully.`);
      if (providerToken && healed.length > 0) {
        setTimeout(() => toast.success('📧 Email notifications sent', { duration: 4000 }), 800);
      }
    } catch (e) {
      // handled by interceptor
    } finally {
      setHealing(false);
    }
  };

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
          System Recovery
        </h1>
        <p className="text-[16px] text-text-tertiary font-ui max-w-md leading-relaxed">
          Autonomous protocols for mitigating timeline drift and resource allocation conflicts.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Rules & Status */}
        <div className="md:w-1/2 space-y-8">
          {/* Rules card */}
          <section className="bg-bg-elevated/20 ring-1 ring-white/5 p-8 rounded-[32px] backdrop-blur-sm">
            <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-accent mb-6">Heal Protocols</h2>

            <div className="space-y-8">
              {[
                {
                  label: 'Independent Objectives',
                  body: 'Delayed tasks without dependencies are immediately reassigned to the pre-designated backup operative.',
                  badge: 'OWNER_REASSIGNED',
                },
                {
                  label: 'Sequential Objectives',
                  body: 'Tasks with active blockers receive a 24-hour deadline extension to permit upstream resolution.',
                  badge: 'TIMELINE_SHIFTED',
                },
              ].map(({ label, body, badge }, i) => (
                <div key={i} className="group">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-[17px] font-ui text-text-primary font-medium mb-1.5">{label}</p>
                      <p className="text-[14px] text-text-tertiary leading-relaxed">{body}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant="neutral" className="text-[9px] font-mono tracking-widest">{badge}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Action trigger */}
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full h-16 text-[16px] font-bold rounded-2xl shadow-2xl shadow-success/10"
              onClick={handleHeal}
              disabled={healing || delayed.length === 0}
              style={{ background: delayed.length > 0 ? 'var(--success)' : 'var(--bg-elevated)' }}
            >
              {healing ? <><Loader2 className="w-5 h-5 animate-spin" /> Executing Recovery...</> : <><RefreshCw className="w-5 h-5" /> Initiate Recovery Protocol</>}
            </Button>
            {delayed.length === 0 && (
              <p className="text-center text-[12px] font-mono text-success uppercase tracking-wider opacity-60 flex items-center justify-center gap-2">
                <CheckCircle className="w-3 h-3" /> System status: Optimal
              </p>
            )}
          </div>
        </div>

        {/* Right: Pending & Report */}
        <div className="md:w-1/2 space-y-6">
          <div className="bg-bg-base ring-1 ring-white/5 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Anomalies Detected</h2>
              <span className="font-mono text-[14px] text-accent font-bold">{delayed.length}</span>
            </div>

            {delayed.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center opacity-30 grayscale">
                <CheckCircle className="w-12 h-12 mb-4 stroke-[1px]" />
                <p className="text-[15px] font-display italic">No discrepancies found in the current directive.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {delayed.map(t => (
                  <div key={t.task_id} className="p-5 rounded-2xl bg-white/[0.03] group hover:bg-white/[0.06] transition-all">
                    <p className="text-[15px] font-ui text-text-primary font-medium mb-3">{t.task}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-tertiary">@{t.owner}</span>
                      <Badge variant="warning" className="text-[9px] font-mono">{getAction(t)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Healing report */}
          <AnimatePresence>
            {healResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/10 ring-1 ring-accent/30 rounded-[32px] p-8 backdrop-blur-xl"
              >
                <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-accent mb-6">Recovery Log</h2>
                <div className="space-y-6">
                  {healResults.map((t) => {
                    const original = delayed.find(d => d.task_id === t.task_id);
                    return (
                      <div key={t.task_id} className="space-y-3">
                        <p className="text-[15px] font-ui text-text-primary font-medium leading-tight">{t.task}</p>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                          {original?.owner !== t.owner && (
                            <div className="flex items-center gap-2">
                              <span className="text-text-tertiary line-through">@{original?.owner}</span>
                              <span className="text-accent">→</span>
                              <span className="text-text-primary">@{t.owner}</span>
                            </div>
                          )}
                          {original?.deadline !== t.deadline && (
                            <div className="flex items-center gap-2">
                              <span className="text-text-tertiary line-through">{original?.deadline}</span>
                              <span className="text-accent">→</span>
                              <span className="text-text-primary">{t.deadline}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
