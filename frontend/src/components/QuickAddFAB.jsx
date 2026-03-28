import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ListTodo, User, Calendar, Zap } from 'lucide-react';
import { Button, Input } from './ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useModalStore from '../store/modalStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function QuickAddFAB() {
  const { isQuickAddOpen, closeQuickAdd, openQuickAdd } = useModalStore();
  const [form, setForm] = useState({ task: '', owner: '', deadline: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleAdd = async () => {
    if (!form.task.trim()) { toast.error('Neural instruction required.'); return; }
    setLoading(true);
    try {
      const taskId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error } = await supabase.from('tasks').insert({
        task_id: taskId,
        user_id: user.id,
        task: form.task,
        owner: form.owner || user.email?.split('@')[0],
        deadline: form.deadline,
        priority: form.priority,
        status: 'pending',
        is_checked: false,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      toast.success('Task established in cluster.');
      closeQuickAdd();
      setForm({ task: '', owner: '', deadline: '', priority: 'medium' });
    } catch (e) {
      toast.error(e.message || 'Transmission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        aria-label="Quick add task"
        onClick={openQuickAdd}
        className="fixed bottom-20 right-8 lg:bottom-10 lg:right-10 z-[110] w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center shadow-2xl shadow-accent/40 cursor-pointer border border-white/20"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={closeQuickAdd}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[520px] glass-sm overflow-hidden rounded-[40px] border-white/5 bg-background shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]"
            >
              <div className="p-10 space-y-8">
                <header className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase">Primary // Node</span>
                    <h2 className="text-[32px] font-display italic text-text-primary tracking-tight">Initialize Task</h2>
                  </div>
                  <button onClick={closeQuickAdd} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors text-text-tertiary">
                    <X className="w-5 h-5" />
                  </button>
                </header>

                <div className="space-y-6">
                  <div className="space-y-3">
                     <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                       <ListTodo className="w-3.5 h-3.5" /> Neural Instruction
                     </p>
                     <textarea
                        autoFocus
                        rows={3}
                        value={form.task}
                        onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
                        placeholder="Define the objective..."
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-text-primary placeholder:text-text-dim focus:border-accent ring-accent/10 focus:ring-4 outline-none transition-all resize-none text-[15px]"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Sector Owner
                        </p>
                        <Input 
                          value={form.owner}
                          onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                          placeholder="Alias"
                          className="bg-white/[0.03]"
                        />
                     </div>
                     <div className="space-y-3">
                        <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Expiration
                        </p>
                        <Input 
                          type="date"
                          value={form.deadline}
                          onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                          className="bg-white/[0.03] [color-scheme:dark]"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                       <Zap className="w-3.5 h-3.5" /> Priority Class
                     </p>
                     <div className="flex gap-2">
                        {['low', 'medium', 'high'].map(p => (
                          <button
                            key={p}
                            onClick={() => setForm(f => ({ ...f, priority: p }))}
                            className={clsx(
                              "flex-1 h-12 rounded-xl font-mono text-[11px] uppercase tracking-widest border transition-all",
                              form.priority === p 
                                ? "bg-accent/20 border-accent/50 text-accent font-bold" 
                                : "bg-white/5 border-white/5 text-text-tertiary hover:bg-white/[0.08]"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>

                <Button
                  variant="accent"
                  className="w-full h-14 rounded-2xl text-[14px] font-mono font-bold uppercase tracking-[0.2em] shadow-2xl shadow-accent/20"
                  onClick={handleAdd}
                  disabled={loading}
                >
                  {loading ? 'Initializing...' : 'Establish Node'}
                </Button>
              </div>

              <div className="h-2 bg-gradient-to-r from-accent/50 via-accent to-accent/50 animate-pulse" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
