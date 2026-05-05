import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import CommandPalette from './components/CommandPalette';
import TaskModal from './components/TaskModal';
import Login from './components/Login';
import useStore from './store/useStore';

export default function App() {
  const {
    isPaletteOpen,
    setPaletteOpen,
    user,
    loadUser,
    logout
  } = useStore();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // On mount, try to load existing user from localStorage
  useEffect(() => {
    loadUser();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(!isPaletteOpen);
    }
  }, [isPaletteOpen, setPaletteOpen]);

  // If no user, show login page
  if (!user) return <Login onLogin={() => loadUser()} />;

  return (
    <div className="flex h-screen bg-surface-1 text-slate-200 overflow-hidden" onKeyDown={handleKeyDown} tabIndex={-1}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <Canvas onMenuClick={() => setMobileMenuOpen(true)} />
      <CommandPalette />
      <TaskModal />
    </div>
  );
}