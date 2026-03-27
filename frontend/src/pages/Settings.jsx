import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Button, Input } from '../components/ui/index.jsx';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const ACCENT_OPTIONS = [
  { key: 'blue',    color: '#2563EB' },
  { key: 'slate',   color: '#475569' },
  { key: 'violet',  color: '#7C3AED' },
  { key: 'emerald', color: '#059669' },
  { key: 'rose',    color: '#E11D48' },
  { key: 'amber',   color: '#D97706' },
  { key: 'neutral', color: '#71717A' },
];

const AVATAR_COLORS = [
  '#2563EB','#7C3AED','#059669','#E11D48','#D97706','#475569','#0891B2',
];

function Section({ title, children }) {
  return (
    <div className="glass-sm p-6 mb-4">
      <h2 className="text-[16px] font-semibold text-text-primary mb-4">{title}</h2>
      <div className="h-px bg-border-subtle mb-4" />
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
      <span className="text-[14px] text-text-primary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={clsx('toggle-pill cursor-pointer', value && 'on')}
        aria-label={label}
      />
    </div>
  );
}

export default function Settings() {
  const { user, profile, accent, theme, setAccent, setTheme } = useAuthStore();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || '#2563EB');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [notifs, setNotifs] = useState({ deadlines: true, delays: true, weekly: false });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const initials = profile?.username?.slice(0, 2).toUpperCase() || 'TP';

  const saveDisplayName = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
    if (error) toast.error(error.message);
    else toast.success('Display name saved.');
  };

  const saveAvatarColor = async (color) => {
    setAvatarColor(color);
    if (!user) return;
    await supabase.from('profiles').update({ avatar_color: color }).eq('id', user.id);
    toast.success('Avatar color updated.');
  };

  const saveAvatarUrl = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile picture updated.');
    qc.invalidateQueries(); // Refresh UI
  };

  const handlePasswordChange = async () => {
    if (!newPass || newPass !== confPass) { toast.error('Passwords do not match.'); return; }
    if (newPass.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else { toast.success('Password updated.'); setOldPass(''); setNewPass(''); setConfPass(''); }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 5000);
      return;
    }
    toast.error('Account deletion requires server-side support. Contact support.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-xl pb-20 lg:pb-6"
    >
      <h1 className="text-[28px] font-semibold text-text-primary mb-6">Settings</h1>

      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-semibold flex-shrink-0"
            style={{ background: profile?.avatar_url || avatarUrl ? `url(${profile?.avatar_url || avatarUrl}) center/cover` : avatarColor }}
          >
            {!(profile?.avatar_url || avatarUrl) && initials}
          </div>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => saveAvatarColor(c)}
                className={clsx(
                  'w-6 h-6 rounded-full cursor-pointer transition-all',
                  avatarColor === c ? 'ring-2 ring-white ring-offset-1' : 'hover:scale-110'
                )}
                style={{ background: c }}
                aria-label={`Avatar color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Username</label>
            <div className="h-[38px] px-3 rounded-lg bg-bg-elevated border border-border-subtle flex items-center">
              <span className="font-mono text-[14px] text-text-tertiary">{profile?.username || '—'}</span>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Display name</label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onBlur={saveDisplayName}
                placeholder="Your name"
                className="flex-1"
              />
              <Button variant="secondary" size="md" onClick={saveDisplayName}>Save</Button>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-mono text-text-tertiary mb-1 block">Profile Picture URL</label>
            <div className="flex gap-2">
              <Input
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                onBlur={saveAvatarUrl}
                placeholder="https://example.com/photo.png"
                className="flex-1"
              />
              <Button variant="secondary" size="md" onClick={saveAvatarUrl}>Save URL</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <div className="space-y-5">
          <div>
            <p className="text-[13px] text-text-secondary mb-3">Accent color</p>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_OPTIONS.map(({ key, color }) => (
                <button
                  key={key}
                  onClick={() => setAccent(key)}
                  aria-label={`Accent ${key}`}
                  className={clsx(
                    'w-5 h-5 rounded-full cursor-pointer transition-all',
                    accent === key ? 'ring-2 ring-white ring-offset-2 scale-110' : 'hover:scale-110'
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-text-primary">Dark mode</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={clsx('toggle-pill cursor-pointer', theme === 'dark' && 'on')}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div className="space-y-3 mb-5">
          <p className="text-[13px] font-semibold text-text-secondary">Change password</p>
          <Input type="password" placeholder="New password" value={newPass} onChange={e => setNewPass(e.target.value)} />
          <Input type="password" placeholder="Confirm password" value={confPass} onChange={e => setConfPass(e.target.value)} />
          <Button variant="secondary" size="md" onClick={handlePasswordChange}>Update password</Button>
        </div>

        <div className="h-px bg-border-subtle my-4" />

        <div>
          <p className="text-[13px] font-semibold text-text-secondary mb-2">Danger zone</p>
          <button
            onClick={handleDeleteAccount}
            className={clsx(
              'h-9 px-4 rounded-lg text-[13px] border transition-colors cursor-pointer',
              deleteConfirm
                ? 'bg-danger-subtle text-danger border-danger/30'
                : 'text-text-tertiary border-border-subtle hover:text-danger hover:border-danger/30'
            )}
          >
            {deleteConfirm ? 'Are you sure? Click again to confirm.' : 'Delete account'}
          </button>
        </div>
      </Section>

      {/* Integrations */}
      <Section title="Integrations">
        <div className="flex items-center justify-between py-3 border-b border-border-subtle">
          <div>
            <p className="text-[14px] text-text-primary">Google Calendar</p>
            <p className="text-[12px] text-text-tertiary mt-0.5">Sync tasks to your calendar</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={clsx("w-1.5 h-1.5 rounded-full", useAuthStore.getState().providerToken ? "bg-success" : "bg-text-tertiary")} />
              <span className="text-[12px] text-text-tertiary">{useAuthStore.getState().providerToken ? 'Connected' : 'Not connected'}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => useAuthStore.getState().providerToken ? toast.success('Calendar integration active!') : toast.error('Please log in with Google to enable Calendar.')}>
              {useAuthStore.getState().providerToken ? 'Active' : 'Connect'}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[13px] font-semibold text-text-secondary mb-3">Notification preferences</p>
          <ToggleRow label="Deadline reminders (24h before)" value={notifs.deadlines} onChange={v => setNotifs(n => ({ ...n, deadlines: v }))} />
          <ToggleRow label="Delay alerts" value={notifs.delays} onChange={v => setNotifs(n => ({ ...n, delays: v }))} />
          <div className="flex items-center justify-between py-3 opacity-40">
            <span className="text-[14px] text-text-primary">Weekly summary</span>
            <button className="toggle-pill" disabled />
          </div>
        </div>
      </Section>
    </motion.div>
  );
}
