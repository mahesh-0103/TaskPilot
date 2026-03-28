import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Calendar, Shield, Zap, Terminal, 
  Trash2, CheckCircle, AlertTriangle, ExternalLink,
  Cpu, Share2, Archive, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Badge, Button, Divider } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import { clsx } from 'clsx';
import { apiRequest } from '../lib/api';

export default function TaskDetailPanel({ task, onClose }) {
  const { user, providerToken } = useAuthStore();
  const { tasks, loadTasks } = useWorkflowStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.task);

  const updateTask = async (updates) => {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('task_id', task.task_id);
      if (error) throw error;
      toast.success('Matrix updated.');
      await loadTasks();
    } catch (e) {
      toast.error('Transmission error: ' + e.message);
    }
  };

  const deleteTask = async () => {
    if (!confirm('Permanently decommission this directive?')) return;
    setIsDeleting(true);
    try {
       const { error } = await supabase.from('tasks').delete().eq('task_id', task.task_id);
       if (error) throw error;
       toast.success('Node purged.');
       await loadTasks();
       onClose();
    } catch (e) {
       toast.error('Deletion failed.');
    } finally {
       setIsDeleting(false);
    }
  };

  const handleSyncToCalendar = async () => {
    setIsSyncing(true);
    try {
      const datePart = task.deadline ? task.deadline.split('T')[0] : new Date().toISOString().split('T')[0];
      const timePart = task.due_time || '09:00';
      const startStr = `${datePart}T${timePart}:00Z`;
      
      const d = new Date(startStr);
      if (isNaN(d.getTime())) {
        throw new Error('Neural date format is corrupt. Please re-select the deadline.');
      }
      const end = new Date(d.getTime() + 3600000).toISOString();
      
      await apiRequest('/calendar/create-event', {
        task_id: task.task_id,
        user_id: user.id,
        summary: task.task,
        description: `Strategic Dispatch: ${task.task}`,
        start_time: startStr,
        end_time: end,
        token: providerToken
      });
      toast.success('Orbit Synchronized with Google Calendar');
    } catch (e) {
      toast.error('Sync Intercepted: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateDependency = async (depId) => {
    if (!depId) return;
    const currentDeps = Array.isArray(task.depends_on) ? task.depends_on : [];
    if (currentDeps.includes(depId)) return;
    const newDeps = [...currentDeps, depId];
    await updateTask({ depends_on: newDeps });
  };

  const removeDependency = async (depId) => {
    const currentDeps = Array.isArray(task.depends_on) ? task.depends_on : [];
    const newDeps = currentDeps.filter(id => id !== depId);
    await updateTask({ depends_on: newDeps });
  };

  const handleManualAction = async (type) => {
    try {
      if (type === 'reassign') {
        const newOwner = prompt('Reassign strategic node to operator:', task.owner);
        if (newOwner) await updateTask({ owner: newOwner });
      } else if (type === 'delay') {
        await updateTask({ status: 'delayed' });
      } else if (type === 'completed') {
        await updateTask({ status: 'completed' });
      } else if (type === 'extend') {
        const current = new Date(task.deadline ? task.deadline.split('T')[0] : Date.now());
        const extended = new Date(current.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        await updateTask({ deadline: extended });
      }
    } catch (e) {
      toast.error('Directive Update Failed');
    }
  };

  const handleSendEmail = async () => {
    if (!task.notification_emails || task.notification_emails.length === 0) {
      toast.error('No notification receptors assigned.');
      return;
    }
    toast.loading('Transmitting escalation sequence...', { id: 'email-tx' });
    try {
      await apiRequest('/monitor/simulate-delay', { 
        task_id: task.task_id, 
        token: providerToken 
      });
      toast.success('Escalation Received & Logged.', { id: 'email-tx' });
      await loadTasks();
    } catch (e) {
      toast.error('Transmission Failure: ' + e.message, { id: 'email-tx' });
    }
  };

  const addEmail = (email) => {
    if (!email || !email.includes('@')) return;
    const current = Array.isArray(task.notification_emails) ? task.notification_emails : [];
    if (!current.includes(email)) {
      updateTask({ notification_emails: [...current, email] });
    }
  };

  const removeEmail = (email) => {
    const current = Array.isArray(task.notification_emails) ? task.notification_emails : [];
    updateTask({ notification_emails: current.filter(e => e !== email) });
  };

  const otherTasks = tasks.filter(t => t.task_id !== task.task_id);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-screen w-full sm:w-[560px] bg-bg-surface/95 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]"
    >
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-8 sm:p-10 border-b border-white/5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase font-bold">Node Telemetry</span>
          <span className="font-mono text-[9px] text-text-tertiary opacity-40 uppercase tracking-widest">{task.task_id}</span>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsEditing(!isEditing)} 
             className={clsx("p-3 rounded-2xl transition-all border", isEditing ? "bg-accent text-white border-accent" : "hover:bg-white/5 border-white/10 text-text-tertiary")}
           >
             <Share2 className="w-5 h-5" />
           </button>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-text-tertiary hover:text-text-primary transition-all">
             <X className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 scroll-thin">
        <section className="space-y-6">
          {isEditing ? (
             <div className="space-y-4">
                <textarea 
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-[20px] font-display italic text-text-primary focus:border-accent outline-none shadow-inner"
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button variant="accent" onClick={() => { updateTask({ task: editVal }); setIsEditing(false); }}>Commit Changes</Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
             </div>
          ) : (
             <h2 className="text-[32px] leading-tight font-display italic text-text-primary tracking-tight">
               {task.task}
             </h2>
          )}
          <div className="flex gap-2">
            <Badge variant={task.status} className="px-3 py-1 uppercase text-[10px] tracking-[0.2em]">{task.status}</Badge>
            <Badge variant="ghost" className="px-3 py-1 uppercase text-[10px] tracking-[0.2em] border-white/5 bg-white/5">{task.priority} Priority</Badge>
          </div>
        </section>

        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-4">
            <button 
               onClick={() => handleManualAction('completed')}
               className="h-20 rounded-[28px] border border-success/20 bg-success/5 flex flex-col items-center justify-center gap-2 hover:bg-success/10 transition-all group scale-100 hover:scale-[1.02] active:scale-95"
            >
               <CheckCircle2 className="w-6 h-6 text-success" />
               <span className="text-[10px] font-mono uppercase tracking-widest text-success font-bold">COMPLETED</span>
            </button>
            <button 
               onClick={() => handleManualAction('delay')}
               className="h-20 rounded-[28px] border border-danger/20 bg-danger/5 flex flex-col items-center justify-center gap-2 hover:bg-danger/10 transition-all group scale-100 hover:scale-[1.02] active:scale-95"
            >
               <AlertTriangle className="w-6 h-6 text-danger" />
               <span className="text-[10px] font-mono uppercase tracking-widest text-danger font-bold">DELAYED</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="ghost" className="h-14 rounded-2xl border-white/10 text-text-secondary hover:bg-white/5 text-[10px] uppercase font-mono tracking-widest" onClick={() => handleManualAction('reassign')}>Reassign Node</Button>
            <Button variant="ghost" className="h-14 rounded-2xl border-accent/20 text-accent hover:bg-accent/5 text-[10px] uppercase font-mono tracking-widest" onClick={() => handleManualAction('extend')}>Extend Deadline</Button>
          </div>

          <Divider className="opacity-40" />

          {/* Temporal Axis Section */}
          <div className="space-y-4">
             <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Temporal Plane</span>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <p className="text-[9px] font-mono text-text-tertiary opacity-40 uppercase tracking-widest ml-1">Deadline Date</p>
                   <input 
                     type="date"
                     value={task.deadline ? task.deadline.split('T')[0] : ''}
                     onChange={(e) => updateTask({ deadline: e.target.value })}
                     className="max-h-14 w-full px-5 rounded-2xl border border-white/10 font-mono text-[13px] text-text-primary bg-white/[0.03] outline-none focus:border-accent transition-all"
                   />
                </div>
                <div className="space-y-2">
                   <p className="text-[9px] font-mono text-text-tertiary opacity-40 uppercase tracking-widest ml-1">Daily Epoch</p>
                   <input 
                     type="time"
                     value={task.due_time || '09:00'}
                     onChange={(e) => updateTask({ due_time: e.target.value })}
                     className="max-h-14 w-full px-5 rounded-2xl border border-white/10 font-mono text-[13px] text-text-primary bg-white/[0.03] outline-none focus:border-accent transition-all"
                   />
                </div>
             </div>
          </div>

          {/* Dependencies Section */}
          <div className="space-y-4">
             <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Sovereign Dependencies</span>
             <div className="space-y-4">
                {(task.depends_on || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(task.depends_on || []).map(depId => {
                      const depTask = tasks.find(t => t.task_id === depId);
                      return (
                        <Badge key={depId} variant="info" className="gap-2 p-2 px-4 rounded-xl border border-accent/20 bg-accent/5 max-w-full">
                          <span className="truncate text-[12px]">{depTask ? depTask.task : depId}</span>
                          <X className="w-4 h-4 cursor-pointer hover:text-danger flex-shrink-0 transition-colors" onClick={() => removeDependency(depId)} />
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="relative group/select">
                  <select 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-[13px] font-mono text-text-secondary outline-none focus:border-accent cursor-pointer appearance-none transition-all hover:bg-white/[0.05]"
                    onChange={(e) => updateDependency(e.target.value)}
                    value=""
                  >
                    <option value="" disabled className="bg-bg-surface text-text-tertiary">Select Preceding Node...</option>
                    {otherTasks.filter(t => !(task.depends_on || []).includes(t.task_id)).map(t => (
                      <option key={t.task_id} value={t.task_id} className="bg-bg-surface text-text-primary py-4">
                        {t.task.slice(0, 80)}{t.task.length > 80 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary group-hover/select:text-accent transition-all rotate-90" />
                </div>
             </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4">
             <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Notification Receptors</span>
             <div className="space-y-4">
                {(task.notification_emails || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(task.notification_emails || []).map(email => (
                      <Badge key={email} variant="ghost" className="gap-2 p-2 px-4 rounded-xl border-white/10 bg-white/5 text-[12px]">
                        {email}
                        <X className="w-4 h-4 cursor-pointer hover:text-danger flex-shrink-0 transition-colors" onClick={() => removeEmail(email)} />
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative">
                   <input 
                    type="email"
                    placeholder="Add receptor email..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-[13px] font-mono outline-none focus:border-accent transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                         addEmail(e.target.value);
                         e.target.value = '';
                      }
                    }}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-tertiary opacity-40 uppercase tracking-widest hidden sm:block">Press Enter</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="p-8 sm:p-10 border-t border-white/5 bg-bg-surface/50 backdrop-blur-xl flex flex-col gap-4">
         <Button 
           variant="accent" 
           onClick={handleSyncToCalendar} 
           disabled={isSyncing} 
           className="h-16 font-mono text-[12px] uppercase tracking-[0.3em] font-bold shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:shadow-accent/40 scale-100 hover:scale-[1.01] active:scale-95 transition-all"
         >
           🛰️ Synchronize Orbit
         </Button>
         <Button 
           variant="ghost" 
           onClick={handleSendEmail} 
           className="h-16 font-mono text-[12px] uppercase tracking-[0.3em] font-bold border-white/10 hover:bg-white/5 transition-all"
         >
           📡 Transmit Recall Signal
         </Button>
         
         <button 
           onClick={deleteTask}
           disabled={isDeleting}
           className="mt-4 flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.4em] text-text-tertiary hover:text-danger transition-all py-2 opacity-40 hover:opacity-100"
         >
           <Trash2 className="w-4 h-4" /> Decommission Directive
         </button>
      </div>
    </motion.div>
  );
}
