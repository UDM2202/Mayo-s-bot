import { useState } from 'react';
import useStore from '../store/useStore';

const VIEWS = [
  { id: 'board', label: 'Board', icon: '⊞' },
  { id: 'list', label: 'List', icon: '≡' },
  { id: 'timeline', label: 'Timeline', icon: '◷' },
  { id: 'insights', label: 'Insights', icon: '◆' },
];

const TEAM_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171'];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    activeView, setActiveView,
    activeTeam, setActiveTeam,
    teams, createTeam, joinTeam,
    showMyTasks, toggleMyTasks,
  } = useStore();

  const content = (
    <div className={`flex flex-col h-full border-r border-white/[0.04] bg-surface-2/95 backdrop-blur-xl ${collapsed ? 'w-16' : 'w-60'} transition-all duration-300`}>
      <div className="h-16 flex items-center px-5 border-b border-white/[0.04]">
        <span className="text-xl">⬡</span>
        {!collapsed && <span className="ml-3 font-semibold text-white">Task<span className="text-purple-400">On</span></span>}
      </div>

      <nav className="py-4 px-3 space-y-1">
        {!collapsed && <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Views</p>}
        {VIEWS.map(view => (
          <button key={view.id} onClick={() => { setActiveView(view.id); onMobileClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${activeView === view.id ? 'text-white bg-white/[0.06]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}>
            <span className="text-lg w-6 text-center">{view.icon}</span>
            {!collapsed && <span className="flex-1 text-left font-medium">{view.label}</span>}
            {activeView === view.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full" />}
          </button>
        ))}

        <button onClick={() => { toggleMyTasks(); onMobileClose?.(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${showMyTasks ? 'text-white bg-white/[0.06]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}>
          <span className="text-lg w-6 text-center">👤</span>
          {!collapsed && <span className="flex-1 text-left font-medium">My Tasks</span>}
          {showMyTasks && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full" />}
        </button>
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.04] flex-1 overflow-y-auto">
        {!collapsed && <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Teams</p>}
        {teams.map((team, i) => (
          <button key={team.id} onClick={() => { setActiveTeam(team.id); onMobileClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-all ${activeTeam === team.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }} />
            {!collapsed && <span className={`text-sm capitalize ${activeTeam === team.id ? 'text-white' : 'text-slate-500'}`}>{team.name}</span>}
          </button>
        ))}
        {!collapsed && (
          <div className="mt-2 space-y-1">
            <button onClick={() => { const name = prompt('Create new team name:'); if (name) createTeam(name); }}
              className="w-full text-left text-xs text-slate-500 hover:text-slate-300 px-3 py-1 transition">
              + Create Team
            </button>
            <button onClick={() => { const teamId = prompt('Enter team ID to join:'); if (teamId) joinTeam(teamId); }}
              className="w-full text-left text-xs text-slate-500 hover:text-slate-300 px-3 py-1 transition">
              + Join Team
            </button>
          </div>
        )}
      </div>

      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-white/[0.06] rounded-full flex items-center justify-center text-xs text-slate-500 hover:text-white desktop-only">
        {collapsed ? '→' : '←'}
      </button>
    </div>
  );

  return (
    <>
      <div className="hidden md:block relative">{content}</div>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />}
      <div className={`md:hidden fixed z-50 left-0 top-0 bottom-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {content}
      </div>
    </>
  );
}