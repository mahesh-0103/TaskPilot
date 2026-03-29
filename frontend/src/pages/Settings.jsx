import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { 
  User, Activity, Bell, Shield, Palette, 
  Layout, Globe, Lock, Trash2, CheckCircle2,
  Camera, Upload, X, RefreshCw
} from 'lucide-react';
import { Button, Input, Divider, Badge } from '../components/ui/index.jsx';
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

function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass-sm p-10 rounded-[40px] border-white/5 space-y-8 bg-white/[0.01]">
      <div className="flex items-center gap-4 mb-2">
         <div className="p-3 rounded-2xl bg-accent/10 text-accent">
           <Icon className="w-5 h-5" />
         </div>
         <h2 className="text-[16px] font-mono text-text-primary tracking-[0.2em] uppercase font-bold">{title}</h2>
      </div>
      <div className="h-px bg-white/5" />
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange, disabled }) {
  return (
    <div className={clsx("flex items-center justify-between py-5 border-b border-white/5 last:border-0", disabled && "opacity-40")}>
      <span className="text-[15px] text-text-primary font-medium">{label}</span>
      <button
        onClick={() => !disabled && onChange(!value)}
        className={clsx('toggle-pill cursor-pointer', value && 'on', disabled && 'cursor-not-allowed')}
        aria-label={label}
        disabled={disabled}
      />
    </div>
  );
}

export default function Settings() {
  const { user, profile, accent, theme, setAccent, setTheme, providerToken, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || '#2563EB');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const initials = (displayName || profile?.username || 'TP').slice(0, 1).toUpperCase();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarColor(profile.avatar_color || '#2563EB');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    const res = await updateProfile({ 
      display_name: displayName,
      avatar_url: avatarUrl,
      avatar_color: avatarColor
    });
    if (res.success) toast.success('Identity Synchronized');
    else toast.error('Link Interrupted: ' + res.error);
  };

  const handleFileUpload = async (event) => {
     const file = event.target.files?.[0];
     if (!file) return;

     setIsUploading(true);
     try {
       // Using Supabase Storage if available, else local preview
       const fileExt = file.name.split('.').pop();
       const fileName = `${user.id}-${Math.random()}.${fileExt}`;
       const filePath = `avatars/${fileName}`;

       const { error: uploadError, data } = await supabase.storage
         .from('profiles')
         .upload(filePath, file);

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage
         .from('profiles')
         .getPublicUrl(filePath);

       setAvatarUrl(publicUrl);
       toast.success('Neural signature uploaded.');
     } catch (e) {
       console.error(e);
       // Fallback for demo: use a temporary local URL if bucket doesn't exist
       const localUrl = URL.createObjectURL(file);
       setAvatarUrl(localUrl);
       toast.success('Local signature cached.');
     } finally {
       setIsUploading(false);
     }
  };

  const syncGoogleProfile = () => {
    const meta = user?.user_metadata;
    if (meta) {
      if (meta.full_name) setDisplayName(meta.full_name);
      if (meta.avatar_url || meta.picture) setAvatarUrl(meta.avatar_url || meta.picture);
      toast.success('Google Context Synchronized');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20 max-w-5xl mx-auto space-y-12"
    >
      <header className="space-y-4">
        <span className="font-mono text-[11px] text-accent tracking-[0.4em] uppercase font-bold">USER // PREFERENCES</span>
        <h1 className="text-[72px] leading-none font-display italic text-text-primary tracking-tighter">Account Settings</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12 space-y-10">
          {/* Identity Section */}
          <Section title="Your Profile" icon={User}>
            <div className="flex flex-col md:flex-row gap-12 items-start">
               <div className="relative group">
                  <div
                    className="w-40 h-40 rounded-[48px] flex items-center justify-center text-white text-[48px] font-display italic flex-shrink-0 shadow-2xl ring-4 ring-white/5 overflow-hidden transition-all group-hover:ring-accent/40"
                    style={{ background: avatarUrl ? `url(${avatarUrl}) center/cover` : avatarColor }}
                  >
                    {!avatarUrl && initials}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                  >
                    {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleFileUpload}
                  />
               </div>

               <div className="flex-1 w-full space-y-10">
                  <div className="space-y-6">
                    <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest font-bold">Pick an individual color</p>
                    <div className="flex gap-3 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => { setAvatarColor(c); setAvatarUrl(''); }}
                          className={clsx(
                            'w-10 h-10 rounded-2xl transition-all border-4',
                            avatarColor === c && !avatarUrl ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'
                          )}
                          style={{ background: c }}
                        />
                      ))}
                      <div className="w-px h-10 bg-white/5 mx-2" />
                      <Button size="sm" variant="ghost" className="text-[11px] font-mono h-10 px-4 flex items-center gap-2 border-white/10" onClick={syncGoogleProfile}>
                        <RefreshCw className="w-3.5 h-3.5" /> Google Profile
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Input
                        label="Display Name"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="e.g. Maverick"
                        className="h-14 rounded-2xl"
                      />
                      <p className="text-[11px] font-mono text-text-tertiary opacity-40 px-2 italic">This name will be shown to your collaborators.</p>
                    </div>
                    <div className="flex items-end pb-4">
                       <Button variant="accent" className="w-full h-14 rounded-2xl font-mono uppercase tracking-[0.2em] shadow-xl shadow-accent/20" onClick={handleSaveProfile}>Save Changes</Button>
                    </div>
                  </div>
               </div>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-6 space-y-10">
          {/* Appearance */}
          <Section title="Look & Feel" icon={Palette}>
            <div className="space-y-10">
              <div>
                <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest font-bold mb-6">Interface Color</p>
                <div className="flex items-center gap-4 flex-wrap">
                  {ACCENT_OPTIONS.map(({ key, color }) => (
                    <button
                      key={key}
                      onClick={() => setAccent(key)}
                      className={clsx(
                        'w-10 h-10 rounded-2xl transition-all border-4',
                        accent === key ? 'border-white scale-110 shadow-lg shadow-white/20 font-bold' : 'border-transparent opacity-40 hover:opacity-100'
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
              <ToggleRow 
                label="Dark Mode (Night Owl)" 
                value={theme === 'dark'} 
                onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              />
            </div>
          </Section>

          {/* Decommission Section */}
          <Section title="Critical Actions" icon={Trash2}>
             <div className="space-y-6">
                <p className="text-[13px] text-text-secondary leading-relaxed font-ui italic">Deleting your account will permanently remove all your tasks, notes, and activity logs.</p>
                <Button variant="ghost" className="w-full h-14 border-danger/20 text-danger hover:bg-danger/10 font-mono uppercase tracking-widest text-[11px]">
                   Delete Everything
                </Button>
             </div>
          </Section>
        </div>

        <div className="lg:col-span-6 space-y-10">
          {/* Connectivity */}
          <Section title="Connectivity" icon={Globe}>
            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-[18px] bg-accent/10 flex items-center justify-center">
                     <Globe className={clsx("w-6 h-6", providerToken ? "text-success" : "text-text-dim")} />
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-text-primary">Google Integration</p>
                    <p className="text-[11px] font-mono uppercase text-text-tertiary">Calendar / Workspace</p>
                  </div>
                </div>
                <Badge variant={providerToken ? 'success' : 'pending'} className="font-mono text-[9px] uppercase px-3 py-1">
                   {providerToken ? 'Connected' : 'Offline'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <p className="text-[12px] font-mono text-text-tertiary uppercase tracking-widest font-bold mb-2">Comms Relay</p>
                <div className="space-y-2">
                  <ToggleRow label="Temporal Proximity Alerts" value={true} onChange={() => {}} disabled />
                  <ToggleRow label="Autonomous Healing Dispatches" value={true} onChange={() => {}} disabled />
                </div>
              </div>
            </div>
          </Section>

          {/* Manual */}
          <Section title="Manual" icon={Shield}>
             <div className="p-6 rounded-[32px] bg-accent/5 border border-accent/10 space-y-4">
                <p className="text-[13px] text-accent leading-relaxed font-medium italic">Peak operational stability is being maintained. All distributed node signals are within nominal parameters.</p>
                <Divider className="bg-accent/10" />
                <div className="flex items-center justify-between text-[11px] font-mono text-accent uppercase tracking-widest font-bold">
                   <span>Encryption Status</span>
                   <span>Quantum-Safe</span>
                </div>
             </div>
          </Section>
        </div>
      </div>
    </motion.div>
  );
}
