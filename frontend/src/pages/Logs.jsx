import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { EmptyState } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from '../utils/time.js';

const FILTERS = ['All', 'Task delayed', 'Task reassigned', 'Deadline extended'];

function getDotColor(action) {
  if (!action) return 'bg-accent';
  const a = action.toLowerCase();
  if (a.includes('delay')) return 'bg-danger';
  if (a.includes('reassign')) return 'bg-warning';
  if (a.includes('deadline') || a.includes('extended')) return 'bg-info';
  return 'bg-accent';
}

function getBorderColor(action) {
  if (!action) return 'border-accent';
  const a = action.toLowerCase();
  if (a.includes('delay')) return 'border-danger';
  if (a.includes('reassign')) return 'border-warning';
  if (a.includes('deadline') || a.includes('extended')) return 'border-info';
  return 'border-accent';
}

export default function Logs() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs-page', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      return data || [];
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  const filtered = logs.filter(l => {
    const matchFilter = filter === 'All' ||
      l.action?.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.task_id?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskpilot-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-20 lg:pb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[28px] font-semibold text-text-primary">Audit Log</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 h-9 px-4 rounded-lg glass-sm text-[13px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export JSON
        </button>
      </div>

      {/* Filters + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={clsx(
                'h-8 px-3 rounded-lg text-[13px] font-ui transition-all cursor-pointer',
                filter === f
                  ? 'bg-accent text-white'
                  : 'glass-sm text-text-tertiary hover:text-text-primary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search action or task ID..."
          className="h-9 w-60 rounded-lg px-3 bg-bg-elevated border border-border-default text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Timeline */}
      {paged.length === 0 ? (
        <EmptyState icon={ScrollText} heading="No log entries" subtext="Run actions to see audit trail here." />
      ) : (
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-border-subtle hidden lg:block" />

          <div className="space-y-6">
            {paged.map((log, i) => (
              <motion.div
                key={log.log_id || i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 5) * 0.05 }}
                className={clsx(
                  'flex items-start gap-4',
                  'lg:' + (i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')
                )}
              >
                {/* Card */}
                <div className="flex-1 lg:max-w-[44%]">
                  <div className={clsx('glass-sm p-4 border-l-2', getBorderColor(log.action))}>
                    <p className="text-[14px] font-medium text-text-primary">{log.action}</p>
                    <p className="text-[13px] text-text-secondary mt-1">{log.reason}</p>
                    {log.decision_trace && (
                      <p className="text-[12px] text-text-tertiary mt-1 italic">{log.decision_trace}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle">
                      <span className="font-mono text-[10px] text-text-tertiary">{log.task_id?.slice(0, 12) || '—'}</span>
                      <span className="font-mono text-[11px] text-text-tertiary" title={log.timestamp}>
                        {log.timestamp ? formatDistanceToNow(log.timestamp) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dot (desktop only) */}
                <div className="hidden lg:flex items-center gap-3 flex-shrink-0" style={{ width: '12%' }}>
                  <div className="w-4 h-px bg-border-subtle flex-1" />
                  <div className={clsx('w-2 h-2 rounded-full', getDotColor(log.action))} />
                  <div className="w-4 h-px bg-border-subtle flex-1" />
                </div>

                <div className="hidden lg:block flex-1 max-w-[44%]" />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 px-4 rounded-lg glass-sm text-[13px] text-text-secondary disabled:opacity-40 cursor-pointer hover:text-text-primary transition-colors"
              >
                Previous
              </button>
              <span className="text-[13px] font-mono text-text-tertiary">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 px-4 rounded-lg glass-sm text-[13px] text-text-secondary disabled:opacity-40 cursor-pointer hover:text-text-primary transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
