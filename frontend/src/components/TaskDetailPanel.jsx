import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Calendar, Terminal, 
  Trash2, CheckCircle, AlertTriangle,
  CheckCircle2, ChevronRight, Mail, RefreshCw, Send, User
} from 'lucide-react';
import { Badge, Button, Divider } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useWorkflowStore from '../store/workflowStore';
import { clsx } from 'clsx';
import { apiRequest } from '../lib/api';

export default function TaskDetailPanel({ task, onClose }) {
  const { user } = useAuthStore();
  const { tasks, loadTasks, updateTask: updateStoreTask, removeTask } = useWorkflowStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(task?.task || '');

  // Reassign state
  const [showReassign, setShowReassign] = useState(false);
  const [assigneeName, setAssigneeName] = useState(task?.owner || '');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);

  // Audit logs
  const [taskLogs, setTaskLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (!task?.task_id) return;
    setEditVal(task.task || '');
    setAssigneeName(task.owner || '');
    
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const resp = await apiRequest('/logs', {}, 'GET');
        const allLogs = resp?.logs || [];
        setTaskLogs(allLogs.filter(l => l.task_id === task.task_id).reverse().slice(0, 5));
      } catch (e) {
        // Non-critical, fail silently
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [task?.task_id]);

  if (!task) return null;

  const updateTask = async (updates) => {
    try {
      await updateStoreTask(task.task_id, updates);
      toast.success('Directive updated.');
    } catch (e) {
      toast.error('Update failed: ' + e.message);
    }
  };

  // ── Mark as Completed + Remove Calendar Event ─────────────────────────────
  const handleMarkComplete = async () => {
    toast.promise(
      (async () => {
        await updateTask({ status: 'completed' });

        // Remove from Google Calendar if event was previously synced
        const { providerToken } = useAuthStore.getState();
        if (providerToken && task.task_id) {
          try {
            const eventId = task.task_id.replace(/-/g, '');
            await apiRequest('/calendar/delete-event', {
              event_id: eventId,
              token: providerToken
            });
          } catch (_) {
            // Calendar deletion is best-effort
          }
        }
      })(),
      {
        loading: 'Marking as complete...',
        success: 'Task completed & calendar event removed.',
        error: 'Could not mark complete.'
      }
    );
  };

  // ── Mark as Delayed + Trigger Self-Heal ───────────────────────────────────
  const handleMarkDelayed = async () => {
    toast.promise(
      (async () => {
        await updateTask({ status: 'delayed' });
        // Trigger self-heal on the backend (monitored protocol)
        await apiRequest('/monitor/self-heal/trigger', { task_id: task.task_id, user_id: user.id });
      })(),
      {
        loading: 'Flagging as delayed...',
        success: 'Delayed. Self-heal protocol initiated.',
        error: 'Could not flag as delayed.'
      }
    );
  };

  // ── Reassign + Send Email ─────────────────────────────────────────────────
  const handleReassign = async () => {
    if (!assigneeName.trim()) {
      toast.error('Assignee name is required.');
      return;
    }
    setIsSendingMail(true);
    try {
      await updateTask({ owner: assigneeName });

      if (assigneeEmail.trim()) {
        const { providerToken } = useAuthStore.getState();
        await apiRequest('/calendar/send-reminder', {
          task_id: task.task_id,
          user_id: user.id,
          email: assigneeEmail.trim(),
          token: providerToken,
          custom_message: `You have been assigned the task: "${task.task}". Please ensure it is completed by ${task.deadline || 'the deadline'}.`
        });
        toast.success(`Reassigned to ${assigneeName} — reminder sent to ${assigneeEmail}`);
      } else {
        toast.success(`Reassigned to ${assigneeName}.`);
      }
      setShowReassign(false);
    } catch (e) {
      toast.error('Reassign failed: ' + e.message);
    } finally {
      setIsSendingMail(false);
    }
  };

  // ── Delete Task ───────────────────────────────────────────────────────────
  const deleteTask = async () => {
    if (!confirm('Permanently decommission this directive?')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('tasks').delete().eq('task_id', task.task_id);
      if (error) throw error;
      toast.success('Directive decommissioned.');
      removeTask(task.task_id);
      onClose();
    } catch (e) {
      toast.error('Deletion failed: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Calendar Sync ─────────────────────────────────────────────────────────
  const handleSyncToCalendar = async () => {
    const { providerToken } = useAuthStore.getState();
    if (!providerToken) {
      toast.error('Google integration offline. Reconnect in Settings.');
      return;
    }
    setIsSyncing(true);
    try {
      const datePart = task.deadline ? task.deadline.split('T')[0] : new Date().toISOString().split('T')[0];
      const startStr = `${datePart}T09:00:00Z`;
      const d = new Date(startStr);
      if (isNaN(d.getTime())) throw new Error('Invalid deadline format.');
      const end = new Date(d.getTime() + 3600000).toISOString();

      await apiRequest('/calendar/create-event', {
        task_id: task.task_id,
        user_id: user.id,
        summary: `🚀 ${task.task}`,
        description: `Owner: ${task.owner}\nPriority: ${task.priority}\n\nAutomated by TaskPilot.`,
        start_time: startStr,
        end_time: end,
        token: providerToken
      });
      loadTasks(user.id, true);
      toast.success('Orbit synchronized with Google Calendar.');
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Dependency helpers ────────────────────────────────────────────────────
  const otherTasks = tasks.filter(t => t.task_id !== task.task_id);
  const updateDependency = async (depId) => {
    if (!depId) return;
    const current = Array.isArray(task.depends_on) ? task.depends_on : [];
    if (current.includes(depId)) return;
    await updateTask({ depends_on: [...current, depId] });
  };
  const removeDependency = async (depId) => {
    const current = Array.isArray(task.depends_on) ? task.depends_on : [];
    await updateTask({ depends_on: current.filter(id => id !== depId) });
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-screen w-full sm:w-[540px] bg-bg-surface/98 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase font-bold">Node Telemetry</span>
          <span className="font-mono text-[8px] text-text-tertiary opacity-30 uppercase tracking-widest truncate max-w-[200px]">{task.task_id}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={clsx("p-3 rounded-2xl transition-all border", isEditing ? "bg-accent text-white border-accent" : "hover:bg-white/5 border-white/10 text-text-tertiary")}
            title="Edit task"
          >
            <Terminal className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-text-tertiary hover:text-text-primary transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-thin">
        {/* Title */}
        <section>
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-[18px] font-display italic text-text-primary focus:border-accent outline-none shadow-inner"
                rows={3}
              />
              <div className="flex gap-3">
                <Button variant="accent" onClick={() => { updateTask({ task: editVal }); setIsEditing(false); }}>Commit</Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <h2 className="text-[28px] leading-tight font-display italic text-text-primary tracking-tight">{task.task}</h2>
          )}
          <div className="flex gap-2 mt-4">
            <Badge variant={task.status} className="px-3 py-1 uppercase text-[10px] tracking-[0.2em]">{task.status}</Badge>
            <Badge variant="ghost" className="px-3 py-1 uppercase text-[10px] tracking-[0.2em] border-white/5 bg-white/5">{task.priority} Priority</Badge>
          </div>
        </section>

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleMarkComplete}
            className="h-20 rounded-[24px] border border-success/20 bg-success/5 flex flex-col items-center justify-center gap-2 hover:bg-success/10 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-6 h-6 text-success" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-success font-bold">Mark Done</span>
          </button>
          <button
            onClick={handleMarkDelayed}
            className="h-20 rounded-[24px] border border-danger/20 bg-danger/5 flex flex-col items-center justify-center gap-2 hover:bg-danger/10 transition-all active:scale-95"
          >
            <AlertTriangle className="w-6 h-6 text-danger" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-danger font-bold">Flag Delayed</span>
          </button>
        </div>

        {/* Reassign Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Reassign & Notify</span>
            <button
              onClick={() => setShowReassign(!showReassign)}
              className={clsx("text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-xl border transition-all", showReassign ? "border-accent text-accent bg-accent/10" : "border-white/10 text-text-tertiary hover:border-accent/40")}
            >
              {showReassign ? 'Cancel' : 'Reassign'}
            </button>
          </div>

          {!showReassign && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center font-mono text-[11px] text-accent font-bold">
                {task.owner?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-[14px] text-text-secondary font-medium">{task.owner || 'Unassigned'}</span>
            </div>
          )}

          <AnimatePresence>
            {showReassign && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Assignee name..."
                      value={assigneeName}
                      onChange={e => setAssigneeName(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-[14px] font-mono outline-none focus:border-accent transition-all text-text-primary"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="email"
                      placeholder="Email address (sends reminder automatically)..."
                      value={assigneeEmail}
                      onChange={e => setAssigneeEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-[14px] font-mono outline-none focus:border-accent transition-all text-text-primary"
                    />
                  </div>
                  <Button
                    variant="accent"
                    onClick={handleReassign}
                    disabled={isSendingMail}
                    className="w-full h-12 rounded-2xl font-mono text-[11px] uppercase tracking-widest"
                  >
                    {isSendingMail ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {assigneeEmail ? 'Reassign & Send Email' : 'Reassign'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Divider className="opacity-30" />

        {/* Temporal Axis */}
        <div className="space-y-4">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Temporal Plane</span>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-text-tertiary opacity-40 uppercase tracking-widest ml-1">Deadline Date</p>
              <input
                type="date"
                value={task.deadline ? task.deadline.split('T')[0] : ''}
                onChange={(e) => updateTask({ deadline: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl border border-white/10 font-mono text-[13px] text-text-primary bg-white/[0.03] outline-none focus:border-accent transition-all"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-text-tertiary opacity-40 uppercase tracking-widest ml-1">Priority</p>
              <select
                value={task.priority || 'medium'}
                onChange={(e) => updateTask({ priority: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl border border-white/10 font-mono text-[13px] text-text-primary bg-bg-surface outline-none focus:border-accent transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="space-y-4">
          <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase font-bold">Dependencies</span>
          {(task.depends_on || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(task.depends_on || []).map(depId => {
                const depTask = tasks.find(t => t.task_id === depId);
                return (
                  <Badge key={depId} variant="info" className="gap-2 p-2 px-3 rounded-xl border border-accent/20 bg-accent/5 text-[11px]">
                    <span className="truncate max-w-[160px]">{depTask ? depTask.task : depId}</span>
                    <X className="w-3 h-3 cursor-pointer hover:text-danger flex-shrink-0" onClick={() => removeDependency(depId)} />
                  </Badge>
                );
              })}
            </div>
          )}
          <div className="relative">
            <select
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-[13px] font-mono text-text-secondary outline-none focus:border-accent cursor-pointer appearance-none transition-all hover:bg-white/[0.05]"
              onChange={(e) => updateDependency(e.target.value)}
              value=""
            >
              <option value="" disabled>Add preceding node...</option>
              {otherTasks.filter(t => !(task.depends_on || []).includes(t.task_id)).map(t => (
                <option key={t.task_id} value={t.task_id} className="bg-bg-surface text-text-primary">
                  {t.task.slice(0, 80)}{t.task.length > 80 ? '...' : ''}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary rotate-90 w-4 h-4" />
          </div>
        </div>

        {/* Audit Timeline */}
        {taskLogs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-accent tracking-[0.4em] uppercase font-bold">Audit Timeline</span>
              {loadingLogs && <RefreshCw className="w-3 h-3 animate-spin text-accent" />}
            </div>
            <div className="space-y-4 relative before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
              {taskLogs.map((log) => (
                <div key={log.log_id} className="relative pl-9">
                  <div className={clsx("absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 border-bg-surface flex items-center justify-center",
                    log.action?.toLowerCase().includes('delay') ? "bg-danger" : log.action?.toLowerCase().includes('heal') ? "bg-accent" : "bg-success")}>
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <p className="text-[13px] font-medium text-text-primary capitalize">{log.action}</p>
                  <p className="text-[10px] text-text-tertiary opacity-60 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-8 border-t border-white/5 bg-bg-surface/50 backdrop-blur-xl flex flex-col gap-3">
        <Button
          variant="accent"
          onClick={handleSyncToCalendar}
          disabled={isSyncing}
          className="h-14 font-mono text-[11px] uppercase tracking-[0.3em] font-bold shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:scale-[1.01] active:scale-95 transition-all"
        >
          {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
          Synchronize to Calendar
        </Button>

        <button
          onClick={deleteTask}
          disabled={isDeleting}
          className="flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.4em] text-text-tertiary hover:text-danger transition-all py-2 opacity-40 hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" /> Decommission Directive
        </button>
      </div>
    </motion.div>
  );
}
