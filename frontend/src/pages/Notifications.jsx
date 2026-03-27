import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { EmptyState } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from '../utils/time.js';
import { useNavigate } from 'react-router-dom';

const FILTERS = ['All', 'Unread', 'Deadline', 'Delays', 'System'];

function getDotColor(type) {
  if (!type) return 'bg-accent';
  if (type.includes('deadline')) return 'bg-warning';
  if (type.includes('delay')) return 'bg-danger';
  if (type.includes('heal')) return 'bg-success';
  return 'bg-accent';
}

export default function Notifications() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  // Realtime
  React.useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('notif-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries(['notifications']))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [user]);

  const filtered = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Deadline') return n.type?.includes('deadline');
    if (filter === 'Delays') return n.type?.includes('delay');
    if (filter === 'System') return n.type?.includes('system') || n.type?.includes('heal');
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    qc.invalidateQueries(['notifications']);
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      qc.invalidateQueries(['notifications']);
    }
    if (n.task_id) navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-20 lg:pb-6 max-w-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-text-primary">Notifications</h1>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40 cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'h-8 px-3 rounded-lg text-[13px] transition-all cursor-pointer',
              filter === f ? 'bg-accent text-white' : 'glass-sm text-text-tertiary hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={Bell} heading="You're all caught up." subtext="No notifications to show." />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i < 6 ? i * 0.04 : 0 }}
                onClick={() => handleClick(n)}
                className={clsx(
                  'glass-sm p-4 flex items-start gap-3 cursor-pointer transition-all hover:-translate-y-0.5',
                  !n.is_read && 'border-l-2 border-accent'
                )}
              >
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', getDotColor(n.type))} />
                <div className="flex-1">
                  <p className="text-[14px] text-text-primary">{n.message}</p>
                  {n.task_id && (
                    <p className="text-[12px] text-text-secondary mt-0.5">Task: {n.task_id?.slice(0, 12)}...</p>
                  )}
                </div>
                <span className="font-mono text-[11px] text-text-tertiary flex-shrink-0">
                  {n.created_at ? formatDistanceToNow(n.created_at) : ''}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
