import '@fontsource/inter';
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Extract from './pages/Extract.jsx';
import Workflow from './pages/Workflow.jsx';
import Monitor from './pages/Monitor.jsx';
import SelfHeal from './pages/SelfHeal.jsx';
import Logs from './pages/Logs.jsx';
import Calendar from './pages/Calendar.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Help from './pages/Help.jsx';

import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import QuickAddFAB from './components/QuickAddFAB.jsx';
import useAuthStore from './store/authStore.js';
import useWorkflowStore from './store/workflowStore.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Auth guard
function RequireAuth() {
  const { session, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

// Inner app shell
function AppShell() {
  const { user } = useAuthStore();
  const { loadTasks } = useWorkflowStore();

  useEffect(() => {
    if (user) loadTasks(user.id);
  }, [user]);

  return (
    <div className="flex bg-bg-base min-h-screen w-full font-sans selection:bg-accent/30 selection:text-white">
      <Sidebar />
      {/* Content wrapper with fixed sidebar compensation */}
      <main className="flex-1 w-full lg:pl-[280px]">
        <div className="p-6 sm:p-10 lg:p-16 xl:p-24 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

function AppInit({ children }) {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);
  return children;
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInit>
            <Helmet defaultTitle="TaskPilot" titleTemplate="TaskPilot · %s" />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  backdropFilter: 'blur(12px)',
                },
                success: { iconTheme: { primary: 'var(--success)', secondary: 'transparent' } },
                error: { iconTheme: { primary: 'var(--danger)', secondary: 'transparent' } },
              }}
            />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<><Helmet title="Dashboard" /><Dashboard /></>} />
                  <Route path="/extract" element={<><Helmet title="Extract Tasks" /><Extract /></>} />
                  <Route path="/workflow" element={<><Helmet title="Workflow" /><Workflow /></>} />
                  <Route path="/monitor" element={<><Helmet title="Monitor" /><Monitor /></>} />
                  <Route path="/self-heal" element={<><Helmet title="Self-Heal" /><SelfHeal /></>} />
                  <Route path="/logs" element={<><Helmet title="Audit Log" /><Logs /></>} />
                  <Route path="/calendar" element={<><Helmet title="Calendar" /><Calendar /></>} />
                  <Route path="/notifications" element={<><Helmet title="Notifications" /><Notifications /></>} />
                  <Route path="/settings" element={<><Helmet title="Settings" /><Settings /></>} />
                  <Route path="/help" element={<><Helmet title="Help" /><Help /></>} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppInit>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
