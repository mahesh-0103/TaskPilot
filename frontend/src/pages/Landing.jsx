import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Sparkles, GitBranch, Activity, RefreshCw, ScrollText
} from 'lucide-react';
import logo from '../assets/logo.png';

const STEPS = [
  {
    n: '01', icon: FileText, title: 'Input Transcript',
    body: 'Paste raw meeting notes — any format, any length.',
    api: 'POST /extract-tasks',
  },
  {
    n: '02', icon: Sparkles, title: 'AI Extraction',
    body: 'Gemini identifies every action item, owner, deadline and priority from natural language.',
    api: 'POST /extract-tasks',
  },
  {
    n: '03', icon: GitBranch, title: 'Workflow Creation',
    body: 'Tasks are ordered by dependency. Parallel and sequential work is mapped automatically.',
    api: 'POST /create-workflow',
  },
  {
    n: '04', icon: Activity, title: 'Live Monitoring',
    body: 'Deadlines are tracked. Delays surface before they become problems.',
    api: 'POST /simulate-delay',
  },
  {
    n: '05', icon: RefreshCw, title: 'Self-Healing',
    body: 'Blocked tasks are automatically reassigned or rescheduled based on dependency state.',
    api: 'POST /self-heal',
  },
  {
    n: '06', icon: ScrollText, title: 'Audit Trail',
    body: 'Every decision is recorded with timestamp, actor, reason and full traceability.',
    api: 'GET /logs',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary" style={{ '--bg-base': '#0C0C0E' }}>
      {/* Navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center transition-all duration-200"
        style={{
          background: 'rgba(12,12,14,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.09)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1160px] mx-auto w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center p-1 shadow-lg shadow-accent/20">
               <img src={logo} alt="TaskPilot Logo" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <span className="text-[17px] font-semibold text-text-primary tracking-tight font-display italic">TaskPilot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="h-9 px-4 flex items-center text-[14px] text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5">
              Sign in
            </Link>
            <Link to="/auth" className="h-9 px-4 flex items-center text-[14px] text-white rounded-lg bg-accent hover:brightness-110 transition-all">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Background shape */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] opacity-[0.06] pointer-events-none blur-[80px] rounded-full" style={{ background: 'var(--accent)' }} />

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <div className="max-w-[680px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0 }}
            className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.18em] mb-8"
          >
            Autonomous Workflow Execution
          </motion.p>

          <h1 className="font-display text-text-primary leading-[1.08] mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[52px] md:text-[52px] text-[34px]"
              style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}
            >
              Meeting notes in.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.27 }}
              style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}
            >
              Workflows That Think out.
            </motion.div>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="text-[17px] text-text-secondary leading-[1.65] max-w-[520px] mx-auto mb-10"
          >
            TaskPilot turns any meeting transcript into a structured, dependency-aware,
            self-healing task workflow — powered by Gemini.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            className="flex items-center justify-center gap-2.5 mb-10"
          >
            <Link
              to="/auth"
              className="h-11 px-7 flex items-center text-[15px] text-white rounded-lg bg-accent hover:brightness-110 transition-all active:scale-[0.98] font-medium"
            >
              Start for free
            </Link>
            <a href="#how" className="h-11 px-6 flex items-center text-[15px] text-text-secondary hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors">
              See how it works ↓
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            {[
              { num: '< 3s', label: 'Extraction' },
              { num: 'Zero', label: 'Manual work' },
              { num: '100%', label: 'Traceable' },
            ].map(({ num, label }) => (
              <div key={label} className="glass-sm px-5 py-2 flex items-center gap-2">
                <span className="text-[15px] font-semibold text-text-primary">{num}</span>
                <span className="text-[12px] text-text-tertiary">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-[1160px] mx-auto">
          <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.18em] text-center mb-3">Process</p>
          <h2 className="text-[36px] font-semibold text-text-primary text-center mb-12">Six steps. Fully automated.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="glass-sm p-6"
              >
                <p className="font-mono text-[11px] text-text-tertiary mb-4">{step.n}</p>
                <step.icon className="w-5 h-5 text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[15px] font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-[13px] text-text-secondary leading-[1.6]">{step.body}</p>
                <p className="font-mono text-[10px] text-text-tertiary mt-4">{step.api}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product visual */}
      <section className="py-24 px-6">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-2xl overflow-hidden"
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
              <div className="flex-1 mx-4">
                <div className="bg-bg-elevated rounded-md px-3 py-1 max-w-[220px] mx-auto">
                   <span className="font-mono text-[12px] text-text-tertiary">app.taskpilot.io/dashboard</span>
                </div>
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: 'Total', v: '12', c: 'text-text-primary' },
                  { l: 'Pending', v: '7', c: 'text-warning' },
                  { l: 'Delayed', v: '2', c: 'text-danger' },
                  { l: 'Done', v: '3', c: 'text-success' },
                ].map(s => (
                  <div key={s.l} className="glass-sm p-4">
                    <p className="text-[11px] font-mono text-text-tertiary mb-1">{s.l}</p>
                    <p className={`text-[28px] font-semibold ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="glass-sm p-4 space-y-2">
                {[
                  { task: 'Design and complete the full database schema by Wednesday', owner: 'Priya', dl: '2026-03-27', pri: 'high', st: 'pending' },
                  { task: 'Build the REST API layer for task management endpoints', owner: 'Rohan', dl: '2026-03-29', pri: 'medium', st: 'pending' },
                  { task: 'Set up production deployment pipeline and CI/CD workflows', owner: 'Sam', dl: '2026-04-01', pri: 'low', st: 'completed' },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.pri === 'high' ? 'bg-danger' : t.pri === 'medium' ? 'bg-warning' : 'bg-accent'}`} />
                    <p className="text-[13px] text-text-primary flex-1 truncate">{t.task}</p>
                    <span className="text-[12px] text-text-tertiary font-mono flex-shrink-0 hidden sm:block">{t.owner}</span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md flex-shrink-0 ${t.st === 'completed' ? 'bg-success-subtle text-success' : 'bg-bg-elevated text-text-tertiary'}`}>{t.st}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-10">
        <div className="max-w-[1160px] mx-auto px-6 text-center">
          <p className="text-[13px] text-text-tertiary">
            TaskPilot · © 2026 All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
