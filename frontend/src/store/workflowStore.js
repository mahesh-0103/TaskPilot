import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useWorkflowStore = create((set, get) => ({
  tasks: [],
  logs: [],
  workflowTitle: '',
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),
  setLogs: (logs) => set({ logs }),
  setWorkflowTitle: (title) => set({ workflowTitle: title }),

  // Replaces the purely in-memory state with a Supabase fetch
  loadTasks: async (userId) => {
    if (!userId) return;
    set({ isLoading: true });
    try {
      const { apiRequest } = await import('../lib/api');
      const data = await apiRequest(`/tasks/${userId}`, {}, 'GET');
      
      if (data?.tasks) {
        set({ tasks: data.tasks });
      }
    } catch (e) {
      console.error('Task Discovery Error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (taskId, fields) => {
    // Update local state for instant feedback
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === taskId ? { ...t, ...fields } : t
      ),
    }));

    // Persist to Supabase
    try {
       await supabase.from('tasks').update(fields).eq('task_id', taskId);
    } catch (e) {
       console.error('Failed to sync task update:', e);
    }
  },

  addLog: (log) =>
    set((state) => ({ logs: [log, ...state.logs] })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.task_id !== taskId),
    })),
}));

export default useWorkflowStore;
