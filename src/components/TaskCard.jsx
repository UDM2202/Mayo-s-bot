import { useState } from 'react';
import useStore from '../store/useStore';

const PRIORITY_CONFIG = {
  critical: { ring: 'ring-red-500/30', glow: 'shadow-red-500/5' },
  high: { ring: 'ring-orange-500/20', glow: 'shadow-orange-500/5' },
  medium: { ring: 'ring-transparent', glow: '' },
  low: { ring: 'ring-transparent', glow: '' },
};

const STATUS_BADGES = {
  'in-progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function TaskCard({ task }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { updateTask, deleteTask, moveTask, openModal } = useStore();

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStatusChange = (newStatus) => {
    moveTask(task.id, newStatus);
    setShowMenu(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        relative p-4 rounded-xl border transition-all duration-300 cursor-grab active:cursor-grabbing
        bg-surface-3/60 hover:bg-surface-3 border-white/[0.04] hover:border-white/[0.08]
        ${PRIORITY_CONFIG[task.priority].ring} ring-1
        hover:shadow-xl ${PRIORITY_CONFIG[task.priority].glow}
        group
        ${task.status === 'completed' ? 'opacity-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="space-y-3">
        <p className={`text-sm font-medium leading-snug ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {task.title}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {task.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-slate-500 border border-white/[0.04]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-[8px] font-bold text-white">
              {task.assignee?.[0] || '?'}
            </div>
            <span className="text-[11px] text-slate-500">{task.dueDate}</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGES[task.status]}`}>
            {task.status}
          </span>
        </div>
      </div>

      {/* Action buttons on hover */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openModal(task); }}
            className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.1] transition text-xs"
          >
            ✎
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.1] transition text-xs"
            >
              ⋯
            </button>
            
            {/* Context menu */}
            {showMenu && (
              <div className="absolute right-0 top-8 w-40 bg-surface-2 border border-white/[0.06] rounded-lg shadow-xl z-50 py-1">
                {['pending', 'in-progress', 'review', 'blocked', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(status); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition"
                  >
                    Move to {status}
                  </button>
                ))}
                <div className="border-t border-white/[0.04] my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/[0.04] transition"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}