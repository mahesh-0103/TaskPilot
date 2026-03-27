import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Sparkles, GitBranch, Activity, 
  RefreshCw, FileText, Calendar, Bell, Settings,
  LogOut, User, Zap, Moon, Sun, Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import useAuthStore from '../store/authStore';

const MENU_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/extract', label: 'Extract', icon: Sparkles },
  { path: '/workflow', label: 'Workflow', icon: GitBranch },
  { path: '/monitor', label: 'Monitor', icon: Monitor },
  { path: '/self-heal', label: 'Self-Heal', icon: RefreshCw },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { signOut, user } = useAuthStore();
  const location = useLocation();

  return (
    <aside className="w-[280px] min-h-screen bg-[#060606] border-r border-white/[0.03] flex flex-col p-8 fixed left-0 top-0 overflow-y-auto z-40">
      {/* Branding */}
      <div className="mb-14">
        <h1 className="text-[28px] font-display italic text-text-primary tracking-tight leading-none mb-1">TaskPilot</h1>
        <p className="font-mono text-[9px] text-text-tertiary tracking-[0.4em] uppercase opacity-70">Sovereign Workspace</p>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-2">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              'group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden',
              isActive 
                ? 'bg-accent/10 text-accent font-semibold' 
                : 'text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={clsx(
                  'w-5 h-5 transition-transform duration-500 group-hover:scale-110', 
                  isActive ? 'text-accent' : 'text-text-dim'
                )} />
                <span className="text-[14px] font-ui tracking-tight">{item.label}</span>
                {isActive && (
                   <motion.div 
                     layoutId="active-pill" 
                     className="absolute left-0 w-1 h-6 bg-accent rounded-full"
                   />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme & Accents Selection Placeholder */}
      <div className="pt-10 space-y-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3 text-text-tertiary group cursor-pointer hover:text-text-primary transition-colors">
              <Moon className="w-5 h-5" />
              <span className="text-[14px] font-ui tracking-tight">Theme</span>
           </div>
           <div className="flex items-center gap-3 text-text-tertiary group cursor-pointer hover:text-text-primary transition-colors">
              <Zap className="w-5 h-5" />
              <span className="text-[14px] font-ui tracking-tight">Accents</span>
           </div>
        </div>

        {/* Profile / Signature Section */}
        <div className="pt-8 border-t border-white/[0.04] flex items-center justify-between group">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.03] ring-1 ring-white/5 flex items-center justify-center overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-text-tertiary" />
                )}
              </div>
              <div className="space-y-0.5">
                 <p className="text-[13px] font-ui font-semibold text-text-primary truncate max-w-[120px]">
                   {user?.user_metadata?.username || 'Executive'}
                 </p>
                 <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Active_Node</p>
              </div>
           </div>
           <button 
             onClick={signOut}
             className="w-8 h-8 rounded-xl bg-white/[0.02] hover:bg-danger/10 hover:text-danger text-text-tertiary flex items-center justify-center transition-all"
           >
              <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </aside>
  );
}
