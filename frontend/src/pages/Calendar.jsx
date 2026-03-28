import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Globe, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Badge } from '../components/ui/index.jsx';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import useModalStore from '../store/modalStore';
import toast from 'react-hot-toast';
import { apiRequest } from '../lib/api';

export default function Calendar() {
  const { user, providerToken } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const { openQuickAdd } = useModalStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user?.id) loadTasks(user.id);
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();

  const cells = useMemo(() => {
    const list = [];
    for (let i = 0; i < firstDay; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    return list;
  }, [firstDay, daysInMonth]);

  const getTasksForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
  };

  const handleSyncAll = async () => {
     if (!providerToken) {
       toast.error('Cloud link required for temporal sync.');
       return;
     }
     setIsSyncing(true);
     try {
       await apiRequest('/calendar/sync-tasks', { 
         tasks: tasks.filter(t => t.status === 'pending'),
         token: providerToken 
       });
       toast.success('Temporal nodes projected to Cloud Calendar.');
     } catch (e) {
       toast.error('Sync Interrupted: ' + e.message);
     } finally {
       setIsSyncing(false);
     }
  };

  const MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 space-y-12"
    >
      <header className="flex items-center justify-between flex-wrap gap-8">
        <div className="space-y-2">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Temporal // Plane</span>
          <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Sync Grid</h1>
          <div className="flex gap-4 font-mono text-[10px] text-text-tertiary tracking-widest uppercase items-center">
            <span>Status: <span className={providerToken ? "text-success font-bold" : "text-text-dim"}>{providerToken ? 'Sync Enabled' : 'Local Only'}</span></span>
            <span>//</span>
            <span>Drift: <span className="text-accent">0.00ms</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {providerToken && (
             <Button variant="ghost" className="h-12 px-6 rounded-xl bg-white/5 border border-white/5 font-mono text-[11px] uppercase tracking-widest hover:bg-white/10" onClick={handleSyncAll} disabled={isSyncing}>
               {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
               Project to Cloud
             </Button>
           )}
           <Button variant="accent" className="h-12 px-8 rounded-xl font-mono text-[11px] uppercase tracking-widest shadow-xl shadow-accent/20" onClick={openQuickAdd}>
             <Plus className="w-4 h-4 mr-2" /> Quick Append
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12 space-y-8">
           <div className="flex items-center justify-between px-6 bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
              <div className="flex items-center gap-8">
                <h2 className="text-[32px] font-display italic text-text-primary tracking-tight">{MONTH_NAMES[month]} <span className="text-text-tertiary not-italic font-mono text-[18px] ml-2">{year}</span></h2>
                <div className="flex gap-2">
                   <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-12 h-12 flex items-center justify-center rounded-2xl glass-sm hover:bg-white/5 transition-all text-text-tertiary hover:text-text-primary border-white/5 font-bold">
                     <ChevronLeft className="w-6 h-6" />
                   </button>
                   <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-12 h-12 flex items-center justify-center rounded-2xl glass-sm hover:bg-white/5 transition-all text-text-tertiary hover:text-text-primary border-white/5 font-bold">
                     <ChevronRight className="w-6 h-6" />
                   </button>
                </div>
              </div>
              <Badge variant="ghost" className="font-mono text-[11px] uppercase tracking-widest bg-accent/10 text-accent border-accent/20 px-4 py-2">System Epoch: v1.0.4</Badge>
           </div>

           <div className="glass-sm rounded-[48px] overflow-hidden border-white/5 bg-white/[0.01] shadow-2xl">
              <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
                {DAY_NAMES.map(d => (
                  <div key={d} className="py-6 text-center text-[10px] font-mono text-text-tertiary tracking-[0.4em] uppercase font-bold">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                  const dayTasks = getTasksForDay(day);
                  return (
                    <div
                      key={i}
                      onClick={() => day && openQuickAdd({ deadline: `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` })}
                      className={clsx(
                        'min-h-[160px] p-6 border-b border-r border-white/5 group transition-all relative cursor-pointer',
                        !day ? 'bg-black/20 opacity-20' : 'hover:bg-white/[0.03]'
                      )}
                    >
                      {day && (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <span className={clsx(
                              'text-[18px] font-mono flex items-center justify-center w-10 h-10 rounded-2xl transition-all font-bold',
                              isToday ? 'bg-accent text-white shadow-xl shadow-accent/40 scale-110' : 'text-text-tertiary group-hover:text-text-primary'
                            )}>{day}</span>
                            {dayTasks.length > 0 && <div className={clsx("w-2 h-2 rounded-full", dayTasks.some(t => t.status === 'delayed') ? "bg-danger" : "bg-accent")} />}
                          </div>
                          <div className="space-y-2">
                            {dayTasks.slice(0, 3).map(t => (
                              <div key={t.task_id} className="text-[10px] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 truncate text-text-secondary font-mono uppercase tracking-tighter group-hover:border-accent/20 transition-all">
                                {t.task}
                              </div>
                            ))}
                            {dayTasks.length > 3 && (
                               <p className="text-[9px] font-mono text-accent uppercase tracking-widest font-bold mt-2">+{dayTasks.length - 3} Overflow</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
