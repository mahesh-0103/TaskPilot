import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ClipboardList, Loader2, CheckCircle, Search, Filter, MoreVertical, Terminal, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge, Skeleton, EmptyState, Button, Divider } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { client } from '../api/client';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Extract() {
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const { tasks, setTasks, loadTasks } = useWorkflowStore();
  const { user, providerToken } = useAuthStore();
  const [selectedTask, setSelectedTask] = useState(null);
  const navigate = useNavigate();
  const [extracted, setExtracted] = useState([]);

  useEffect(() => {
    // Clear transient tasks if we want a fresh extraction each time, 
    // or keep them if they were just extracted.
  }, []);

  const handleExtract = async () => {
    if (!text.trim()) return;
    setIsExtracting(true);
    setExtracted([]);

    try {
      // Propagation of user identity for multi-tenant extraction
      const { data } = await client.post('/extract-tasks', { 
        text, 
        token: providerToken, 
        user_id: user.id, 
        email: user.email 
      });
      
      const newTasks = data.tasks || [];
      setExtracted(newTasks);
      setTasks(newTasks); // Update the global store
      toast.success('Neural Entity Extraction Complete');

      // Async background persistence to Supabase
      (async () => {
        try {
          if (user && newTasks.length > 0) {
            const tasksWithUser = newTasks.map(t => ({ ...t, user_id: user.id }));
            await supabase.from('tasks').upsert(tasksWithUser, { onConflict: 'task_id' });
            
            // Log the extraction action
            await supabase.from('logs').insert({
              log_id: `ext-${Date.now()}`,
              user_id: user.id,
              action: 'Task Extracted',
              reason: `Neural parsing of ${newTasks.length} objectives.`,
              decision_trace: `Hashed: ${btoa(text.slice(0, 15))}`
            });
          }
        } catch (e) { console.error('BG Persistence Error:', e); }
      })();

    } catch (e) {
      toast.error('Extraction Failed: ' + (e.response?.data?.detail || e.message));
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
      <header className="flex items-center justify-between mb-12">
        <h1 className="text-[28px] font-display italic text-text-primary tracking-tight">Extract Intelligence</h1>
        <div className="flex items-center gap-6 text-text-tertiary">
           <div className="flex items-center gap-2 group cursor-pointer">
              <Search className="w-4 h-4 group-hover:text-text-primary transition-colors" />
              <span className="text-[11px] font-mono tracking-widest uppercase">Search Commands...</span>
           </div>
           <div className="flex gap-2">
             <div className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-tertiary hover:bg-white/5 cursor-pointer">+</div>
             <div className="w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center text-text-tertiary hover:bg-white/5 cursor-pointer italic text-[16px] font-display">?</div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-h-[600px]">
        {/* Input Pane - Data Ingestion */}
        <section className="space-y-6 flex flex-col h-full">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[24px] font-display text-text-primary italic">Data Ingestion</h2>
              <button onClick={() => setText('')} className="font-mono text-[11px] text-text-tertiary uppercase tracking-widest hover:text-text-primary transition-colors">Clear Input</button>
           </div>
           
           <div className="glass-sm rounded-[32px] p-8 grow flex flex-col border-white/5 shadow-2xl relative">
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[10px] text-text-dim uppercase tracking-[0.2em] font-semibold">Unstructured Source Text</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your meeting notes, Slack threads, or email narratives here..."
                className="w-full grow bg-transparent border-none focus:ring-0 text-text-primary font-ui text-[16px] leading-relaxed resize-none scroll-thin placeholder:opacity-20"
              />
              
              <div className="flex gap-4 mt-8">
                 <Button variant="secondary" onClick={insertSample} className="px-8 rounded-xl font-mono text-[11px] uppercase tracking-widest h-14 bg-white/5 border-white/10 hover:bg-white/10"><Terminal className="w-4 h-4 mr-2" /> Insert Sample</Button>
                 <Button 
                   variant="accent" 
                   onClick={handleExtract} 
                   disabled={isExtracting || !text.trim()}
                   className="grow rounded-xl font-mono text-[11px] uppercase tracking-widest h-14 shadow-lg shadow-accent/20"
                 >
                   {isExtracting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                   {isExtracting ? 'Extracting Entities...' : 'Extract Entities'}
                 </Button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="glass-sm p-6 rounded-3xl border-white/5">
                 <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Source Confidence</p>
                 <p className="text-[20px] font-display text-text-primary italic inline-flex items-center gap-2">98.2% <span className="text-[10px] font-mono text-accent not-italic uppercase">AI Scoring</span></p>
              </div>
              <div className="glass-sm p-6 rounded-3xl border-white/5">
                 <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Entities Detected</p>
                 <p className="text-[20px] font-display text-text-primary italic inline-flex items-center gap-2">{String(extracted.length).padStart(2, '0')} Tasks <span className="text-[10px] font-mono text-text-tertiary not-italic uppercase">3 Assignees</span></p>
              </div>
           </div>
        </section>

        {/* Output Pane - Extracted Output */}
        <section className="space-y-6 flex flex-col h-full">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                 <h2 className="text-[24px] font-display text-text-primary italic">Extracted Output</h2>
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
                    <p className="font-ui text-[16px]">Neural results will manifest here post-ingestion.</p>
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
                        <span className="font-mono text-[12px] text-text-secondary uppercase tracking-widest">TP-{task.task_id.slice(0, 3).toUpperCase()}</span>
                        <div className="flex items-center gap-3">
                           <Badge variant={task.priority} className="text-[9px] uppercase font-mono tracking-widest">{task.priority}</Badge>
                           <Badge className="text-[9px] uppercase font-mono tracking-widest bg-bg-surface text-text-tertiary">New</Badge>
                        </div>
                     </div>
                     <h3 className="text-[24px] font-display text-text-primary italic leading-snug mb-6 group-hover:text-accent transition-colors">{task.task}</h3>
                     
                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-accent text-[10px] text-white flex items-center justify-center font-mono">{task.owner.charAt(0)}</div>
                           <span className="text-[14px] text-text-secondary font-ui">{task.owner}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-tertiary">
                           <Clock className="w-4 h-4" />
                           <span className="font-mono text-[12px]">{task.deadline}</span>
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
             className="w-full rounded-none border border-white/10 h-16 font-mono text-[11px] uppercase tracking-[0.2em] group hover:bg-white/5"
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
