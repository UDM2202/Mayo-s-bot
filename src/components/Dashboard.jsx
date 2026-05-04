import { useState } from 'react';
import Sidebar from './Sidebar';
import TaskList from './TaskList';
import AICommandBar from './AICommandBar';

function Dashboard() {
  const [currentTeam, setCurrentTeam] = useState('engineering');

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar currentTeam={currentTeam} onTeamChange={setCurrentTeam} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white capitalize">{currentTeam} Team</h1>
              <p className="text-slate-400 text-sm mt-1">11 members • 3 active tasks</p>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2">
              <span>+</span> New Task
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* AI Command Bar - Centered and Clean */}
          <div className="max-w-4xl mx-auto mb-8">
            <AICommandBar />
          </div>

          {/* Task Sections */}
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Active Tasks</h2>
              <div className="flex gap-2">
                <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">All</button>
                <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">In Progress</button>
                <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Blocked</button>
              </div>
            </div>
            <TaskList team={currentTeam} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;