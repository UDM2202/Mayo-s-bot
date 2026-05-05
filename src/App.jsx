import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import CommandPalette from './components/CommandPalette';
import TaskModal from './components/TaskModal';
import Login from './components/Login';
import useStore from './store/useStore';

export default function App() {
  const { user, loadUser, startPolling, stopPolling } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();   // checks localStorage, sets user if found
  }, []);

  useEffect(() => {
    if (user) startPolling();
    return () => stopPolling();
  }, [user]);

  if (!user) return <Login onLogin={() => loadUser()} />;

  return (
    <div className="flex h-screen bg-surface-1 text-slate-200 overflow-hidden">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <Canvas onMenuClick={() => setMobileMenuOpen(true)} />
      <CommandPalette />
      <TaskModal />
    </div>
  );
}