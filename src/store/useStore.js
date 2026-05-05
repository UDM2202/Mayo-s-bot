import { create } from 'zustand';

const API = '/api';

const useStore = create((set, get) => ({
  // ── User & View ──
  user: null,
  activeView: 'board',
  activeTeam: 'engineering',
  isPaletteOpen: false,
  modalOpen: false,
  editingTask: null,

  // ── Tasks ──
  tasks: [],
  personalTasks: [],
  showMyTasks: false,       // toggle for personal task view
  loading: false,

  // ── Teams ──
  teams: [],

  // ── Actions ──
  setActiveView: (view) => set({ activeView: view }),
  setPaletteOpen: (val) => set({ isPaletteOpen: val }),
  openModal: (task = null) => set({ modalOpen: true, editingTask: task }),
  closeModal: () => set({ modalOpen: false, editingTask: null }),

  setActiveTeam: (team) => {
    set({ activeTeam: team });
    if (!get().showMyTasks) get().loadTasks();
  },

  // Load user from localStorage → set team → load everything
  loadUser: () => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const user = JSON.parse(saved);
      set({ user, activeTeam: user.team_id || 'engineering' });
      get().fetchTeams();
      get().loadTasks();
      get().loadMyTasks();
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null, tasks: [], personalTasks: [], teams: [], activeTeam: 'engineering' });
  },

  // Fetch all teams
  fetchTeams: async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      set({ teams: data });
    } catch (err) {
      console.error('fetchTeams error:', err);
    }
  },

  // Load tasks for the active team
  loadTasks: async () => {
    const team = get().activeTeam;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks?team=${team}`);
      const data = await res.json();
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error('loadTasks error:', err);
      set({ loading: false });
    }
  },

  // Load tasks assigned to the current user
  loadMyTasks: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const res = await fetch(`${API}/tasks?assignee=${user.username}`);
      const data = await res.json();
      set({ personalTasks: data });
    } catch (err) {
      console.error('loadMyTasks error:', err);
    }
  },

  // Toggle between team view and personal view
  toggleMyTasks: () => {
    const show = !get().showMyTasks;
    set({ showMyTasks: show });
    if (show) get().loadMyTasks();
    else get().loadTasks();
  },

  // Add task – force the team to the active team
  addTask: async (taskData) => {
    const team = get().activeTeam;
    try {
      await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, team_id: team }),
      });
      get().loadTasks();
      get().fetchTeams();   // in case a new team was created
    } catch (err) {
      console.error('addTask error:', err);
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
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        personalTasks: state.personalTasks.map(t => t.id === id ? updated : t),
      }));
    } catch (err) {
      console.error('updateTask error:', err);
    }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        personalTasks: state.personalTasks.filter(t => t.id !== id),
      }));
    } catch (err) {
      console.error('deleteTask error:', err);
    }
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),
}));

export default useStore;