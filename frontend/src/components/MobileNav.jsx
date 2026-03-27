import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { LayoutDashboard, Sparkles, GitBranch, ScrollText, MoreHorizontal } from 'lucide-react';

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/extract',   icon: Sparkles,         label: 'Extract' },
  { to: '/workflow',  icon: GitBranch,         label: 'Workflow' },
  { to: '/logs',      icon: ScrollText,         label: 'Logs' },
  { to: '/settings',  icon: MoreHorizontal,     label: 'More' },
];

export default function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14"
      style={{
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => clsx(
            'flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center',
            'text-[10px] font-mono transition-colors',
            isActive ? 'text-accent' : 'text-text-tertiary'
          )}
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
