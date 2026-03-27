import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Sparkles, Activity, ShieldCheck, Zap, MousePointer2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Divider } from '../components/ui/index.jsx';

const FAQ = [
  {
    q: "How does TaskPilot extract tasks?",
    a: "Our digital chief of staff uses tiered LLM extraction (Mistral 7B for speed, followed by Gemini 1.5 Pro for complex nuances). It identifies objectives, owners, and deadlines from raw text with 98% semantic accuracy."
  },
  {
    q: "What is the 'Strategic Blueprint'?",
    a: "The Blueprint is an intelligently ordered sequence of your extracted tasks, modeled as a directed acyclic graph to ensure dependencies are respected before execution."
  },
  {
    q: "How does 'Self-Healing' work?",
    a: "When a delay (entropy) is detected in the Monitor, the system triggers recovery protocols. It calculates the impact on downstream objectives and suggests recalibration to keep the strategy on track."
  },
  {
    q: "Can I sync with Google?",
    a: "Yes. TaskPilot automatically provisions calendar events and sends email notifications for all extracted tasks once you've authorized Google via your settings."
  }
];

const STEPS = [
  { icon: Sparkles, title: "Synthesis", desc: "Paste your meeting notes in the Extract tab." },
  { icon: MousePointer2, title: "Blueprint", desc: "Click 'Create Workflow' to generate the execution order." },
  { icon: Activity, title: "Monitor", desc: "Track tasks in real-time and handle disruptions." },
];

export default function Help() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl space-y-16 pb-20 lg:pb-10"
    >
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-accent mb-6">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-mono text-[12px] uppercase tracking-[0.3em]">Operational Manual</span>
        </div>
        <h1 className="text-[56px] font-normal font-display text-text-primary tracking-tight italic leading-none">
          Harnessing Intelligence.
        </h1>
        <p className="text-[18px] text-text-tertiary font-ui max-w-xl leading-relaxed">
          TaskPilot is more than a manager — it's your autonomous executive layer. Here's how to master the system.
        </p>
      </header>

      {/* Guide */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((step, i) => (
          <div key={i} className="bg-bg-elevated/40 ring-1 ring-white/5 p-8 rounded-[32px] space-y-6 group hover:ring-accent/40 transition-all">
             <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <step.icon className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-[18px] font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-[14px] text-text-tertiary leading-relaxed">{step.desc}</p>
             </div>
          </div>
        ))}
      </section>

      <Divider label="Common Inquiries" />

      {/* FAQs */}
      <section className="space-y-4">
        {FAQ.map((item, i) => (
          <div key={i} className="bg-bg-base ring-1 ring-white/5 p-8 rounded-3xl space-y-3">
            <h4 className="text-[16px] font-medium text-text-primary flex items-center gap-3">
              <Zap className="w-4 h-4 text-accent" />
              {item.q}
            </h4>
            <p className="text-[15px] text-text-secondary leading-relaxed pl-7">
              {item.a}
            </p>
          </div>
        ))}
      </section>

      <footer className="pt-10 text-center opacity-40">
        <p className="text-[12px] font-mono uppercase tracking-widest text-text-tertiary">
          System Version 2.1.0 • TaskPilot Executive Edition
        </p>
      </footer>
    </motion.div>
  );
}
