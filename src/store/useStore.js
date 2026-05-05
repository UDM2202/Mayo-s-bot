import { create } from 'zustand';

const API = '/api';

const useStore = create((set, get) => ({
  // ── User & Auth ──
  user: null,
  token: null,
  activeTeam: 'engineering',
  activeView: 'board',
  isPaletteOpen: false,
  modalOpen: false,
  editingTask: null,

  // ── Tasks ──
  tasks: [],
  personalTasks: [],
  showMyTasks: false,
  loading: false,

  // ── Teams ──
  teams: [],

  // ── Polling ──
  pollingInterval: null,

  // ── Actions ──
  setActiveView: (view) => set({ activeView: view }),
  setPaletteOpen: (val) => set({ isPaletteOpen: val }),
  openModal: (task = null) => set({ modalOpen: true, editingTask: task }),
  closeModal: () => set({ modalOpen: false, editingTask: null }),

  loadUser: () => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const user = JSON.parse(saved);
      set({ user, token: user.token, activeTeam: user.team_id || 'engineering' });
      get().fetchTeams();
      get().loadTasks();
      if (get().showMyTasks) get().loadMyTasks();
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    get().stopPolling();
    set({ user: null, token: null, tasks: [], personalTasks: [], teams: [], activeTeam: 'engineering', showMyTasks: false });
  },

  // ── Auth header ──
  getHeaders: () => {
    const { token } = get();
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  },

  // ── Teams ──
  fetchTeams: async () => {
    try {
      const res = await fetch('/api/teams', { headers: get().getHeaders() });
      const data = await res.json();
      set({ teams: data });
    } catch (err) { /* ignore */ }
  },

  // ── Team tasks ──
  loadTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks`, { headers: get().getHeaders() });
      const data = await res.json();
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error('loadTasks error:', err);
      set({ loading: false });
    }
  },

  // ── My Tasks ──
  loadMyTasks: async () => {
    // "My Tasks" = team tasks where assignee == current user
    try {
      const res = await fetch(`${API}/tasks`, { headers: get().getHeaders() });   // get all team tasks
      const all = await res.json();
      const myTasks = all.filter(t => t.assignee === get().user?.username);
      set({ personalTasks: myTasks });
    } catch (err) { /* ignore */ }
  },

  toggleMyTasks: () => {
    const next = !get().showMyTasks;
    set({ showMyTasks: next });
    if (next) get().loadMyTasks();
    else get().loadTasks();
  },

  // ── CRUD ──
  addTask: async (taskData) => {
    try {
      await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: get().getHeaders(),
        body: JSON.stringify(taskData),
      });
      get().loadTasks();
      get().fetchTeams();
    } catch (err) { console.error(err); }
  },

  updateTask: async (id, updates) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: 'PUT',
        headers: get().getHeaders(),
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      set((state) => ({
        tasks: state.tasks.map(t => (t.id === id ? updated : t)),
        personalTasks: state.personalTasks.map(t => (t.id === id ? updated : t)),
      }));
    } catch (err) { console.error(err); }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: 'DELETE', headers: get().getHeaders() });
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        personalTasks: state.personalTasks.filter(t => t.id !== id),
      }));
    } catch (err) { console.error(err); }
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),

  // ── Polling ──
  startPolling: () => {
    get().stopPolling();
    const id = setInterval(() => {
      if (get().user) {
        get().loadTasks();
        if (get().showMyTasks) get().loadMyTasks();
      }
    }, 3000);
    set({ pollingInterval: id });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    set({ pollingInterval: null });
  },
}));

export default useStore;