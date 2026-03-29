import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, List, Zap, RefreshCw, Trash2, Globe, Calendar as CalIcon, Mail, CheckCircle2, Share2, Clock, AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Input, Badge, Divider } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';

export default function Workflow() {
  const { user, providerToken } = useAuthStore();
  const { tasks, loadTasks, updateTask: updateStoreTask } = useWorkflowStore();
  const [view, setView] = useState('grid'); 
  const [selectedTask, setSelectedTask] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (user?.id) {
        // Efficiency: prioritizes store state from Extraction to avoid race conditions
        loadTasks(user.id, false);
    }
  }, [user?.id]);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await apiRequest('/execution/execute-tasks', { tasks: tasks.filter(t => t.status === 'pending') });
      toast.success('Dispatches executed successfully.');
      loadTasks();
    } catch (e) {
      toast.error('Execution Interrupted: ' + e.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
       // Using optimistic update from store
       await updateStoreTask(taskId, updates);
       toast.success('Directive Updated');
       
       if (selectedTask?.task_id === taskId) {
         setSelectedTask(prev => ({ ...prev, ...updates }));
       }
    } catch (e) {
       toast.error('Sync failed');
    }
  };

  const handleSyncCalendar = async (task) => {
    try {
      const datePart = task.deadline ? task.deadline.split('T')[0] : new Date().toISOString().split('T')[0];
      const timePart = task.due_time || '09:00';
      const startStr = `${datePart}T${timePart}:00Z`;
      
      const d = new Date(startStr);
      if (isNaN(d.getTime())) {
        throw new Error('Neural date format is corrupt. Please re-assign.');
      }
      const end = new Date(d.getTime() + 3600000).toISOString();
      
      await apiRequest('/calendar/create-event', {
        task_id: task.task_id,
        user_id: user.id,
        summary: task.task,
        description: `Strategic Dispatch: ${task.task}\nPriority: ${task.priority}`,
        start_time: startStr,
        end_time: end,
        token: providerToken
      });
      await loadTasks();
      toast.success('Orbit Synchronized with Google Calendar');
    } catch (e) {
      toast.error('Calendar Sync Failed: ' + e.message);
    }
  };

  const handleSendEmail = async (task) => {
     try {
       await apiRequest('/monitor/simulate-delay', { 
         task_id: task.task_id, 
         token: providerToken 
       });
       toast.success('Escalation Sequence Dispatched');
       await loadTasks();
     } catch (e) {
       toast.error('Dispatch Failed: ' + e.message);
     }
  };

  const nodes = useMemo(() => (tasks || []).map((t, i) => ({
    id: t.task_id,
    data: { label: t.task },
    position: { x: 250 * (i % 3), y: 150 * Math.floor(i / 3) },
    style: { 
      background: t.status === 'completed' ? '#10b98115' : t.status === 'delayed' ? '#ef444415' : '#3b82f615',
      color: 'white',
      border: `1px solid ${t.status === 'completed' ? '#10b98140' : t.status === 'delayed' ? '#ef444440' : '#3b82f640'}`,
      borderRadius: '24px',
      padding: '16px',
      fontSize: '11px',
      fontWeight: '500',
      fontFamily: 'inherit',
      width: 220,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }
  })), [tasks]);

  const edges = useMemo(() => tasks.flatMap(t => 
    (t.depends_on || []).map(depId => ({
      id: `e-${depId}-${t.task_id}`,
      source: depId,
      target: t.task_id,
      animated: t.status === 'pending',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      style: { stroke: '#2563eb', strokeWidth: 2 }
    }))
  ), [tasks]);

  const actualSelectedTask = useMemo(() => 
    selectedTask ? tasks.find(t => t.task_id === selectedTask.task_id) : null,
    [tasks, selectedTask]
  );

  const [riskLevel, setRiskLevel] = useState('low');

  useEffect(() => {
    if (user?.id) {
        loadTasks(user.id);
        const fetchRisk = async () => {
           try {
              const res = await apiRequest(`/monitor/risk/${user.id}`);
              setRiskLevel(res.level || 'low');
           } catch (e) {
              console.error(e);
           }
        };
        fetchRisk();
    }
  }, [user]);

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    try {
      await apiRequest('/execution/execute-workflow', { 
        user_id: user.id, 
        token: providerToken 
      });
      toast.success('Sovereign Workflow Activated: Auto-scheduling complete.');
      // Refresh tasks after scheduling
      loadTasks(user.id);
    } catch (e) {
      toast.error('Activation Interrupted: ' + e.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20 space-y-10 w-full">
      <header className="flex items-center justify-between flex-wrap gap-6 px-4">
        <div className="space-y-1">
          <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase font-bold">Auto-Pilot // Systems</span>
          <h1 className="text-[42px] leading-tight font-display italic text-text-primary tracking-tight">Tasks Dashboard</h1>
          <div className="flex gap-4 font-mono text-[9px] text-text-secondary tracking-widest uppercase items-center">
            <span>System Health: <span className="text-success font-bold">100%</span></span>
            <span className="opacity-20">//</span>
            <span>Deadline Risk: <span className={clsx("font-bold", riskLevel === 'high' ? "text-danger" : riskLevel === 'medium' ? "text-warning" : "text-info")}>{riskLevel.toUpperCase()}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="accent" 
             onClick={handleExecuteWorkflow} 
             disabled={isExecuting} 
             className="h-12 px-8 rounded-2xl bg-accent text-white font-mono text-[11px] uppercase tracking-[0.3em] font-bold shadow-[0_15px_30px_rgba(37,99,235,0.3)] hover:scale-[1.05] active:scale-95 transition-all"
           >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin mr-3" /> : <Zap className="w-4 h-4 mr-3" />}
              Establish & Execute Workflow
           </Button>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
             <button onClick={() => setView('grid')} className={clsx("p-2 rounded-lg transition-all", view === 'grid' ? "bg-white/10 text-white shadow-lg" : "text-text-tertiary hover:text-text-primary")}><LayoutGrid className="w-3.5 h-3.5" /></button>
             <button onClick={() => setView('table')} className={clsx("p-2 rounded-lg transition-all", view === 'table' ? "bg-white/10 text-white shadow-lg" : "text-text-tertiary hover:text-text-primary")}><List className="w-3.5 h-3.5" /></button>
             <button onClick={() => setView('network')} className={clsx("p-2 rounded-lg transition-all", view === 'network' ? "bg-white/10 text-white shadow-lg" : "text-text-tertiary hover:text-text-primary")}><Globe className="w-3.5 h-3.5" /></button>
           </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-10 min-h-[700px]">
        {/* Main Content Area */}
        <div className={clsx("flex-1 transition-all duration-500", actualSelectedTask ? "lg:w-[60%]" : "w-full")}>
          {view === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {(tasks || []).map(t => (
                <motion.div 
                  key={t.task_id}
                  layout
                  className={clsx(
                    "glass-sm p-5 rounded-[24px] border border-white/5 hover:border-accent/40 transition-all group flex flex-col justify-between cursor-pointer",
                    actualSelectedTask?.task_id === t.task_id && "ring-2 ring-accent border-accent/50 bg-accent/[0.03]"
                  )}
                  onClick={() => setSelectedTask(t)}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <Badge variant={t.status} className="uppercase text-[8px] tracking-widest px-2 py-0.5">{t.status}</Badge>
                       <div className="flex -space-x-2">
                         {t.owner?.split(',').map((o, idx) => (
                           <div key={idx} className="w-7 h-7 rounded-lg bg-bg-surface border border-white/10 flex items-center justify-center font-mono text-[9px] text-text-secondary shadow-lg" title={o.trim()}>
                             {o.trim().charAt(0).toUpperCase()}
                           </div>
                         ))}
                       </div>
                    </div>
                    <h3 className="text-[16px] font-display italic text-text-primary leading-tight line-clamp-2 min-h-[40px] group-hover:text-accent transition-colors">{t.task}</h3>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                       <Clock className="w-3 h-3 text-text-tertiary" />
                       <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-tighter">
                        {t.deadline ? t.deadline.split('T')[0] : 'N/A'} <span className="opacity-30 mx-1">/</span> <span className="text-accent">{t.due_time}</span>
                       </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 grid grid-cols-5 gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleTaskUpdate(t.task_id, { status: 'completed' }); }}
                       className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-success/10 group/btn transition-all"
                       title="Mark as Completed"
                     >
                        <CheckCircle2 className="w-3.5 h-3.5 text-text-tertiary group-hover/btn:text-success" />
                        <span className="text-[7px] font-mono uppercase tracking-widest text-text-tertiary">DONE</span>
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleTaskUpdate(t.task_id, { status: 'delayed' }); }}
                       className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-danger/10 group/btn transition-all"
                       title="Mark as Delayed"
                     >
                        <AlertTriangle className="w-3.5 h-3.5 text-text-tertiary group-hover/btn:text-danger" />
                        <span className="text-[7px] font-mono uppercase tracking-widest text-text-tertiary">WAIT</span>
                     </button>
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         const newOwner = prompt('Reassign to operator:', t.owner);
                         if (newOwner) handleTaskUpdate(t.task_id, { owner: newOwner });
                       }}
                       className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/10 group/btn transition-all"
                       title="Reassign Task"
                     >
                        <Share2 className="w-3.5 h-3.5 text-text-tertiary group-hover/btn:text-accent" />
                        <span className="text-[7px] font-mono uppercase tracking-widest text-text-tertiary">OPER</span>
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleSyncCalendar(t); }}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 group/btn transition-all"
                        title="Sync to Calendar"
                     >
                        <CalIcon className="w-3.5 h-3.5 text-text-tertiary group-hover/btn:text-white" />
                        <span className="text-[7px] font-mono uppercase tracking-widest text-text-tertiary">SYNC</span>
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleSendEmail(t); }}
                       className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-info/10 group/btn transition-all"
                       title="Send Escalation"
                     >
                        <Mail className="w-3.5 h-3.5 text-text-tertiary group-hover/btn:text-info" />
                        <span className="text-[7px] font-mono uppercase tracking-widest text-text-tertiary">MAIL</span>
                     </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {view === 'network' && (
            <div className="h-[800px] glass-sm rounded-[42px] border-white/5 relative overflow-hidden bg-white/[0.01]">
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#ffffff05" gap={20} />
                <Controls className="react-flow-controls" style={{ filter: 'invert(1)' }} />
              </ReactFlow>
            </div>
          )}

          {view === 'table' && (
            <div className="glass-sm rounded-[42px] border-white/5 overflow-hidden bg-white/[0.01]">
              <div className="p-8 overflow-auto h-full max-h-[800px] scroll-thin">
                <table className="w-full text-left font-mono text-[12px] text-text-secondary border-collapse">
                   <thead className="text-text-tertiary uppercase tracking-widest border-b border-white/5 sticky top-0 bg-bg-surface/80 backdrop-blur-md z-10">
                     <tr>
                        <th className="pb-6 px-4">Directives</th>
                        <th className="pb-6 px-4">Status</th>
                        <th className="pb-6 px-4">Operator</th>
                        <th className="pb-6 px-4">Temporal</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {(tasks || []).map(t => (
                       <tr 
                        key={t.task_id} 
                        className={clsx(
                          "hover:bg-white/[0.02] cursor-pointer group transition-colors",
                          actualSelectedTask?.task_id === t.task_id && "bg-accent/5"
                        )} 
                        onClick={() => setSelectedTask(t)}
                       >
                          <td className="py-5 px-4 font-ui text-[14px] text-white font-medium group-hover:text-accent transition-colors">{t.task}</td>
                          <td className="py-5 px-4"><Badge variant={t.status} className="uppercase text-[9px]">{t.status}</Badge></td>
                          <td className="py-5 px-4 uppercase text-text-dim">@{t.owner}</td>
                          <td className="py-5 px-4 font-mono text-[11px] opacity-40 group-hover:opacity-100 transition-opacity">
                             {t.deadline ? t.deadline.split('T')[0] : 'N/A'} <span className="text-accent ml-2">{t.due_time}</span>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Selected Task Side Panel Compensation */}
        <AnimatePresence>
          {actualSelectedTask && (
            <TaskDetailPanel 
              task={actualSelectedTask} 
              onClose={() => setSelectedTask(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
