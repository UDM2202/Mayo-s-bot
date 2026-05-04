import { useState } from 'react';
import useStore from '../store/useStore';

const SUGGESTIONS = [
  'Show blocked tasks',
  'Create task: Review PR',
  'Who has the most tasks?',
  'Show tasks due this week',
  'Summarize team progress',
];

export default function AICommandBar() {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [response, setResponse] = useState(null);
  const [thinking, setThinking] = useState(false);
  const { tasks, activeTeam, openModal } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setThinking(true);
    setResponse(null);

    // Simulate AI processing
    await new Promise(r => setTimeout(r, 800));

    const input = prompt.toLowerCase();
    let result = '';

    // Team tasks
    const teamTasks = tasks.filter(t => t.team_id === activeTeam);

    // Simple AI logic
    if (input.includes('blocked')) {
      const blocked = teamTasks.filter(t => t.status === 'blocked');
      result = blocked.length > 0
        ? `🚫 ${blocked.length} blocked task(s):\n${blocked.map(t => `• ${t.title}`).join('\n')}`
        : '✅ No blocked tasks! Great job.';
    } 
    else if (input.includes('most task') || input.includes('overloaded')) {
      const counts = {};
      teamTasks.forEach(t => {
        if (t.assignee) counts[t.assignee] = (counts[t.assignee] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      result = sorted.length > 0
        ? `👤 Workload:\n${sorted.map(([name, count]) => `• ${name}: ${count} task(s)`).join('\n')}`
        : 'No assignments found.';
    }
    else if (input.includes('due this week') || input.includes('deadline')) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueSoon = teamTasks.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= now && d <= nextWeek;
      });
      result = dueSoon.length > 0
        ? `📅 Due this week:\n${dueSoon.map(t => `• ${t.title} (${t.due_date})`).join('\n')}`
        : 'No tasks due this week.';
    }
    else if (input.includes('summarize') || input.includes('progress')) {
      const total = teamTasks.length;
      const done = teamTasks.filter(t => t.status === 'completed').length;
      const inProg = teamTasks.filter(t => t.status === 'in-progress').length;
      const blocked = teamTasks.filter(t => t.status === 'blocked').length;
      const rate = total ? Math.round((done / total) * 100) : 0;
      result = `📊 ${activeTeam} Summary:\n✅ ${done} done | 🔄 ${inProg} in progress | 🚫 ${blocked} blocked\n📈 ${rate}% completion rate`;
    }
    else if (input.includes('create task') || input.includes('new task')) {
      const title = input.replace(/create task[:]?/i, '').replace(/new task[:]?/i, '').trim();
      if (title) {
        openModal();
        result = '📝 Opening task form...';
        setTimeout(() => setPrompt(title), 100);
      } else {
        result = 'Please specify a task title. Example: "Create task: Fix login bug"';
      }
    }
    else if (input.includes('show') || input.includes('list')) {
      const pending = teamTasks.filter(t => t.status === 'pending');
      result = `📋 ${pending.length} tasks in To Do:\n${pending.slice(0, 5).map(t => `• ${t.title}`).join('\n')}${pending.length > 5 ? `\n...and ${pending.length - 5} more` : ''}`;
    }
    else {
      result = `🤔 I can help with:\n• "Show blocked tasks"\n• "Who has the most tasks?"\n• "Summarize team progress"\n• "Create task: [title]"\n• "Show tasks due this week"`;
    }

    setResponse(result);
    setThinking(false);
    setPrompt('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className={`
        relative rounded-2xl transition-all duration-500
        ${isFocused 
          ? 'bg-slate-800 border border-purple-500/20 shadow-lg shadow-purple-500/5' 
          : 'bg-slate-800/50 border border-slate-700/50'
        }
      `}>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className={`
            w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
            ${isFocused 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20' 
              : 'bg-slate-700'
            }
          `}>
            <span className="text-sm">{thinking ? '💭' : '🧠'}</span>
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Ask AI: Show blocked tasks, who's overloaded, create task..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            disabled={thinking}
          />

          <button
            type="submit"
            disabled={!prompt.trim() || thinking}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            ↑
          </button>
        </div>

        {/* Suggestions */}
        {isFocused && !prompt && !response && (
          <div className="px-5 pb-4 border-t border-slate-700/50">
            <div className="pt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {thinking && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="animate-spin">⏳</span>
              Thinking...
            </div>
          </div>
        )}
      </form>

      {/* AI Response */}
      {response && (
        <div className="mt-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">🤖</span>
            <div className="flex-1">
              <p className="text-sm text-slate-300 whitespace-pre-line">{response}</p>
            </div>
            <button 
              onClick={() => setResponse(null)} 
              className="text-slate-600 hover:text-slate-400 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}