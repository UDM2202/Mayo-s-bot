import { create } from 'zustand';

const API = '/api';

const useStore = create((set, get) => ({
  // state
  user: null,
  token: null,
  activeTeam: 'engineering',
  activeView: 'board',
  isPaletteOpen: false,
  modalOpen: false,
  editingTask: null,
  tasks: [],
  personalTasks: [],
  showMyTasks: false,
  loading: false,
  teams: [],
  pollingInterval: null,

  setActiveView: (view) => set({ activeView: view }),
  setPaletteOpen: (val) => set({ isPaletteOpen: val }),
  openModal: (task = null) => set({ modalOpen: true, editingTask: task }),
  closeModal: () => set({ modalOpen: false, editingTask: null }),

  getHeaders: () => {
    const { token } = get();
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  },

  loadUser: () => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        set({ user, token: user.token, activeTeam: user.team_id || 'engineering' });
        get().fetchTeams();
        get().loadTasks();
      } catch (e) {
        localStorage.removeItem('user');
        set({ user: null, token: null });
      }
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    get().stopPolling();
    set({ user: null, token: null, tasks: [], personalTasks: [], teams: [], activeTeam: 'engineering', showMyTasks: false });
  },

  fetchTeams: async () => {
    try {
      const res = await fetch('/api/teams', { headers: get().getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      set({ teams: data });
      const current = get().activeTeam;
      if (data.length > 0 && !data.find(t => t.id === current)) {
        set({ activeTeam: data[0].id });
        if (!get().showMyTasks) get().loadTasks(data[0].id);
      }
    } catch (err) { /* ignore */ }
  },

  loadTasks: async (teamId) => {
    const team = teamId || get().activeTeam;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks?team=${team}`, { headers: get().getHeaders() });
      if (!res.ok) { set({ loading: false }); return; }
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ tasks: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error('loadTasks error:', err);
      set({ loading: false });
    }
  },

  loadMyTasks: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const teams = get().teams;
      if (teams.length === 0) return;
      const allTasks = [];
      for (const t of teams) {
        const res = await fetch(`${API}/tasks?team=${t.id}`, { headers: get().getHeaders() });
        if (res.ok) {
          const teamTasks = await res.json();
          if (Array.isArray(teamTasks)) allTasks.push(...teamTasks);
        }
      }
      set({ personalTasks: allTasks.filter(task => task.assignee === user.username) });
    } catch (err) { /* ignore */ }
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
    } catch (err) { /* ignore */ }
  },

  updateTask: async (id, updates) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: 'PUT',
        headers: get().getHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          tasks: state.tasks.map(t => (t.id === id ? updated : t)),
          personalTasks: state.personalTasks.map(t => (t.id === id ? updated : t)),
        }));
      }
    } catch (err) { /* ignore */ }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: 'DELETE', headers: get().getHeaders() });
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        personalTasks: state.personalTasks.filter(t => t.id !== id),
      }));
    } catch (err) { /* ignore */ }
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),

  joinTeam: async (teamId) => {
    try {
      await fetch('/api/teams/join', { method: 'POST', headers: get().getHeaders(), body: JSON.stringify({ team_id: teamId }) });
      get().fetchTeams();
    } catch (err) { /* ignore */ }
  },

  leaveTeam: async (teamId) => {
    try {
      await fetch('/api/teams/leave', { method: 'POST', headers: get().getHeaders(), body: JSON.stringify({ team_id: teamId }) });
      get().fetchTeams();
    } catch (err) { /* ignore */ }
  },

  createTeam: async (name) => {
    try {
      await fetch('/api/teams', { method: 'POST', headers: get().getHeaders(), body: JSON.stringify({ name }) });
      get().fetchTeams();
    } catch (err) { /* ignore */ }
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