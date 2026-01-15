import React, { useState } from 'react';
import Background from '../components/Background';
import { checkUserExists, loginUser, registerUser } from '../services/firebase';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

type Step = 'username' | 'login' | 'register';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<Step>('username');
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Check Username
  const handleCheckUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const exists = await checkUserExists(username);
      if (exists) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await loginUser(username, password);
      onLogin(user);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please create a password");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await registerUser(username, password, avatar);
      onLogin(user);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: any) => {
    console.error("Auth Error:", err);
    let errorMessage = err.message;
    
    if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = (
          <span>
            <b>Backend not reachable.</b>
            <br />
            Make sure server is running on port 3001.
          </span>
        ) as any;
    }
    
    if (err.message && err.message.includes('offline')) {
        errorMessage = "You are offline. Please check your internet connection.";
    }

    setError(errorMessage);
  };

  const resetFlow = () => {
    setStep('username');
    setPassword('');
    setAvatar('');
    setError('');
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <Background />
      
      <div className="z-10 bg-slate-800/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TeleClone</h1>
          <p className="text-slate-400">
            {step === 'username' && "Enter your username to begin"}
            {step === 'login' && `Welcome back, @${username}!`}
            {step === 'register' && `Create account for @${username}`}
          </p>
        </div>

        {/* Dynamic Form */}
        <div className="space-y-6">
          
          {/* STEP 1: USERNAME */}
          {step === 'username' && (
            <form onSubmit={handleCheckUsername} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                    <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="@username"
                    autoComplete="off"
                    autoFocus
                    />
                </div>
                <Button loading={loading} text="Next" />
            </form>
          )}

          {/* STEP 2: LOGIN */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter password"
                    autoFocus
                    />
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={resetFlow} className="w-1/3 px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition">Back</button>
                    <Button loading={loading} text="Login" className="flex-1" />
                </div>
            </form>
          )}

          {/* STEP 3: REGISTER */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Create Password</label>
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="New password"
                    autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Avatar URL (Optional)</label>
                    <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="https://..."
                    />
                </div>
                <div className="flex gap-3 mt-2">
                    <button type="button" onClick={resetFlow} className="w-1/3 px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition">Back</button>
                    <Button loading={loading} text="Create Account" color="green" className="flex-1" />
                </div>
            </form>
          )}

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-pulse">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Button Component
const Button = ({ loading, text, color = 'blue', className = '' }: { loading: boolean, text: string, color?: 'blue'|'green', className?: string }) => {
    const baseColor = color === 'blue' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30' : 'bg-green-600 hover:bg-green-500 shadow-green-600/30';
    
    return (
        <button
            type="submit"
            disabled={loading}
            className={`w-full ${baseColor} text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
        >
            {loading ? (
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
            <>
                <span>{text}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </>
            )}
        </button>
    )
}

export default Login;