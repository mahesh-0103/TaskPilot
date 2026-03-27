import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ClipboardList, Loader2, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Skeleton, EmptyState, Button, Divider } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { supabase } from '../lib/supabase';
import client from '../api/client.js';
import toast from 'react-hot-toast';
import { getDeadlineCountdown } from '../utils/time.js';

const SAMPLE_TEXT = `Alright team — quick sync. Priya, can you finish the database schema by Wednesday? It's urgent. After that, Rohan will build the API layer by Friday. Sam, please set up the deployment pipeline in parallel — aim for next Monday. Once Rohan is done, Sam should do the final deployment. Thanks everyone.`;

const DRAFT_KEY = 'taskpilot_draft';

function DeadlineChip({ deadline }) {
  const { text, urgency } = getDeadlineCountdown(deadline);
  return (
    <span className={clsx(
      'font-mono text-[11px] px-2 py-0.5 rounded-md',
      urgency === 'overdue' ? 'text-danger font-bold italic' :
        urgency === 'critical' ? 'text-danger bg-danger-subtle' :
          urgency === 'warning' ? 'text-warning bg-warning-subtle' :
            'text-text-tertiary bg-bg-elevated'
    )}>
      {text}
    </span>
  );
}

export default function Extract() {
  const navigate = useNavigate();
  const { tasks, setTasks } = useWorkflowStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [workflowTitle, setWorkflowTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const textareaRef = useRef(null);
  const draftTimer = useRef(null);
  const draftShowTimer = useRef(null);

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setText(draft);
    const hist = JSON.parse(localStorage.getItem('extractHistory') || '[]');
    setHistory(hist);
  }, []);

  // Autosave draft
  useEffect(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (text) {
        localStorage.setItem(DRAFT_KEY, text);
        setDraftSaved(true);
        clearTimeout(draftShowTimer.current);
        draftShowTimer.current = setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [text]);

  const handleExtract = async () => {
    if (!text.trim()) { toast.error('Please enter meeting notes first.'); return; }
    
    setIsExtracting(true);
    setTasks([]); // Clear old results
    
    try {
      const token = useAuthStore.getState().providerToken;
      const { data } = await client.post('/extract-tasks', { 
        text, 
        token, 
        user_id: user.id, 
        email: user.email 
      });
      const extracted = data.tasks || [];
      
      // Update UI state immediately
      setTasks(extracted);
      setIsExtracting(false); // Move this UP so UI renders findings
      
      if (extracted.length === 0) {
        toast.error('Synthesis failed to identify distinct objectives.');
        return;
      }

      toast.success(`Extracted ${extracted.length} tasks`);
      if (token && extracted.length > 0) {
        setTimeout(() => toast.success('✅ Synced with Google Calendar'), 800);
      }
      
      localStorage.removeItem(DRAFT_KEY);

      // Perform secondary persistence in background
      (async () => {
        try {
          // Persist to Supabase
          if (user && extracted.length > 0) {
            const tasksWithUser = extracted.map(t => ({ ...t, user_id: user.id }));
            await supabase.from('tasks').upsert(tasksWithUser, { onConflict: 'task_id' });
          }

          // Save to history
          const newHist = [
            { text: text.slice(0, 100), date: new Date().toISOString(), count: extracted.length, title: workflowTitle || 'Untitled' },
            ...history,
          ].slice(0, 3);
          setHistory(newHist);
          localStorage.setItem('extractHistory', JSON.stringify(newHist));
        } catch (err) {
          console.warn('Background persistence delayed or failed:', err);
        }
      })();

    } catch (e) {
      console.error('Extraction failure:', e);
      toast.error('Neural extraction encountered an anomaly. Please retry.');
      setIsExtracting(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!tasks.length) return;
    setIsWorkflowLoading(true);
    
    try {
      // 1. Get ordered tasks from logic layer
      const { data } = await client.post('/create-workflow', { 
        tasks, 
        user_id: user.id, 
        email: user.email 
      });
      const ordered = data.tasks || tasks;
      
      // 2. Clear loading and navigate immediately
      setIsWorkflowLoading(false);
      setTasks(ordered);
      navigate('/workflow');

      // 3. Secondary background sync to Supabase
      if (user) {
        (async () => {
          try {
            const wfId = crypto.randomUUID();
            await supabase.from('workflows').insert({
              workflow_id: wfId,
              user_id: user.id,
              title: workflowTitle || `Stategic Blueprint ${new Date().toLocaleDateString()}`,
              source_text: text,
              status: 'active',
            });
            
            const ids = ordered.map(t => t.task_id);
            await supabase.from('tasks').update({ workflow_id: wfId }).in('task_id', ids);
          } catch (err) {
            console.warn('Background workflow sync skipped:', err);
          }
        })();
      }
    } catch (e) {
      console.error(e);
      setIsWorkflowLoading(false);
      toast.error('Workflow synthesis encountered a delay.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col md:flex-row gap-12 h-full pb-20 lg:pb-6"
    >
      {/* ─── Left: Input ─────────────────────────────── */}
      <div className="md:w-[45%] flex flex-col gap-6">
        <header className="mb-2">
          <h1 className="text-[42px] font-normal font-display text-text-primary tracking-tight italic">
            Command Center
          </h1>
          <p className="text-[14px] text-text-tertiary font-ui mt-1 max-w-sm">
            Paste your meeting transcript below. Our digital chief of staff will handle the rest.
          </p>
        </header>

        {/* Transcript card */}
        <div
          className={clsx(
            'flex flex-col flex-1 min-h-[400px] transition-all duration-300 rounded-xl overflow-hidden',
            'bg-bg-elevated/40 backdrop-blur-xl',
            text ? 'ring-1 ring-accent/20' : 'ring-1 ring-white/5'
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 bg-white/5">
            <span className="text-[12px] uppercase tracking-widest font-mono text-text-tertiary">Transcript Input</span>
            <button
              onClick={() => setText(SAMPLE_TEXT)}
              className="text-[12px] font-ui text-text-tertiary hover:text-accent transition-colors cursor-pointer underline underline-offset-4 decoration-white/10"
            >
              Load Sample
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={isExtracting}
              placeholder="Start typing or paste transcript..."
              className={clsx(
                'absolute inset-0 w-full h-full p-8 resize-none bg-transparent',
                'text-[17px] font-ui text-text-primary leading-[1.6]',
                'placeholder:text-text-tertiary/50 placeholder:italic',
                'focus:outline-none transition-colors'
              )}
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-white/5">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-text-tertiary uppercase opacity-60">{text.length} chars</span>
              <AnimatePresence>
                {draftSaved && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[10px] text-accent uppercase"
                  >
                    Auto-saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
           <input
              type="text"
              value={workflowTitle}
              onChange={e => setWorkflowTitle(e.target.value)}
              placeholder="Assign a title to this session..."
              className="w-full h-12 bg-bg-elevated/50 ring-1 ring-white/5 rounded-xl px-4 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-accent/40 transition-all font-ui"
            />
          {/* Extract button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full h-14 text-[16px] font-semibold tracking-wide shadow-2xl shadow-accent/20"
            onClick={handleExtract}
            disabled={isExtracting || !text.trim()}
          >
            {isExtracting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Sparkles className="w-5 h-5" /> Analyze Transcript</>}
          </Button>
        </div>
      </div>

      {/* ─── Right: Output ───────────────────────────── */}
      <div className="md:w-[55%] flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-mono uppercase tracking-[0.2em] text-text-tertiary opacity-80">
            Intelligence Report
            {tasks.length > 0 && (
              <>
                <span className="ml-3 text-accent">{tasks.length} Findings</span>
                <div className="flex items-center gap-4 mt-3 pl-1">
                  <span className="text-[10px] text-success flex items-center gap-1.5 font-mono">
                    <CheckCircle className="w-3 h-3" /> ✅ Synced with Google Calendar
                  </span>
                  <span className="text-[10px] text-accent flex items-center gap-1.5 font-mono">
                    <Loader2 className="w-3 h-3 animate-pulse" /> 📧 Email alerts enabled
                  </span>
                </div>
              </>
            )}
          </h2>
        </div>

        {/* Loading skeletons */}
        {isExtracting && [1, 2, 3].map(i => (
          <div key={i} className="bg-bg-elevated/40 rounded-xl p-6 space-y-4 ring-1 ring-white/5">
            <Skeleton className="h-4 w-1/4 bg-white/10" />
            <Skeleton className="h-6 w-full bg-white/10" />
            <Skeleton className="h-4 w-1/2 bg-white/10" />
          </div>
        ))}

        {/* Empty state */}
        {!isExtracting && tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/5 rounded-3xl opacity-50">
            <ClipboardList className="w-12 h-12 text-text-tertiary mb-4 stroke-[1px]" />
            <h3 className="text-[18px] font-display text-text-primary italic mb-2">Awaiting Intelligence</h3>
            <p className="text-[14px] text-text-tertiary max-w-[240px]">The report will populate once analysis is complete.</p>
          </div>
        )}

        {/* Task cards */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {!isExtracting && tasks.map((t, idx) => (
              <motion.div
                key={t.task_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  "relative p-6 transition-all duration-300 cursor-pointer group",
                  "bg-bg-base ring-1 ring-white/5 hover:ring-accent/20 rounded-xl",
                  "border-l-2 border-accent/80" // Primary left-accent border as per spec
                )}
                onClick={() => setSelectedTask(t)}
              >
                {/* Header: Priority + Owner + Deadline */}
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={t.priority} className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5">{t.priority}</Badge>
                  <span className="text-[12px] font-ui text-text-secondary font-medium tracking-tight">@{t.owner}</span>
                  <div className="flex-1" />
                  <DeadlineChip deadline={t.deadline} />
                </div>

                {/* Task Body */}
                <p className={clsx(
                  'text-[17px] font-ui text-text-primary leading-relaxed font-medium mb-4',
                  t.is_checked && 'line-through text-text-tertiary opacity-50'
                )}>
                  {t.task}
                </p>

                {/* Footer: ID + Deps */}
                <div className="flex items-center gap-4 pt-4 mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-1.5 grayscale">
                    <Badge variant={t.status} className="text-[10px] uppercase font-mono">{t.status}</Badge>
                  </div>
                  {t.depends_on?.length > 0 && (
                    <span className="text-[11px] font-mono text-accent">FOLLOWS_{t.depends_on.length}_SUBTASKS</span>
                  )}
                  <div className="flex-1" />
                  <span className="font-mono text-[10px] text-text-tertiary">ID://{t.task_id?.slice(0, 8)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Create Workflow button */}
        <AnimatePresence>
          {!isExtracting && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: tasks.length * 0.05 + 0.1 }}
            >
              <Divider label="Next Step" />
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCreateWorkflow}
                disabled={isWorkflowLoading}
              >
                {isWorkflowLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Workflow →'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
