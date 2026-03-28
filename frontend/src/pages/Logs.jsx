import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Download, Filter, Search, Shield, Activity, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Button } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from '../utils/time.js';

const FILTERS = ['All', 'delay', 'reassign', 'extend', 'complete'];

export default function Logs() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

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
    const matchFilter = filter === 'All' || l.action?.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search || 
      l.action?.toLowerCase().includes(search.toLowerCase()) || 
      l.reason?.toLowerCase().includes(search.toLowerCase()) ||
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
    a.download = `pilot-trail-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 space-y-12"
    >
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-8">
        <div className="space-y-2">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase">Audit Trail // <span className="text-accent underline cursor-pointer">Live Stream</span></span>
          <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">System Ledger</h1>
          <div className="flex gap-4 font-mono text-[10px] text-text-tertiary tracking-widest uppercase items-center">
            <span>Entry Count: <span className="text-accent">{logs.length}</span></span>
            <span>//</span>
            <span>Integrity: <span className="text-success">Verified</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="ghost" className="h-11 px-6 rounded-xl bg-white/5 border border-white/5 font-mono text-[11px] uppercase tracking-widest" onClick={handleExport}>
             <Download className="w-4 h-4 mr-2" /> Export Core Dump
           </Button>
        </div>
      </header>

      {/* Controls */}
      <div className="flex items-center justify-between gap-6 flex-wrap">
         <div className="flex bg-white/5 rounded-2xl p-1 gap-1 border border-white/5">
            {FILTERS.map(f => (
               <button
                 key={f}
                 onClick={() => { setFilter(f); setPage(0); }}
                 className={clsx(
                   'px-5 py-2 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer',
                   filter === f ? 'bg-accent text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'
                 )}
               >
                 {f}
               </button>
            ))}
         </div>
         <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Filter by Intent or Node ID..."
              className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/5 rounded-2xl text-[13px] text-text-primary focus:border-accent/40 outline-none transition-all placeholder:text-text-dim"
            />
         </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
         {paged.map((log, i) => (
           <motion.div
             key={log.log_id || i}
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: i * 0.03 }}
             className="glass-sm p-8 rounded-[32px] border-white/5 flex items-start gap-8 group hover:bg-white/[0.02] transition-all"
           >
              <div className="w-24 flex-shrink-0 pt-1">
                 <p className="font-mono text-[13px] text-accent font-bold">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                 <p className="font-mono text-[9px] text-text-tertiary uppercase tracking-tighter mt-1">{new Date(log.timestamp).toLocaleDateString()}</p>
              </div>
              
              <div className="grow space-y-3">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                    <h4 className="text-[14px] font-mono font-bold uppercase tracking-widest text-text-primary group-hover:text-accent transition-colors">{log.action}</h4>
                    <span className="text-[10px] font-mono text-text-dim ml-auto">PID: {log.task_id?.slice(0,12) || 'SYSTEM'}</span>
                 </div>
                 <p className="text-[15px] font-ui text-text-secondary leading-relaxed bg-white/[0.01] p-4 rounded-2xl border border-white/[0.02] italic">{log.reason}</p>
                 {log.decision_trace && (
                   <p className="text-[11px] font-mono text-text-tertiary bg-black/20 p-3 rounded-xl border border-white/5 truncate">
                     {">> "} {log.decision_trace}
                   </p>
                 )}
              </div>
           </motion.div>
         ))}

         {paged.length === 0 && (
           <div className="py-32 flex flex-col items-center justify-center space-y-6 opacity-30">
              <Shield className="w-16 h-16" />
              <p className="font-mono text-[14px] uppercase tracking-[0.3em]">No Temporal Records Identified</p>
           </div>
         )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-10 pt-8 border-t border-white/5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="group flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-text-tertiary hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <Activity className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Back Step
          </button>
          <span className="text-[14px] font-display italic text-accent">{page + 1} // {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="group flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-text-tertiary hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            Forward Step
            <Activity className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
