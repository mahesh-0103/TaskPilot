import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Download, Layout, Search, Filter, MoreHorizontal, Terminal, Activity, Zap, ArrowRight, Shield, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge, EmptyState, Button, Divider } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { supabase } from '../lib/supabase';

const TaskNode = ({ data, selected }) => (
  <div
    className={clsx(
      'glass-sm min-w-[280px] p-6 rounded-[24px] cursor-pointer transition-all border-l-4',
      selected ? 'ring-2 ring-accent ring-offset-4 ring-offset-[#060606] bg-white/[0.04]' : '',
      data.status === 'delayed' ? 'border-danger' : 
      data.status === 'completed' ? 'border-success' : 'border-accent',
    )}
  >
    <div className="flex items-center justify-between mb-4">
       <span className="font-mono text-[10px] text-accent tracking-widest uppercase">TP-{data.task_id.slice(0,3).toUpperCase()}</span>
       <Badge variant={data.status} className="font-mono text-[8px] uppercase">{data.status}</Badge>
    </div>
    <p className="text-[17px] font-ui text-text-primary leading-tight font-medium mb-3">{data.task}</p>
    <div className="flex items-center justify-between pt-3 border-t border-white/5 opacity-60">
       <span className="text-[11px] font-mono lowercase">@{data.owner}</span>
       <span className="text-[11px] font-mono uppercase">{data.deadline}</span>
    </div>
  </div>
);

const nodeTypes = { task: TaskNode };

function buildGraph(tasks) {
  const nodes = tasks.map((t, i) => ({
    id: t.task_id,
    type: 'task',
    position: { x: (i % 2) * 500, y: Math.floor(i / 2) * 200 },
    data: t,
  }));

  const edges = [];
  tasks.forEach(t => {
    (t.depends_on || []).forEach(depId => {
      edges.push({
        id: `${depId}-${t.task_id}`,
        source: depId,
        target: t.task_id,
        animated: true,
        style: { stroke: 'var(--accent)', strokeWidth: 2, opacity: 0.4 },
      });
    });
  });

  return { nodes, edges };
}

export default function Workflow() {
  const { tasks } = useWorkflowStore();
  const { user } = useAuthStore();
  const [view, setView] = useState('graph');
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    supabase.from('logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(4)
      .then(({ data }) => setLogs(data || []));
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = buildGraph(tasks);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const VIEWS = ['Graph', 'Table', 'Timeline'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-12 flex-wrap gap-8">
        <div className="space-y-2">
           <span className="font-mono text-[11px] text-text-tertiary tracking-[0.4em] uppercase">Active Workspace / <span className="text-accent underline cursor-pointer">Workflow</span></span>
           <h1 className="text-[56px] leading-tight font-display italic text-text-primary tracking-tight">Execution Pipeline</h1>
           <div className="flex gap-4 font-mono text-[10px] text-text-tertiary tracking-widest uppercase items-center">
              <span>System_Status: <span className="text-success">Operational</span></span>
              <span>//</span>
              <span>{tasks.length} Nodes Active</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-white/5 rounded-2xl p-1 gap-1 border border-white/5">
              {VIEWS.map(v => (
                 <button
                   key={v}
                   onClick={() => setView(v.toLowerCase())}
                   className={clsx(
                     'px-8 py-2.5 text-[11px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer',
                     view === v.toLowerCase() ? 'bg-accent text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'
                   )}
                 >{v}</button>
              ))}
           </div>
           <Button variant="ghost" className="w-10 h-10 rounded-xl bg-white/5 p-0">+</Button>
           <Button variant="ghost" className="w-10 h-10 rounded-xl bg-white/5 p-0 italic">?</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Pipeline Viewer */}
        <div className="lg:col-span-8 relative">
           <div className="glass-sm rounded-[40px] h-[650px] overflow-hidden border-white/5 shadow-inner">
             <ReactFlow
               nodes={nodes}
               edges={edges}
               onNodesChange={onNodesChange}
               onEdgesChange={onEdgesChange}
               nodeTypes={nodeTypes}
               onNodeClick={(_, node) => setSelectedTask(node.data)}
               fitView
             >
               <Background color="var(--border-subtle)" gap={48} size={1} opacity={0.3} />
               <Controls showInteractive={false} className="!bg-[#121212] !border-white/10 !rounded-xl !shadow-2xl" />
             </ReactFlow>

             {/* Audit Trail Overlay */}
             <div className="absolute top-8 right-8 w-[320px] glass-elevated rounded-[32px] p-8 border-white/10 pointer-events-none z-10 space-y-8 bg-[#0A0A0A]/95 shadow-2xl">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                   <h3 className="font-mono text-[11px] text-text-tertiary tracking-[0.2em] uppercase">Audit Trail</h3>
                   <Filter className="w-4 h-4 text-text-dim" />
                </div>
                <div className="space-y-10">
                   {logs.map((log, i) => (
                     <div key={i} className="flex gap-6 relative group">
                        {i < logs.length - 1 && <div className="absolute left-[3px] top-4 bottom-[-30px] w-[1.5px] bg-white/5" />}
                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5 ring-4 ring-bg-base z-10" />
                        <div>
                           <span className="font-mono text-[11px] text-accent block mb-1">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                           <h4 className="text-[13px] font-semibold text-text-secondary uppercase mb-1 leading-snug">{log.action || 'Sequence Initiated'}</h4>
                           <p className="text-[12px] text-text-tertiary font-ui leading-relaxed">{log.reason || 'Handshake protocol established with remote cluster-node.'}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           </div>
        </div>

        {/* Node Detail / Sidebar Sidebar Logic */}
        <div className="lg:col-span-4 space-y-10">
           <section className="glass-sm p-10 rounded-[40px] border-white/5 space-y-10 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-2">
                 <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase italic underline underline-offset-4">Node Detail</span>
                 <button onClick={() => setSelectedTask(null)} className="text-text-tertiary hover:text-text-primary transition-colors">×</button>
              </div>
              
              <div className="space-y-1">
                 <h2 className="text-[42px] leading-tight font-display italic text-text-primary tracking-tight">Raw Data Extraction</h2>
                 <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-widest">Process ID: OX-992-DELTA</p>
              </div>

              <div className="space-y-4">
                 <span className="font-mono text-[9px] text-text-tertiary tracking-[0.2em] uppercase">Node Performance</span>
                 <div className="h-24 glass-sm rounded-2xl flex items-end justify-center p-4 relative overflow-hidden">
                    {/* Fake Chart */}
                    <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-accent opacity-60">
                       <path d="M0,35 Q10,15 25,25 T50,5 T75,25 T100,10" strokeLinecap="round" />
                    </svg>
                    <div className="absolute top-4 left-4 font-mono text-[9px] text-text-tertiary uppercase">Throughput: 1.2 GB/s</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="glass-sm p-6 rounded-3xl border-white/5">
                    <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Latency</p>
                    <p className="text-[20px] font-display text-text-primary italic">12ms</p>
                 </div>
                 <div className="glass-sm p-6 rounded-3xl border-white/5">
                    <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Reliability</p>
                    <p className="text-[20px] font-display text-text-primary italic">99.9%</p>
                 </div>
              </div>

              <div className="space-y-4 pt-10 border-t border-white/5">
                 <span className="font-mono text-[9px] text-text-tertiary tracking-[0.2em] uppercase">Connected Clusters</span>
                 <div className="flex flex-wrap gap-2">
                    {['AWS-EAST-1', 'LOCAL-VM-2', 'DOCKER-EXT-A'].map(c => (
                       <Badge key={c} variant="ghost" className="font-mono text-[8px] tracking-tighter ring-1 ring-white/5 bg-transparent">{c}</Badge>
                    ))}
                 </div>
              </div>
           </section>

           <Button variant="accent" className="w-full h-20 rounded-[28px] shadow-[0_20px_60px_rgba(37,99,235,0.3)] font-mono text-[13px] uppercase tracking-[0.4em] ring-offset-[#060606] hover:ring-8 ring-accent/10">
              <Zap className="w-5 h-5 mr-3" /> Trigger Manual Override
           </Button>
        </div>
      </div>
    </motion.div>
  );
}
