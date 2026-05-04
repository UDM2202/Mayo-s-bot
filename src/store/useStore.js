import { create } from 'zustand';

const API = 'http://localhost:3001/api';

const useStore = create((set, get) => ({
  activeView: 'board',
  activeTeam: 'engineering',
  tasks: [],
  loading: false,
  modalOpen: false,
  editingTask: null,
  isPaletteOpen: false,
  pollingInterval: null,

  setActiveView: (view) => set({ activeView: view }),
  setPaletteOpen: (val) => set({ isPaletteOpen: val }),
  openModal: (task = null) => set({ modalOpen: true, editingTask: task }),
  closeModal: () => set({ modalOpen: false, editingTask: null }),

  setActiveTeam: (team) => {
    set({ activeTeam: team });
    get().loadTasks();
  },

  // Start real-time polling
  startPolling: () => {
    get().stopPolling();
    get().loadTasks();
    const interval = setInterval(() => get().loadTasks(), 3000); // Every 3 seconds
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    set({ pollingInterval: null });
  },

  loadTasks: async () => {
    const team = get().activeTeam;
    try {
      const res = await fetch(`${API}/tasks?team=${team}`);
      const data = await res.json();
      const fixed = data.map(task => ({
        ...task,
        tags: Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags || '[]'),
        due_date: task.due_date || task.dueDate || '',
      }));
      set({ tasks: fixed, loading: false });
    } catch (err) {
      console.error('Failed to load tasks:', err);
      set({ loading: false });
    }
  },

  addTask: async (taskData) => {
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || '',
          assignee: taskData.assignee || '',
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date || '',
          tags: taskData.tags || [],
          status: taskData.status || 'pending',
          team_id: get().activeTeam,
        }),
      });
      const newTask = await res.json();
      newTask.tags = Array.isArray(newTask.tags) ? newTask.tags : JSON.parse(newTask.tags || '[]');
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  },

  updateTask: async (id, updates) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      updated.tags = Array.isArray(updated.tags) ? updated.tags : JSON.parse(updated.tags || '[]');
      set((state) => ({ tasks: state.tasks.map(t => t.id === id ? updated : t) }));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
      set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),
}));

export default useStore;