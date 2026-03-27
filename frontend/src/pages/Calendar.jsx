import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar as CalIcon, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function Calendar() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);

  React.useEffect(() => {
    if (!user) return;
    // Check if Google token exists
    if (useAuthStore.getState().providerToken) setConnected(true);

    // Load tasks
    supabase.from('tasks').select('*').eq('user_id', user.id)
      .then(({ data }) => setTasks(data || []));
  }, [user]);

  const handleConnect = () => {
    toast('Please log in with Google on the Auth screen to connect Calendar.', { icon: 'ℹ️' });
  };

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getTasksForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.deadline === dateStr);
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-20 lg:pb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[28px] font-semibold text-text-primary">Calendar</h1>
        {connected ? (
          <div className="flex items-center gap-2 text-success text-[13px]">
            <CheckCircle className="w-4 h-4" />
            Google Calendar connected
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleConnect}>
            <CalIcon className="w-4 h-4" /> Connect Google Calendar
          </Button>
        )}
      </div>

      {/* Upcoming strip */}
      <div className="glass-sm p-4">
        <p className="font-mono text-[12px] text-text-tertiary mb-3">Next 7 days</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayTasks = tasks.filter(t => t.deadline === dateStr);
            return (
              <div key={i} className={clsx(
                'glass-sm px-3 py-2 flex-shrink-0 min-w-[100px]',
                dayTasks.length > 0 ? 'border-accent/30' : ''
              )}>
                <p className="font-mono text-[10px] text-text-tertiary">{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                {dayTasks.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary mt-1">No tasks</p>
                ) : dayTasks.slice(0, 2).map(t => (
                  <div key={t.task_id} className="mt-1">
                    <p className="text-[11px] text-text-primary leading-snug truncate">{t.task.slice(0, 30)}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month navigation + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="h-8 w-8 rounded-lg glass-sm flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
          >
            ←
          </button>
          <h2 className="text-[16px] font-semibold text-text-primary w-40 text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="h-8 w-8 rounded-lg glass-sm flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
          >
            →
          </button>
        </div>
        <div className="glass-sm flex p-0.5 rounded-lg">
          {['Month', 'Week', 'Day'].map(v => (
            <button
              key={v}
              onClick={() => setView(v.toLowerCase())}
              className={clsx(
                'px-3 py-1.5 text-[13px] rounded-md transition-all cursor-pointer',
                view === v.toLowerCase() ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-primary'
              )}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="glass overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border-subtle">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-[12px] font-mono text-text-tertiary uppercase">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day && today.getDate() === day &&
              today.getMonth() === month && today.getFullYear() === year;
            const dayTasks = getTasksForDay(day);
            return (
              <div
                key={i}
                className={clsx(
                  'min-h-[80px] p-1.5 border-b border-r border-border-subtle last:border-r-0',
                  'hover:bg-bg-elevated transition-colors',
                  !day && 'opacity-0 pointer-events-none'
                )}
              >
                {day && (
                  <>
                    <span className={clsx(
                      'text-[13px] font-ui w-6 h-6 flex items-center justify-center rounded-full mb-1',
                      isToday ? 'bg-accent text-white' : 'text-text-primary'
                    )}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map(t => (
                        <div
                          key={t.task_id}
                          className={clsx(
                            'text-[11px] rounded px-1 py-0.5 truncate glass-sm',
                            t.priority === 'high' ? 'border-l-2 border-danger' :
                              t.priority === 'medium' ? 'border-l-2 border-warning' :
                                'border-l-2 border-accent'
                          )}
                        >
                          <span className="text-text-primary">{t.owner?.slice(0,1)} </span>
                          <span className="text-text-secondary">{t.task.slice(0, 18)}</span>
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <p className="text-[10px] text-text-tertiary font-mono pl-1">+{dayTasks.length - 2} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
