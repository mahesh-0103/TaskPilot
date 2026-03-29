import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ClipboardList, Loader2, CheckCircle, Search, Filter, MoreVertical, Terminal, ArrowRight, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Skeleton, EmptyState, Button, Divider } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { CONFIG } from '../config';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

import { apiRequest } from '../lib/api';

export default function Extract() {
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const { tasks, setTasks, loadTasks } = useWorkflowStore();
  const { user, providerToken } = useAuthStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const navigate = useNavigate();
  const [extracted, setExtracted] = useState([]);
  
  useEffect(() => {
    // Strategic state reset on mount to avoid stale manifests
    setExtracted([]);
  }, []);

  const handleExtract = async () => {
    if (!user) {
      toast.error('Identity required for neural extraction.');
      navigate('/auth');
      return;
    }
    if (!text.trim()) { toast('Empty input detected.', { icon: '⚠️' }); return; }
    
    setIsExtracting(true);
    setExtracted([]);

    try {
      const data = await apiRequest('/tasks/extract-tasks', { 
        text, 
        user_id: user.id,
        token: providerToken 
      });
      
      const newTasks = Array.isArray(data?.tasks) ? data.tasks : [];
      if (newTasks.length > 0) {
        toast.promise(
          new Promise(resolve => {
            setTasks(newTasks);
            setExtracted(newTasks);
            setTimeout(resolve, 800);
          }), 
          {
            loading: 'Committing Strategic Nodes...',
            success: 'Nodes Manifested. Redirecting...',
            error: 'Manifest failed'
          }
        ).then(() => navigate('/workflow'));
      } else {
        toast.error('Neural model returned no actionable intents.');
      }
    } catch (e) {
      toast.error('Extraction Interrupted: ' + e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const insertSample = () => {
    setText("Subject: Project Alpha Update - Dec 12\n\nHi Team, we need to finalize the architectural review for the sovereign workspace by Friday. Mark, please ensure the security audit is completed and uploaded to the portal (TP-882). Sarah, can you sync with the UI team to confirm the Geist font license is active? Deadline for both is EOD Thursday. Also, we need a status check on the background worker migration for the production environment.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-12 flex-wrap gap-8">
        <div className="space-y-2">
           <span className="font-mono text-[11px] text-text-secondary tracking-[0.4em] uppercase font-bold">Task AI // <span className="text-accent underline cursor-pointer">Live</span></span>
           <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Convert Text to Tasks</h1>
            <div className="flex gap-4 font-mono text-[10px] text-text-secondary tracking-widest uppercase items-center">
               <span>Entropy Level: <span className="text-secondary font-bold">Stable</span></span>
               <span className="opacity-20">//</span>
               <span>Neural Precision: <span className="text-accent font-bold">Optimal</span></span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-h-[600px]">
        {/* Input Pane - Data Ingestion */}
        <section className="space-y-6 flex flex-col h-full">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[26px] font-display text-text-primary italic">Data Ingestion</h2>
              <button onClick={() => setText('')} className="font-mono text-[12px] text-text-tertiary uppercase tracking-widest hover:text-text-primary transition-colors font-medium">Clear Input</button>
           </div>
           
           <div className="glass-sm rounded-[32px] p-8 grow flex flex-col border-white/5 shadow-2xl relative">
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[11px] text-text-secondary uppercase tracking-[0.2em] font-bold">Unstructured Source Text</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your meeting notes, Slack threads, or email narratives here..."
                className="w-full grow bg-transparent border-none focus:ring-0 text-text-primary font-ui text-[17px] leading-relaxed resize-none scroll-thin placeholder:opacity-20"
              />
              
              <div className="flex gap-4 mt-8">
                <Button variant="secondary" onClick={insertSample} className="px-8 rounded-xl font-mono text-[12px] uppercase tracking-widest h-14 bg-white/5 border-white/10 hover:bg-white/10 font-bold"><Terminal className="w-4 h-4 mr-2" /> Insert Sample</Button>
                <Button 
                  variant="accent" 
                  onClick={handleExtract} 
                  disabled={isExtracting || !text.trim()}
                  className="grow rounded-xl font-mono text-[12px] uppercase tracking-widest h-14 shadow-lg shadow-accent/20 font-bold"
                >
                  {isExtracting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isExtracting ? 'Neural Deep Scan...' : 'Neural Deep Scan'}
                </Button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="glass-sm p-6 rounded-3xl border-white/5">
                 <p className="text-[11px] font-mono text-text-tertiary uppercase tracking-widest mb-2 font-bold">Source Confidence</p>
                 <p className="text-[22px] font-display text-text-primary italic inline-flex items-center gap-2 font-semibold">98.2% <span className="text-[11px] font-mono text-accent not-italic uppercase font-bold">AI Scoring</span></p>
              </div>
              <div className="glass-sm p-6 rounded-3xl border-white/5">
                 <p className="text-[11px] font-mono text-text-tertiary uppercase tracking-widest mb-2 font-bold">Entities Detected</p>
                 <p className="text-[22px] font-display text-text-primary italic inline-flex items-center gap-2 font-semibold">{String(extracted.length).padStart(2, '0')} Tasks <span className="text-[11px] font-mono text-text-tertiary not-italic uppercase font-bold">3 Assignees</span></p>
              </div>
           </div>
        </section>

        {/* Output Pane - Extracted Output */}
        <section className="space-y-6 flex flex-col h-full">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                 <h2 className="text-[26px] font-display text-text-primary italic">Extracted Output</h2>
              </div>
              <div className="flex items-center gap-4">
                 <Filter className="w-4 h-4 text-text-tertiary" />
                 <MoreVertical className="w-4 h-4 text-text-tertiary" />
              </div>
           </div>

           <div className="grow overflow-y-auto pr-2 space-y-4 scroll-thin min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {isExtracting && (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-sm p-8 rounded-[32px] border-white/5 animate-pulse">
                       <div className="h-4 w-24 bg-white/5 rounded-full mb-4" />
                       <div className="h-8 w-3/4 bg-white/5 rounded-lg mb-6" />
                       <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                    </div>
                  ))
                )}

                {!isExtracting && extracted.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-20 px-8 text-center bg-white/[0.01] rounded-[40px] border border-dashed border-white/10">
                    <Sparkles className="w-16 h-16 mb-4" />
                    <p className="font-ui text-[18px]">Neural results will manifest here post-ingestion.</p>
                  </div>
                )}

                {!isExtracting && extracted.map((task, i) => (
                   <motion.div
                     key={task.task_id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className="glass-sm p-8 rounded-[32px] border-white/5 hover:bg-white/[0.04] transition-all group relative border-l-4 border-accent"
                   >
                     <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-[13px] text-text-secondary uppercase tracking-widest font-bold">TP-{task.task_id.slice(0, 3).toUpperCase()}</span>
                        <div className="flex items-center gap-3">
                           <Badge variant={task.priority} className="text-[10px] uppercase font-mono tracking-widest font-bold px-2">{task.priority}</Badge>
                           <Badge className="text-[10px] uppercase font-mono tracking-widest bg-bg-surface text-text-tertiary font-bold px-2">New</Badge>
                        </div>
                     </div>
                     <h3 className="text-[26px] font-display text-text-primary italic leading-snug mb-6 group-hover:text-accent transition-colors">{task.task}</h3>
                     
                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-full bg-accent text-[11px] text-white flex items-center justify-center font-mono font-bold shadow-lg shadow-accent/20">{task.owner?.charAt(0) || '?'}</div>
                           <span className="text-[15px] text-text-secondary font-ui font-medium">{task.owner}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-tertiary">
                           <Clock className="w-4 h-4" />
                           <span className="font-mono text-[13px] font-medium">{task.deadline}</span>
                        </div>
                     </div>
                   </motion.div>
                ))}
              </AnimatePresence>
           </div>

           <Button 
             variant="ghost" 
             onClick={() => navigate('/workflow')}
             disabled={extracted.length === 0}
             className="w-full rounded-none border border-white/10 h-16 font-mono text-[12px] uppercase tracking-[0.2em] group hover:bg-white/5 font-bold"
           >
             Create Workflow <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-2 transition-transform" />
           </Button>
        </section>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
