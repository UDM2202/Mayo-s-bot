import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

const COMMANDS = [
  { id: 'create-task', label: 'Create New Task', action: 'create', icon: '＋', shortcut: '⌘N' },
  { id: 'view-board', label: 'Switch to Board View', action: 'board', icon: '▦', shortcut: '⌘1' },
  { id: 'view-list', label: 'Switch to List View', action: 'list', icon: '☰', shortcut: '⌘2' },
  { id: 'eng-team', label: 'Engineering Team', action: 'team-engineering', icon: '⚡', shortcut: '' },
  { id: 'des-team', label: 'Design Team', action: 'team-design', icon: '🎨', shortcut: '' },
  { id: 'mkt-team', label: 'Marketing Team', action: 'team-marketing', icon: '📢', shortcut: '' },
];

export default function CommandPalette() {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const { isPaletteOpen, setPaletteOpen, setActiveView, setActiveTeam, openModal } = useStore();

  useEffect(() => {
    if (isPaletteOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const filtered = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.action.toLowerCase().includes(search.toLowerCase())
  );

  const executeCommand = (command) => {
    switch (command.action) {
      case 'create':
        openModal();
        break;
      case 'board':
        setActiveView('board');
        break;
      case 'list':
        setActiveView('list');
        break;
      case 'team-engineering':
        setActiveTeam('engineering');
        break;
      case 'team-design':
        setActiveTeam('design');
        break;
      case 'team-marketing':
        setActiveTeam('marketing');
        break;
    }
    setPaletteOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setPaletteOpen(false);
    }
  };

  if (!isPaletteOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50" 
        onClick={() => setPaletteOpen(false)} 
      />
      
      {/* Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[520px] z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <kbd className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-md font-mono border border-slate-700">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <div className="max-h-64 overflow-y-auto py-2">
            {filtered.length > 0 ? (
              filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  className={`
                    w-full flex items-center gap-3 px-5 py-3 transition-all duration-75 text-left
                    ${i === selectedIndex 
                      ? 'bg-purple-500/10 text-white' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }
                  `}
                >
                  <span className="text-lg w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg flex-shrink-0">
                    {cmd.icon}
                  </span>
                  <span className="text-sm flex-1 font-medium">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-md font-mono border border-slate-700">
                      {cmd.shortcut}
                    </kbd>
                  )}
                  {i === selectedIndex && (
                    <span className="text-xs text-purple-400">↵</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-slate-500 text-sm">No commands found</p>
                <p className="text-slate-600 text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-4 text-[10px] text-slate-600">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </>
  );
}