import { useState } from 'react';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState('engineering');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { username, password, team_id: team } : { username, password };
    
    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-3xl">⬡</span>
          <h1 className="text-2xl font-bold text-white mt-2">Task<span className="text-purple-400">On</span></h1>
          <p className="text-slate-500 text-sm mt-1">{isRegister ? 'Create account' : 'Sign in'}</p>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500/50" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500/50" required />
          {isRegister && (
            <input type="text" value={team} onChange={e => setTeam(e.target.value)} placeholder="Team name"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500/50" />
          )}
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-medium transition">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center text-sm text-slate-400 hover:text-purple-400 mt-4 transition">
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}