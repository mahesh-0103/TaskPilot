import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Mail, Trash2 } from 'lucide-react';
import { Button, Badge } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { formatDistanceToNow } from '../utils/time.js';

function PropertyRow({ label, children }) {
  return (
    <div className="flex items-center min-h-11 border-b border-border-subtle last:border-0 hover:bg-bg-elevated px-4 transition-colors">
      <span className="text-[12px] font-ui text-text-tertiary w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 text-[14px] text-text-primary">{children}</div>
    </div>
  );
}

export default function TaskDetailPanel({ task, onClose }) {
  const { updateTask, removeTask } = useWorkflowStore();
  const { user } = useAuthStore();
  const [taskData, setTaskData] = useState(task);
  const [logs, setLogs] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task?.task || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [calPushing, setCalPushing] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Keyboard close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Load task logs
  useEffect(() => {
    if (!task?.task_id) return;
    supabase
      .from('logs')
      .select('*')
      .eq('task_id', task.task_id)
      .order('timestamp', { ascending: false })
      .limit(3)
      .then(({ data }) => setLogs(data || []));
  }, [task?.task_id]);

  const saveField = async (field, value) => {
    const updated = { ...taskData, [field]: value, updated_at: new Date().toISOString() };
    setTaskData(updated);
    updateTask(taskData.task_id, { [field]: value });
    await supabase.from('tasks').update({ [field]: value, updated_at: updated.updated_at }).eq('task_id', taskData.task_id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000); return; }
    await supabase.from('tasks').delete().eq('task_id', taskData.task_id);
    removeTask(taskData.task_id);
    toast.success('Task deleted.');
    onClose();
  };

  const handleCalPush = async () => {
    const pToken = useAuthStore.getState().providerToken;
    if (!pToken) { toast.error('Connect with Google first.'); return; }
    setCalPushing(true);
    try {
      const res = await fetch(`${API_BASE}/calendar/push-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${useAuthStore.getState().session?.access_token}` },
        body: JSON.stringify({ task_id: taskData.task_id, access_token: pToken }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail);
      toast.success('Added to Google Calendar!');
      await saveField('calendar_event_id', d.event_id);
    } catch (e) { toast.error(e.message); } finally { setCalPushing(false); }
  };

  const handleSendReminder = async () => {
    const pToken = useAuthStore.getState().providerToken;
    if (!pToken) { toast.error('Connect with Google first.'); return; }
    const email = prompt('Send reminder to email:');
    if (!email) return;
    setReminderSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${useAuthStore.getState().session?.access_token}` },
        body: JSON.stringify({ task_id: taskData.task_id, access_token: pToken, email }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail);
      toast.success('Reminder email sent!');
    } catch (e) { toast.error(e.message); } finally { setReminderSending(false); }
  };

  if (!task) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 bottom-0 w-[380px] z-50 glass-modal rounded-none rounded-l-2xl overflow-y-auto flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
          <Badge variant={taskData.status}>{taskData.status}</Badge>
          <button onClick={onClose} aria-label="Close panel" className="text-text-tertiary hover:text-text-primary cursor-pointer transition-colors">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Task Title */}
        <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
          {editingTitle ? (
            <textarea
              autoFocus
              className="w-full text-[18px] font-medium text-text-primary bg-transparent border-b border-accent outline-none resize-none leading-relaxed"
              value={titleDraft}
              rows={3}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={async () => {
                setEditingTitle(false);
                if (titleDraft !== taskData.task) await saveField('task', titleDraft);
              }}
            />
          ) : (
            <p
              className="text-[18px] font-medium text-text-primary leading-relaxed cursor-text hover:text-accent transition-colors"
              onClick={() => { setEditingTitle(true); setTitleDraft(taskData.task); }}
            >
              {taskData.task}
            </p>
          )}
        </div>

        {/* Properties */}
        <div className="flex-1">
          <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider px-4 py-3">Properties</p>

          <PropertyRow label="Owner">
            <input
              className="bg-transparent text-text-primary text-[14px] w-full outline-none focus:text-accent"
              defaultValue={taskData.owner}
              onBlur={e => saveField('owner', e.target.value)}
            />
          </PropertyRow>

          <PropertyRow label="Deadline">
            <input
              type="date"
              className="bg-transparent text-text-primary text-[14px] outline-none focus:text-accent cursor-pointer [color-scheme:dark]"
              defaultValue={taskData.deadline}
              onBlur={e => saveField('deadline', e.target.value)}
              onChange={e => saveField('deadline', e.target.value)}
            />
          </PropertyRow>

          <PropertyRow label="Priority">
            <select
              className="bg-transparent text-text-primary text-[14px] outline-none cursor-pointer"
              defaultValue={taskData.priority}
              onChange={e => saveField('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </PropertyRow>

          <PropertyRow label="Status">
            <select
              className="bg-transparent text-text-primary text-[14px] outline-none cursor-pointer"
              defaultValue={taskData.status}
              onChange={e => saveField('status', e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </PropertyRow>

          {taskData.depends_on?.length > 0 && (
            <PropertyRow label="Depends on">
              <span className="font-mono text-[11px] text-text-tertiary">
                {taskData.depends_on.join(', ').slice(0, 60)}
              </span>
            </PropertyRow>
          )}

          <PropertyRow label="Created">
            <span className="text-text-secondary text-[13px]">
              {taskData.created_at ? formatDistanceToNow(taskData.created_at) : '—'}
            </span>
          </PropertyRow>

          <PropertyRow label="Task ID">
            <span className="font-mono text-[11px] text-text-tertiary">{taskData.task_id?.slice(0, 12)}...</span>
          </PropertyRow>

          {/* Integrations */}
          <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider px-4 py-3">Integrations</p>
          <div className="px-4 space-y-2 pb-4">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={handleCalPush}
              disabled={calPushing}
            >
              <Calendar className="w-4 h-4" />
              {taskData.calendar_event_id ? 'View in Calendar ↗' : (calPushing ? 'Adding...' : 'Add to Google Calendar')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={handleSendReminder}
              disabled={reminderSending}
            >
              <Mail className="w-4 h-4" />
              {reminderSending ? 'Sending...' : 'Send Email Reminder'}
            </Button>
          </div>

          {/* Activity */}
          {logs.length > 0 && (
            <>
              <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider px-4 py-3">Activity</p>
              <div className="px-4 pb-4 space-y-2">
                {logs.map((log) => (
                  <div key={log.log_id} className="flex justify-between items-start">
                    <span className="text-[13px] text-text-secondary flex-1">{log.action}</span>
                    <span className="font-mono text-[11px] text-text-tertiary ml-2 flex-shrink-0">
                      {log.timestamp ? formatDistanceToNow(log.timestamp) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Delete */}
          <div className="px-4 pb-6 pt-2">
            <button
              onClick={handleDeleteConfirm}
              className={clsx(
                'w-full h-9 rounded-lg text-[13px] font-ui transition-colors cursor-pointer',
                deleteConfirm
                  ? 'bg-danger-subtle text-danger border border-danger/30'
                  : 'text-text-tertiary hover:text-danger hover:bg-danger-subtle border border-border-subtle'
              )}
            >
              <Trash2 className="w-4 h-4 inline mr-1.5" />
              {deleteConfirm ? 'Confirm delete?' : 'Delete task'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
