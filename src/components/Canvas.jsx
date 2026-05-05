import { useMemo } from 'react';
import useStore from '../store/useStore';
import AICommandBar from './AICommandBar';
import TaskCard from './TaskCard';

const COLUMNS = [
  { id: 'pending', label: 'To Do', color: '#64748b' },
  { id: 'in-progress', label: 'In Progress', color: '#818cf8' },
  { id: 'review', label: 'Review', color: '#fbbf24' },
  { id: 'blocked', label: 'Blocked', color: '#f87171' },
  { id: 'completed', label: 'Done', color: '#34d399' },
];

function BoardView({ tasks, moveTask, openModal }) {
  const grouped = COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.id),
  }));

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) moveTask(taskId, status);
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 md:min-w-max">
      {grouped.map(col => (
        <div key={col.id} className="kanban-column md:w-72 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{col.label}</h3>
              <span className="text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded-full">{col.tasks.length}</span>
            </div>
          </div>
          <div
            className="flex-1 space-y-2 overflow-y-auto min-h-[200px] rounded-xl p-1"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {col.tasks.map(task => <TaskCard key={task.id} task={task} />)}
            {col.tasks.length === 0 && (
              <div className="h-20 rounded-xl flex items-center justify-center text-xs text-slate-700 border border-dashed border-slate-800">
                Drop here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ tasks }) {
  return (
    <div className="space-y-2">
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-600">No tasks yet. Click + to create one.</div>
      )}
    </div>
  );
}

function TimelineView({ tasks }) {
  const sorted = [...tasks].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        {sorted.map(task => (
          <div key={task.id} className="relative pl-8 pb-6 border-l-2 border-slate-700 last:border-transparent">
            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-purple-500" />
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-white font-medium">{task.title}</h3>
                <span className="text-xs text-slate-500">{task.due_date || 'No date'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{task.assignee || 'Unassigned'} • {task.status} • {task.priority}</p>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div className="text-center py-12 text-slate-600">No tasks with dates.</div>}
      </div>
    </div>
  );
}

function InsightsView({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  const assigneeCounts = {};
  tasks.forEach(t => { if (t.assignee) assigneeCounts[t.assignee] = (assigneeCounts[t.assignee] || 0) + 1; });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Done', value: completed, color: 'text-green-400' },
          { label: 'Active', value: inProgress, color: 'text-blue-400' },
          { label: 'Blocked', value: blocked, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-3">Completion Rate</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-sm font-bold text-white">{rate}%</span>
        </div>
      </div>
      {Object.keys(assigneeCounts).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-3">Workload</h3>
          <div className="space-y-3">
            {Object.entries(assigneeCounts).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-20 truncate">{name}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canvas({ onMenuClick }) {

 const { tasks, personalTasks, showMyTasks, moveTask, activeTeam, activeView, openModal } = useStore();

const displayTasks = showMyTasks ? personalTasks : tasks.filter(t => t.team_id === activeTeam);

  const viewComponents = { board: BoardView, list: ListView, timeline: TimelineView, insights: InsightsView };
  const ActiveView = viewComponents[activeView] || BoardView;

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/[0.04] bg-surface-2/50 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <button className="mobile-menu-btn text-xl text-slate-400 hover:text-white p-2" onClick={onMenuClick}>
            ☰
          </button>
          <h1 className="text-base md:text-lg font-semibold text-white capitalize truncate">
            {activeView === 'insights' ? `${activeTeam} Insights` : activeTeam}
          </h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md hidden sm:inline">
            {displayTasks.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Export button */}
         <a href={`/api/tasks/export/csv?team=${activeTeam}`}
            className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition hidden sm:inline-flex items-center gap-1"
            download
          >
            📥 <span className="hidden lg:inline">Export</span>
          </a>
          {/* New Task button */}
          <button
            onClick={() => openModal()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-1"
          >
            + <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </header>

      {/* AI COMMAND BAR */}
      <div className="px-4 md:px-8 py-4 flex-shrink-0">
        <AICommandBar />
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto px-4 md:px-8 pb-8">
        <ActiveView tasks={displayTasks} moveTask={moveTask} openModal={openModal} />
      </div>
    </main>
  );
}