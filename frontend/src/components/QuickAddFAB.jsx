import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button, Input } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ task: '', owner: '', deadline: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleAdd = async () => {
    if (!form.task.trim()) { toast.error('Task description is required.'); return; }
    if (!form.deadline) { toast.error('Deadline is required.'); return; }
    setLoading(true);
    try {
      const taskId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error } = await supabase.from('tasks').insert({
        task_id: taskId,
        user_id: user.id,
        task: form.task,
        owner: form.owner || 'unassigned',
        deadline: form.deadline,
        priority: form.priority,
        status: 'pending',
        depends_on: [],
        is_checked: false,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      toast.success('Task added!');
      setOpen(false);
      setForm({ task: '', owner: '', deadline: '', priority: 'medium' });
    } catch (e) {
      toast.error(e.message || 'Failed to add task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        aria-label="Quick add task"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 lg:bottom-6 z-40 w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg cursor-pointer"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] glass-modal p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[20px] font-semibold text-text-primary">Add Task</h2>
                <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Task description *</label>
                  <textarea
                    rows={3}
                    value={form.task}
                    onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
                    placeholder="Describe the task in detail..."
                    className={clsx(
                      'w-full rounded-lg px-3 py-2.5 resize-none',
                      'bg-bg-elevated border border-border-default',
                      'text-text-primary text-[14px] font-ui',
                      'placeholder:text-text-tertiary focus:border-accent focus:outline-none',
                      'transition-colors'
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Owner</label>
                    <Input
                      value={form.owner}
                      onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                      placeholder="name"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Deadline *</label>
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                      className="[color-scheme:dark]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={clsx(
                      'h-[38px] w-full rounded-lg px-3',
                      'bg-bg-elevated border border-border-default',
                      'text-text-primary text-[14px] font-ui outline-none',
                      'focus:border-accent transition-colors cursor-pointer'
                    )}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-5"
                onClick={handleAdd}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
