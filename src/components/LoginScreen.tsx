import React, { useState, useEffect } from 'react';
import { getSupabase, getSupabaseConfig, saveConnectionConfig } from '../lib/supabase';
import { LogIn, Key, Settings, AlertCircle, CheckCircle2, Shield, Loader2, Info, Eye, EyeOff, Sparkles, Mail, Lock, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Credentials config
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isConfigOpen, setIsConfigOpen] = useState(!supabaseConfig.isConfigured);
  const [tempUrl, setTempUrl] = useState(supabaseConfig.url);
  const [tempKey, setTempKey] = useState(supabaseConfig.publishableKey);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-fill configuration placeholders if VITE_ keys present
  useEffect(() => {
    const currentConfig = getSupabaseConfig();
    setSupabaseConfig(currentConfig);
    setTempUrl(currentConfig.url);
    setTempPublishableKey(currentConfig.publishableKey);
    setIsConfigOpen(!currentConfig.isConfigured);
  }, []);

  function setTempPublishableKey(key: string) {
    setTempKey(key);
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!tempUrl.startsWith('https://')) {
      setErrorMsg('Supabase URL must start with https://');
      return;
    }

    const success = saveConnectionConfig(tempUrl, tempKey);
    if (success) {
      setSuccessMsg('Supabase DB credentials saved and connected successfully!');
      setSupabaseConfig(getSupabaseConfig());
      setTimeout(() => {
        setIsConfigOpen(false);
        setSuccessMsg(null);
      }, 1000);
    } else {
      setErrorMsg('Failed to initialize Supabase with those credentials. Inspect the keys for typos.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const client = getSupabase();
    if (!client) {
      setErrorMsg('Please configure your Supabase Project settings below to initiate Auth!');
      setIsConfigOpen(true);
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: username || email.split('@')[0],
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Registration successful! Connecting you to FoodFix...');
          setTimeout(() => {
            onLoginSuccess(data.user?.email || email);
          }, 1000);
        } else {
          setSuccessMsg('Account created successfully! Please check your email inbox to verify.');
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setSuccessMsg(`Welcome to FoodFix, ${data.user?.user_metadata?.display_name || data.user?.email}!`);
        setTimeout(() => {
          onLoginSuccess(data.user?.email || email);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative colored blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* Branding Title */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3.5 bg-orange-500/10 rounded-3xl border border-orange-500/20 mb-4"
          >
            <Sparkles className="h-8 w-8 text-orange-500" />
          </motion.div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Food<span className="text-orange-500">Fix</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Join the premium food delivery & quality guarantee ecosystem.
          </p>
        </div>

        {/* Auth status banners */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-950/40 border border-red-500/30 text-red-200 rounded-2xl text-xs flex gap-3 items-start leading-relaxed shadow-lg font-medium"
          >
            <AlertCircle className="shrink-0 h-4.5 w-4.5 text-red-500" />
            <div>{errorMsg}</div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-950/40 border border-green-500/35 text-green-200 rounded-2xl text-xs flex gap-3 items-start leading-relaxed shadow-lg font-medium"
          >
            <CheckCircle2 className="shrink-0 h-4.5 w-4.5 text-green-400" />
            <div>{successMsg}</div>
          </motion.div>
        )}

        {/* Main interactive Login card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6"
        >
          {/* Sign In / Sign Up toggler */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                !isSignUp ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                isSignUp ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Your Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <UserPlus size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-800 pl-10 p-3.5 rounded-2xl bg-slate-900/40 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-800 pl-10 p-3.5 rounded-2xl bg-slate-900/40 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-800 pl-10 pr-10 p-3.5 rounded-2xl bg-slate-900/40 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-250 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 transition duration-200 text-xs cursor-pointer mt-4"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-4.5 w-4.5 text-white" />
              ) : (
                <LogIn size={15} />
              )}
              <span>{isSignUp ? 'Create My Free Account' : 'Sign In and Start Ordering'}</span>
            </button>
          </form>

          {/* Quick toggle info */}
          <div className="text-center text-[11px] text-slate-500 font-medium">
            {isSignUp ? (
              <span>Already registered? <button onClick={() => setIsSignUp(false)} className="text-orange-500 hover:underline cursor-pointer">Sign In now</button></span>
            ) : (
              <span>New to FoodFix? <button onClick={() => setIsSignUp(true)} className="text-orange-500 hover:underline cursor-pointer">Create a free account</button></span>
            )}
          </div>

          {/* Inline client database settings portal */}
          <div className="border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="w-full flex items-center justify-between text-slate-500 hover:text-slate-300 transition text-[11px] font-semibold py-1 px-1.5 rounded-xl hover:bg-slate-900/30 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Settings size={13} className="text-slate-550" />
                Supabase Credentials Configuration
              </span>
              <span className="text-[9px] text-slate-400 flex items-center gap-1">
                {supabaseConfig.isConfigured ? (
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <span className="h-1 w-1 bg-green-500 rounded-full inline-block" /> Ready
                  </span>
                ) : (
                  'Pending'
                )}
                • {isConfigOpen ? 'Hide' : 'Review'}
              </span>
            </button>

            <AnimatePresence>
              {isConfigOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed flex gap-1.5 items-start">
                      <Info size={14} className="shrink-0 text-orange-500 mt-0.5" />
                      <span>
                        Please make sure your database credentials are right. They will be stored securely in the browser cache.
                      </span>
                    </p>

                    <form onSubmit={handleConfigSubmit} className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Supabase Project URL</label>
                        <input
                          type="text"
                          required
                          placeholder="https://yourprojid.supabase.co"
                          value={tempUrl}
                          onChange={(e) => setTempUrl(e.target.value)}
                          className="w-full font-mono text-[10px] border border-slate-800 p-2.5 rounded-xl text-slate-200 bg-slate-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Public Publishable Key</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={tempKey}
                          onChange={(e) => setTempKey(e.target.value)}
                          className="w-full font-mono text-[9px] border border-slate-800 p-2 rounded-xl text-slate-200 bg-slate-950 focus:outline-none focus:ring-1 focus:ring-orange-500 leading-normal"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-xl transition duration-200 text-[10px] cursor-pointer"
                      >
                        Apply DB Configuration
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>

      <div className="mt-12 text-slate-600 text-center text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1">
        <Shield size={12} className="text-slate-600" />
        Guaranteed Security & Customer Data Privacy Ecosystem
      </div>
    </div>
  );
};
