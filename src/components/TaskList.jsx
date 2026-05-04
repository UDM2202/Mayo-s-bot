import { useState } from 'react';

function TaskList({ team }) {
  const [tasks] = useState([
    { 
      id: 1, 
      title: 'Implement user authentication', 
      assignee: 'John',
      status: 'in-progress',
      priority: 'high',
      dueDate: 'Jan 15',
    },
    { 
      id: 2, 
      title: 'Design landing page mockup', 
      assignee: 'Sarah',
      status: 'pending',
      priority: 'medium',
      dueDate: 'Jan 18',
    },
    { 
      id: 3, 
      title: 'Fix API response timeout', 
      assignee: 'Mike',
      status: 'blocked',
      priority: 'high',
      dueDate: 'Jan 14',
    },
  ]);

  const statusConfig = {
    'completed': { emoji: '✅', color: 'text-green-400 bg-green-400/10' },
    'in-progress': { emoji: '🔄', color: 'text-blue-400 bg-blue-400/10' },
    'pending': { emoji: '⏳', color: 'text-yellow-400 bg-yellow-400/10' },
    'blocked': { emoji: '🚫', color: 'text-red-400 bg-red-400/10' },
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition cursor-pointer group">
          <div className="flex items-center gap-4">
            {/* Checkbox */}
            <div className="w-5 h-5 rounded border border-slate-600 group-hover:border-purple-400 transition"></div>
            
            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{task.title}</h3>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                <span>👤 {task.assignee}</span>
                <span>📅 {task.dueDate}</span>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].color}`}>
              {statusConfig[task.status].emoji} {task.status}
            </span>

            {/* Priority */}
            <span className={`text-xs px-2 py-1 rounded ${
              task.priority === 'high' ? 'text-red-400 bg-red-400/10' : 'text-yellow-400 bg-yellow-400/10'
            }`}>
              {task.priority}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskList;