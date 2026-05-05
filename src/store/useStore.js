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

  getHeaders: () => {
    const { token } = get();
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  },

  fetchTeams: async () => {
    try {
      const res = await fetch('/api/teams', { headers: get().getHeaders() });
      const data = await res.json();
      set({ teams: data });
      const current = get().activeTeam;
      if (data.length > 0 && !data.find(t => t.id === current)) {
        set({ activeTeam: data[0].id });
        if (!get().showMyTasks) get().loadTasks(data[0].id);
      }
    } catch (err) { console.error('fetchTeams error:', err); }
  },

  loadTasks: async (teamId) => {
    const team = teamId || get().activeTeam;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks?team=${team}`, { headers: get().getHeaders() });
      const data = await res.json();
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error('loadTasks error:', err);
      set({ loading: false });
    }
  },

  loadMyTasks: async () => {
    const user = get().user;
    if (!user) return;
    // My Tasks = all team tasks where assignee == current user
    try {
      // We'll fetch all teams' tasks? Actually only active team? My Tasks should be across all teams.
      // Simpler: fetch all tasks for all teams the user belongs to, then filter.
      const teams = get().teams;
      if (teams.length === 0) return;
      const allTasks = [];
      for (const t of teams) {
        const res = await fetch(`${API}/tasks?team=${t.id}`, { headers: get().getHeaders() });
        const teamTasks = await res.json();
        allTasks.push(...teamTasks);
      }
      set({ personalTasks: allTasks.filter(task => task.assignee === user.username) });
    } catch (err) { console.error('loadMyTasks error:', err); }
  },

  toggleMyTasks: () => {
    const next = !get().showMyTasks;
    set({ showMyTasks: next });
    if (next) get().loadMyTasks();
    else get().loadTasks();
  },

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

  joinTeam: async (teamId) => {
    try {
      await fetch('/api/teams/join', {
        method: 'POST',
        headers: get().getHeaders(),
        body: JSON.stringify({ team_id: teamId }),
      });
      get().fetchTeams();
    } catch (err) { console.error(err); }
  },

  leaveTeam: async (teamId) => {
    try {
      await fetch('/api/teams/leave', {
        method: 'POST',
        headers: get().getHeaders(),
        body: JSON.stringify({ team_id: teamId }),
      });
      get().fetchTeams();
    } catch (err) { console.error(err); }
  },

  createTeam: async (name) => {
    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: get().getHeaders(),
        body: JSON.stringify({ name }),
      });
      get().fetchTeams();
    } catch (err) { console.error(err); }
  },

  setActiveTeam: (teamId) => {
    set({ activeTeam: teamId });
    if (!get().showMyTasks) get().loadTasks(teamId);
    else get().loadMyTasks();
  },

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