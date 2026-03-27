import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Download } from 'lucide-react';
import { clsx } from 'clsx';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge, EmptyState, Button } from '../components/ui/index.jsx';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';
import useWorkflowStore from '../store/workflowStore';
import useAuthStore from '../store/authStore';
import { supabase } from '../lib/supabase';
import { getLogs } from '../api/taskpilot.js';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

function TaskNode({ data }) {
  return (
    <div
      className={clsx(
        'glass-sm w-[200px] p-3 cursor-pointer',
        data.status === 'delayed' && 'border-l-2 border-danger',
        data.status === 'completed' && 'border-l-2 border-success',
        data.status === 'pending' && 'border-l-2 border-accent',
      )}
    >
      <p className="font-mono text-[11px] text-text-tertiary mb-1">{data.owner}</p>
      <p className="text-[13px] font-semibold text-text-primary line-clamp-2 leading-snug">{data.task}</p>
      <div className="mt-2">
        <Badge variant={data.status}>{data.status}</Badge>
      </div>
    </div>
  );
}

const nodeTypes = { task: TaskNode };

function buildGraph(tasks) {
  const nodes = tasks.map((t, i) => ({
    id: t.task_id,
    type: 'task',
    position: { x: (i % 3) * 260, y: Math.floor(i / 3) * 140 },
    data: t,
  }));

  const edges = [];
  tasks.forEach(t => {
    (t.depends_on || []).forEach(depId => {
      edges.push({
        id: `${depId}-${t.task_id}`,
        source: depId,
        target: t.task_id,
        style: { stroke: 'var(--border-default)' },
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

  // Also fetch from Supabase in case page was refreshed
  const { data: dbTasks = [] } = useQuery({
    queryKey: ['workflow-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!user && tasks.length === 0,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('logs').select('*').eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Only use current transient extracted tasks for workflow creation
  const displayTasks = tasks;
  const { nodes: initialNodes, edges: initialEdges } = buildGraph(displayTasks);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleExport = () => {
    const deps = displayTasks.flatMap(t =>
      (t.depends_on || []).map(d => `${t.task_id} → depends on → ${d}`)
    );
    const logLines = logs.map(l =>
      `${l.timestamp || ''} | ${l.action || ''} | ${l.reason || ''}`
    );

    const content = [
      '=== TASKPILOT WORKFLOW EXPORT ===',
      `Exported: ${new Date().toISOString()}`,
      '--------------------------------',
      `TASKS (${displayTasks.length}):`,
      ...displayTasks.map(t =>
        `[${t.priority?.toUpperCase()}] ${t.task}\n  Owner: ${t.owner} | Due: ${t.deadline} | Status: ${t.status}\n  ID: ${t.task_id}`
      ),
      '--------------------------------',
      'DEPENDENCIES:',
      ...(deps.length ? deps : ['(none)']),
      '--------------------------------',
      'AUDIT LOG:',
      ...(logLines.length ? logLines : ['(no entries)']),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskpilot-workflow-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const VIEWS = ['Graph', 'Table', 'Timeline'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-12 pb-20 lg:pb-6"
    >
      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-8 border-b-0">
        <div className="space-y-1">
          <h1 className="text-[48px] font-normal font-display text-text-primary tracking-tight leading-tight italic">
            Strategic Blueprint
          </h1>
          <p className="text-[14px] text-text-tertiary font-ui tracking-wide">
            {displayTasks.length} {displayTasks.length === 1 ? 'Objective' : 'Parallel Objectives'} Parsed and Sequenced
          </p>
        </div>

        <div className="flex items-center gap-6 pb-2">
          {/* View switcher - Sophisticated Minimalist */}
          <div className="flex bg-white/5 rounded-full p-1 ring-1 ring-white/10 backdrop-blur-xl">
            {VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v.toLowerCase())}
                className={clsx(
                  'px-6 py-2 text-[12px] font-mono uppercase tracking-widest rounded-full transition-all duration-300 cursor-pointer',
                  view === v.toLowerCase()
                    ? 'bg-accent text-white shadow-lg'
                    : 'text-text-tertiary hover:text-text-primary'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="lg" onClick={handleExport} className="rounded-full ring-1 ring-white/10 hover:ring-accent/40 bg-transparent">
            <Download className="w-4 h-4 mr-2" /> Export Directive
          </Button>
        </div>
      </header>

      {displayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 text-center border border-dashed border-white/5 rounded-[40px] opacity-40">
           <GitBranch className="w-16 h-16 text-text-tertiary mb-6 stroke-[1px]" />
           <h2 className="text-[24px] font-display text-text-primary mb-2 italic">Blueprint Empty</h2>
           <p className="text-[15px] font-ui text-text-tertiary">Begin by analyzing a transcript in the Command Center.</p>
        </div>
      ) : (
        <>
          {/* Graph view */}
          {view === 'graph' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-bg-elevated/20 ring-1 ring-white/5 h-[650px] overflow-hidden rounded-[40px] backdrop-blur-sm shadow-inner"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                onNodeClick={(_, node) => setSelectedTask(node.data)}
              >
                <Background color="var(--border-subtle)" gap={40} size={1} opacity={0.3} />
                <Controls showInteractive={false} className="!bg-bg-elevated !border-white/10 !rounded-xl !shadow-2xl" />
              </ReactFlow>
            </motion.div>
          )}

          {/* Table view - Editorial Spreadsheet Style */}
          {view === 'table' && (
            <div className="bg-bg-elevated/10 rounded-[40px] overflow-hidden ring-1 ring-white/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    {['Objective', 'Assignee', 'Maturity', 'Priority', 'Timeline'].map(h => (
                      <th key={h} className="px-10 py-6 text-[11px] font-mono text-text-tertiary uppercase tracking-[0.2em] font-medium border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayTasks.map(t => (
                    <tr
                      key={t.task_id}
                      className="group hover:bg-white/[0.03] cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedTask(t)}
                    >
                      <td className="px-10 py-8">
                        <p className="text-[17px] font-ui text-text-primary font-medium group-hover:text-accent transition-colors leading-relaxed">{t.task}</p>
                        <p className="text-[10px] font-mono text-text-tertiary mt-1 uppercase tracking-wider opacity-60">ID_SPEC: {t.task_id?.slice(0, 8)}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[14px] font-ui text-text-secondary">@{t.owner}</span>
                      </td>
                      <td className="px-10 py-8">
                        <Badge variant={t.status} className="font-mono text-[9px] uppercase tracking-widest">{t.status}</Badge>
                      </td>
                      <td className="px-10 py-8">
                        <Badge variant={t.priority} className="font-mono text-[9px] uppercase tracking-widest">{t.priority}</Badge>
                      </td>
                      <td className="px-10 py-8 font-mono text-[13px] text-text-secondary italic">
                        {t.deadline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Timeline view - Editorial Stream */}
          {view === 'timeline' && (
            <div className="relative py-12 max-w-4xl mx-auto">
              <div className="absolute left-[30px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="space-y-16">
                {displayTasks.map((t, i) => (
                  <motion.div
                    key={t.task_id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-16"
                  >
                    {/* Date label column */}
                    <div className="w-[120px] pt-1 flex-shrink-0 text-right">
                      <p className="font-mono text-[13px] text-accent italic">{t.deadline}</p>
                      <p className="text-[10px] font-mono text-text-tertiary uppercase mt-1 tracking-widest opacity-60">Target</p>
                    </div>

                    {/* Dot */}
                    <div className="relative z-10 pt-2 flex-shrink-0">
                      <div className={clsx(
                        'w-3.5 h-3.5 rounded-full ring-4 ring-bg-base ring-offset-bg-base',
                        t.status === 'delayed' ? 'bg-danger shadow-[0_0_12px_rgba(239,68,68,0.5)]' :
                          t.status === 'completed' ? 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.5)]' :
                            'bg-accent shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                      )} />
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 bg-bg-base ring-1 ring-white/5 p-8 rounded-3xl hover:ring-accent/20 transition-all cursor-pointer group hover:-translate-y-1"
                      onClick={() => setSelectedTask(t)}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant={t.priority} className="text-[9px] uppercase font-mono tracking-widest">{t.priority}</Badge>
                        <span className="text-[13px] font-ui text-text-tertiary">@{t.owner}</span>
                      </div>
                      <p className="text-[20px] font-ui text-text-primary leading-snug font-medium mb-4">{t.task}</p>
                      <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Badge variant={t.status} className="text-[10px] uppercase font-mono">{t.status}</Badge>
                        <span className="text-[11px] font-mono text-text-tertiary ml-auto uppercase tracking-wider">REF_ID: {t.task_id?.slice(0, 8)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
