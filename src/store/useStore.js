import { create } from 'zustand';

const API = '/api';

const useStore = create((set, get) => ({
  // ── User ──
  user: null,
  activeTeam: 'engineering',
  activeView: 'board',
  tasks: [],
  loading: false,
  modalOpen: false,
  editingTask: null,
  isPaletteOpen: false,

  setActiveView: (view) => set({ activeView: view }),
  setPaletteOpen: (val) => set({ isPaletteOpen: val }),
  openModal: (task = null) => set({ modalOpen: true, editingTask: task }),
  closeModal: () => set({ modalOpen: false, editingTask: null }),

  // Load user from localStorage, set team, then load tasks
  loadUser: () => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const user = JSON.parse(saved);
      set({ user, activeTeam: user.team_id || 'engineering' });
      get().loadTasks();
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null, tasks: [], activeTeam: 'engineering' });
  },

  loadTasks: async () => {
    const team = get().activeTeam;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks?team=${team}`);
      const data = await res.json();
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  addTask: async (taskData) => {
    const team = get().activeTeam;
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, team_id: team }),
      });
      const newTask = await res.json();
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    } catch (err) {
      console.error(err);
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
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err) {
      console.error(err);
    }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    } catch (err) {
      console.error(err);
    }
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),
}));

export default useStore;