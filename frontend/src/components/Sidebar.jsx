import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Sparkles, GitBranch, Activity, RefreshCw,
  ScrollText, Calendar, Bell, Settings, LogOut, Moon, Sun,
  ChevronDown, HelpCircle, User
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { supabase } from '../lib/supabase';

const ACCENT_OPTIONS = [
  { key: 'blue',    color: '#2563EB' },
  { key: 'slate',   color: '#475569' },
  { key: 'violet',  color: '#7C3AED' },
  { key: 'emerald', color: '#059669' },
  { key: 'rose',    color: '#E11D48' },
  { key: 'amber',   color: '#D97706' },
  { key: 'neutral', color: '#71717A' },
];

const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { to: '/extract',   icon: Sparkles,         label: 'Extract' },
      { to: '/workflow',  icon: GitBranch,         label: 'Workflow' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { to: '/monitor', icon: Activity,   label: 'Monitor' },
      { to: '/heal',    icon: RefreshCw,  label: 'Self-Heal' },
      { to: '/logs',    icon: ScrollText, label: 'Audit Log' },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
       { to: '/help', icon: HelpCircle, label: 'How to use' },
    ]
  },
  {
    label: 'CONNECT',
    items: [
      { to: '/calendar',      icon: Calendar, label: 'Calendar' },
      { to: '/notifications', icon: Bell,     label: 'Notifications', badge: true },
      { to: '/settings',      icon: Settings, label: 'Settings' },
    ],
  },
];

function UserDropdown({ profile, onSignOut, onSettings }) {
  const [open, setOpen] = useState(false);
  const initials = profile?.username?.slice(0, 2).toUpperCase() || 'TP';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 p-3 rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer"
      >
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0"
          style={{ background: profile?.avatar_color || '#2563EB' }}
        >
          {initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[14px] font-semibold text-text-primary truncate">
            {profile?.username || 'user'}
          </p>
          <p className="text-[12px] text-text-tertiary truncate">
            {profile?.display_name || 'No name set'}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 w-52 glass-sm z-50 py-1 overflow-hidden">
            <button
              onClick={() => { setOpen(false); onSettings(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <div className="h-px bg-border-subtle mx-2 my-1" />
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-danger hover:bg-danger-subtle transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { profile, accent, theme, setAccent, setTheme, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const sub = supabase
      .channel('notifications-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchUnread)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const [apiOk, setApiOk] = useState(false);
  useEffect(() => {
    fetch((import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/')
      .then(r => r.ok ? setApiOk(true) : setApiOk(false))
      .catch(() => setApiOk(false));
  }, []);

  return (
    <aside
      className="hidden lg:flex flex-col w-[260px] h-screen flex-shrink-0 z-10"
      style={{
        background: 'var(--bg-elevated)',
        // No explicit border as per Stitch "No-Line" rule
      }}
    >
      {/* Logo Section */}
      <div className="mb-10 px-6 pt-10">
        <h1 className="text-[32px] font-normal tracking-tight text-text-primary font-display leading-tight italic">
          TaskPilot
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono mt-1.5 opacity-80">
          Executive Automation
        </p>
      </div>

      {/* User */}
      <div className="border-b border-border-subtle">
        <UserDropdown
          profile={profile}
          onSignOut={signOut}
          onSettings={() => navigate('/settings')}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em] px-2 py-3 pb-1">
              {group.label}
            </p>
            {group.items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx('nav-item mb-0.5', isActive && 'active')
                }
              >
                <Icon className="w-4 h-4 nav-icon flex-shrink-0" />
                <span className="flex-1 text-[14px]">{label}</span>
                {badge && unreadCount > 0 && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[10px] font-mono text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: Theme + Mode + API Status */}
      <div className="border-t border-border-subtle p-3 space-y-3">
        {/* Accent picker */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ACCENT_OPTIONS.map(({ key, color }) => (
            <button
              key={key}
              aria-label={`Theme ${key}`}
              onClick={() => setAccent(key)}
              className={clsx(
                'w-3 h-3 rounded-full transition-all duration-150 cursor-pointer',
                accent === key ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'hover:scale-110'
              )}
              style={{ background: color }}
            />
          ))}
        </div>

        {/* Dark/Light + API dot */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="flex items-center gap-2 text-[12px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'w-1.5 h-1.5 rounded-full',
              apiOk ? 'bg-success animate-breathe-dot' : 'bg-text-tertiary'
            )} />
            <span className="text-[11px] font-mono text-text-tertiary">
              {apiOk ? 'API' : 'offline'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
