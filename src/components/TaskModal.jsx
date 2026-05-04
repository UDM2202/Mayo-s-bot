import { useState, useEffect } from 'react';
import useStore from '../store/useStore';

const TEAM_MEMBERS = {
  engineering: ['John', 'Mike', 'Alex'],
  design: ['Sarah', 'Lisa'],
  marketing: ['Emma', 'Tom'],
};

export default function TaskModal() {
  const { modalOpen, editingTask, closeModal, addTask, updateTask, activeTeam } = useStore();
  const [form, setForm] = useState({
    title: '',
    assignee: '',
    priority: 'medium',
    due_date: '',
    tags: [],
    description: '',
    status: 'pending',
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title || '',
        assignee: editingTask.assignee || '',
        priority: editingTask.priority || 'medium',
        due_date: editingTask.due_date || '',
        tags: editingTask.tags || [],
        description: editingTask.description || '',
        status: editingTask.status || 'pending',
      });
    } else {
      setForm({
        title: '',
        assignee: '',
        priority: 'medium',
        due_date: '',
        tags: [],
        description: '',
        status: 'pending',
      });
    }
  }, [editingTask, modalOpen]);

  if (!modalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const taskData = {
      ...form,
      team_id: activeTeam,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    closeModal();
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tagToRemove) });
  };

  const members = TEAM_MEMBERS[activeTeam] || [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={closeModal} />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[90vh] overflow-y-auto z-50">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <button 
              onClick={closeModal} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to be done?"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
                required
                autoFocus
              />
            </div>

            {/* Assignee + Priority */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee - Custom dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Assignee</label>
                <div className="relative">
                  <select
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Priority - Custom dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Priority</label>
                <div className="relative">
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition cursor-pointer"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Due Date + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition [color-scheme:dark]"
                />
              </div>
              {editingTask && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition cursor-pointer"
                    >
                      <option value="pending">⏳ To Do</option>
                      <option value="in-progress">🔄 In Progress</option>
                      <option value="review">👁 Review</option>
                      <option value="blocked">🚫 Blocked</option>
                      <option value="completed">✅ Done</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                  >
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)} 
                      className="hover:text-white transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder='Type tag and press Enter...'
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Add more details..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-purple-500/20"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}