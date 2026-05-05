import { useState } from 'react';
import useStore from '../store/useStore';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState('engineering');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? JSON.stringify({ username, password, team_id: team })
      : JSON.stringify({ username, password });
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin();   // calls loadUser() which reads the token
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // JSX unchanged from previous version
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      {/* ... same JSX ... */}
    </div>
  );
}