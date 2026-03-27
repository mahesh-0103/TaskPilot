import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, Sparkles, Calendar, ScrollText, ClipboardList,
  LayoutDashboard
} from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Skeleton, EmptyState, Button } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { getTimeOfDay, formatDateLong, getDeadlineCountdown, formatDistanceToNow } from '../utils/time.js';
import toast from 'react-hot-toast';

function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{count}</>;
}

function DeadlineChip({ deadline }) {
  const { text, urgency } = getDeadlineCountdown(deadline);
  return (
    <span className={clsx(
      'font-mono text-[11px] px-2 py-0.5 rounded-md',
      urgency === 'overdue' ? 'text-danger font-bold italic' :
        urgency === 'critical' ? 'text-danger bg-danger-subtle' :
          urgency === 'warning' ? 'text-warning bg-warning-subtle' :
            'text-text-tertiary bg-bg-elevated'
    )}>
      {text}
    </span>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortBy, setSortBy] = useState('deadline');

  // Fetch tasks from Supabase (user-scoped)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 8000,
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries(['tasks']))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [user]);

  // Fetch logs
  const { data: logs = [] } = useQuery({
    queryKey: ['logs', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('logs').select('*')
        .eq('user_id', user.id).order('timestamp', { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  // Realtime logs
  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries(['logs']))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [user]);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    delayed: tasks.filter(t => t.status === 'delayed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'deadline') return a.deadline > b.deadline ? 1 : -1;
    if (sortBy === 'priority') {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 2) - (p[b.priority] || 2);
    }
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  const handleCheck = async (task) => {
    const newChecked = !task.is_checked;
    const newStatus = newChecked ? 'completed' : 'pending';
    await supabase.from('tasks').update({ is_checked: newChecked, status: newStatus })
      .eq('task_id', task.task_id);
    qc.invalidateQueries(['tasks']);
  };

  const greeting = `Good ${getTimeOfDay()}, ${profile?.display_name || profile?.username || 'there'}.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-20 lg:pb-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[28px] text-text-primary">{greeting}</h1>
          <p className="text-[13px] text-text-tertiary mt-0.5">{formatDateLong()}</p>
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/extract')}>
          <Sparkles className="w-4 h-4" /> New Extraction
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', val: stats.total, color: 'text-text-primary' },
          { label: 'Pending', val: stats.pending, color: 'text-text-secondary' },
          { label: 'Delayed', val: stats.delayed, color: 'text-danger', pulse: stats.delayed > 0 },
          { label: 'Completed', val: stats.completed, color: 'text-success' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sm p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              {s.pulse && <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />}
              <span className="text-[13px] font-mono text-text-tertiary uppercase tracking-[0.06em]">{s.label}</span>
            </div>
            <span className={clsx('text-[38px] font-semibold font-ui leading-none', s.color)}>
              {isLoading ? '—' : <AnimatedCounter value={s.val} />}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass-sm px-5 py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[14px] font-ui font-medium text-text-primary">Workflow Progress</span>
          <span className="text-[13px] font-mono text-text-tertiary">{stats.completed} / {stats.total} complete</span>
        </div>
        <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-accent"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="glass">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-[20px] font-semibold text-text-primary">Active Tasks</h2>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-bg-elevated border border-border-default rounded-lg px-3 h-8 text-[13px] text-text-secondary outline-none cursor-pointer"
          >
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            heading="No tasks yet"
            subtext="Extract from a meeting transcript to get started."
            action={<Button variant="primary" size="sm" onClick={() => navigate('/extract')}>Extract Tasks</Button>}
          />
        ) : (
          <div>
            {/* Headers */}
            <div className="grid grid-cols-[32px_1fr_80px_100px_80px_80px] gap-3 px-5 py-2 text-[11px] font-mono text-text-tertiary uppercase tracking-[0.08em] border-b border-border-subtle">
              <span />
              <span>Task</span>
              <span className="hidden md:block">Owner</span>
              <span className="hidden md:block">Deadline</span>
              <span>Priority</span>
              <span>Status</span>
            </div>
            {sortedTasks.slice(0, 20).map((t) => (
              <div
                key={t.task_id}
                className="grid grid-cols-[32px_1fr_80px_100px_80px_80px] gap-3 items-center px-5 py-3.5 border-b border-border-subtle hover:bg-bg-elevated transition-colors group"
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleCheck(t)}
                  aria-label={t.is_checked ? 'Uncheck task' : 'Check task'}
                  className={clsx(
                    'w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
                    t.is_checked
                      ? 'bg-accent border-accent'
                      : 'border-border-strong hover:border-accent'
                  )}
                >
                  {t.is_checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Task text */}
                <button
                  className={clsx(
                    'text-left text-[14px] font-ui truncate transition-colors',
                    t.is_checked ? 'text-text-tertiary line-through' : 'text-text-primary hover:text-accent'
                  )}
                  onClick={() => setSelectedTask(t)}
                >
                  {t.task}
                </button>

                <span className="text-[13px] text-text-secondary hidden md:block truncate">{t.owner}</span>
                <span className="hidden md:block"><DeadlineChip deadline={t.deadline} /></span>
                <span><Badge variant={t.priority}>{t.priority}</Badge></span>
                <span><Badge variant={t.status}>{t.status}</Badge></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-3 glass-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-text-primary">Recent Activity</h3>
            <Link to="/logs" className="text-[13px] text-text-tertiary hover:text-accent transition-colors">View all →</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l, i) => (
                <motion.div
                  key={l.log_id || i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={clsx(
                    'flex items-start gap-3 pl-3',
                    l.action?.includes('delayed') ? 'border-l-2 border-danger' :
                      l.action?.includes('reassigned') ? 'border-l-2 border-warning' :
                        'border-l-2 border-accent'
                  )}
                >
                  <div className="flex-1">
                    <p className="text-[14px] text-text-primary">{l.action}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">{l.reason}</p>
                  </div>
                  <span className="font-mono text-[11px] text-text-tertiary flex-shrink-0">
                    {l.timestamp ? formatDistanceToNow(l.timestamp) : ''}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 glass-sm p-5">
          <h3 className="text-[16px] font-semibold text-text-primary mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { icon: Sparkles, label: 'Extract New Tasks', to: '/extract' },
              { icon: RefreshCw, label: 'Run Self-Heal', to: '/heal' },
              { icon: Calendar, label: 'Open Calendar', to: '/calendar' },
              { icon: ScrollText, label: 'View Full Logs', to: '/logs' },
            ].map(({ icon: Icon, label, to }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 w-full h-10 px-3 rounded-lg bg-bg-elevated border border-border-default text-[14px] text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
              >
                <Icon className="w-4 h-4 text-accent flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
