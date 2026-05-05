import { create } from 'zustand';

const API = '/api';

const useStore = create((set, get) => ({
  user: null,
  token: null,
  activeTeam: 'engineering',
  activeView: 'board',
  tasks: [],
  personalTasks: [],
  showMyTasks: false,
  loading: false,
  teams: [],
  pollingInterval: null,
  modalOpen: false,
  editingTask: null,
  isPaletteOpen: false,

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
      if (Array.isArray(data)) set({ teams: data });
    } catch (err) {}
  },

  loadTasks: async (teamId) => {
    const team = teamId || get().activeTeam;
    set({ loading: true });
    try {
      const res = await fetch(`${API}/tasks?team=${team}`, { headers: get().getHeaders() });
      if (!res.ok) { set({ loading: false }); return; }
      const data = await res.json();
      if (Array.isArray(data)) set({ tasks: data, loading: false });
      else set({ loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },

  loadMyTasks: async () => {
    const user = get().user;
    if (!user) return;
    const teams = get().teams;
    const allTasks = [];
    for (const t of teams) {
      const res = await fetch(`${API}/tasks?team=${t.id}`, { headers: get().getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) allTasks.push(...data);
      }
    }
    set({ personalTasks: allTasks.filter(task => task.assignee === user.username) });
  },

  toggleMyTasks: () => {
    const next = !get().showMyTasks;
    set({ showMyTasks: next });
    if (next) get().loadMyTasks();
    else get().loadTasks();
  },

  addTask: async (taskData) => {
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: get().getHeaders(),
      body: JSON.stringify(taskData),
    });
    get().loadTasks();
    get().fetchTeams();
  },

  updateTask: async (id, updates) => {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'PUT',
      headers: get().getHeaders(),
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
        personalTasks: state.personalTasks.map(t => t.id === id ? updated : t),
      }));
    }
  },

  deleteTask: async (id) => {
    await fetch(`${API}/tasks/${id}`, { method: 'DELETE', headers: get().getHeaders() });
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
      personalTasks: state.personalTasks.filter(t => t.id !== id),
    }));
  },

  moveTask: (id, newStatus) => get().updateTask(id, { status: newStatus }),

  joinTeam: async (teamId) => {
    await fetch('/api/teams/join', {
      method: 'POST',
      headers: get().getHeaders(),
      body: JSON.stringify({ team_id: teamId }),
    });
    get().fetchTeams();
  },
  leaveTeam: async (teamId) => {
    await fetch('/api/teams/leave', {
      method: 'POST',
      headers: get().getHeaders(),
      body: JSON.stringify({ team_id: teamId }),
    });
    get().fetchTeams();
  },
  createTeam: async (name) => {
    await fetch('/api/teams', {
      method: 'POST',
      headers: get().getHeaders(),
      body: JSON.stringify({ name }),
    });
    get().fetchTeams();
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