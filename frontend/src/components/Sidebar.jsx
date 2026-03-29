import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  Activity, 
  Calendar as CalIcon, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Sparkles,
  Plus,
  Palette,
  Moon,
  Sun,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import useAuthStore from '../store/authStore';
import useModalStore from '../store/modalStore';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Control Center', path: '/dashboard' },
  { icon: Sparkles,        label: 'Extract Data',   path: '/extract' },
  { icon: Workflow,       label: 'Workflow Grid',  path: '/workflow' },
  { icon: Activity,       label: 'Live Telemetry', path: '/monitor' },
  { icon: CalIcon,        label: 'Temporal Sync',  path: '/calendar' },
  { icon: History,        label: 'Audit Trail',    path: '/logs' },
];

const ACCENTS = ['blue', 'slate', 'violet', 'emerald', 'rose', 'amber', 'neutral'];

export default function Sidebar() {
  const { signout, user, theme, setTheme, accent, setAccent, profile } = useAuthStore();
  const { openQuickAdd } = useModalStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signout();
    navigate('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-bg-base border-r border-border-subtle hidden lg:flex flex-col z-50 overflow-hidden">
      {/* Branding */}
      <div className="p-10 pb-12">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform overflow-hidden p-1.5">
             <img src={logo} alt="TaskPilot Logo" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-[20px] font-display italic text-text-primary tracking-tight">TaskPilot</h1>
            <p className="text-[10px] font-mono text-text-tertiary tracking-widest uppercase mt-0.5 whitespace-nowrap">Workflows That Think</p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-6 space-y-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              "flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group",
              isActive ? "bg-accent/10 text-accent font-bold" : "text-text-tertiary hover:text-text-primary hover:bg-bg-elevated/50"
            )}
          >
            <div className="flex items-center gap-4">
              <item.icon className={clsx("w-5 h-5", location.pathname === item.path ? "text-accent" : "text-text-tertiary opacity-40 group-hover:opacity-100 group-hover:text-text-secondary")} />
              <span className="text-[15px] font-medium tracking-tight">{item.label}</span>
            </div>
            {location.pathname === item.path && (
               <motion.div layoutId="active-nav" className="w-1.5 h-1.5 rounded-full bg-accent shadow-lg shadow-accent/50" />
            )}
          </NavLink>
        ))}

        <div className="pt-8 px-5">
           <button 
             onClick={openQuickAdd}
             className="w-full h-14 rounded-2xl bg-accent text-white flex items-center justify-center gap-3 shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
           >
             <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Plus className="w-4 h-4" />
             </div>
             <span className="font-mono text-[11px] uppercase tracking-[0.2em] font-bold">Quick Add</span>
           </button>
        </div>
      </nav>

      {/* Interface options removed */}

      {/* User Footer */}
      <div className="p-8 mt-auto border-t border-border-subtle bg-bg-surface/5">
         <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/settings')}>
            <div className="relative">
              <div 
                className="w-11 h-11 rounded-[14px] bg-accent/20 flex items-center justify-center text-accent text-[14px] font-display italic ring-1 ring-border-default shadow-lg overflow-hidden"
              >
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <span style={{ color: profile?.avatar_color || 'white' }}>
                    {(profile?.display_name || profile?.username || 'P').slice(0, 1).toUpperCase()}
                   </span>
                 )}
              </div>
              <div className={clsx("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-bg-base", profile ? "bg-success" : "bg-text-tertiary")} />
            </div>
            <div className="flex-1 min-w-0">
               <h4 className="text-[14px] font-semibold text-text-primary truncate">{profile?.display_name || profile?.username || 'Syncing...'}</h4>
               <p className="text-[11px] font-mono text-text-tertiary uppercase tracking-tighter truncate opacity-60">{user?.email || 'Unauthorized'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
         </div>

         <button 
           onClick={handleSignOut}
           className="w-full mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-text-tertiary hover:text-danger hover:bg-danger/5 transition-all text-[13px] font-medium group"
         >
           <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
           <span>Deauthorize Session</span>
         </button>
      </div>
    </aside>
  );
}
