import React, { useState, useEffect } from 'react';
import { getSupabase, getSupabaseConfig, saveConnectionConfig } from '../lib/supabase';
import { User, LogIn, LogOut, Key, Settings, AlertCircle, CheckCircle2, Shield, Loader2, Info, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupabaseAuthProps {
  onAuthChange?: (isLoggedIn: boolean, userEmail: string | null) => void;
}

export const SupabaseAuth = ({ onAuthChange }: SupabaseAuthProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Connection states
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [tempUrl, setTempUrl] = useState(supabaseConfig.url);
  const [tempPublishableKey, setTempPublishableKey] = useState(supabaseConfig.publishableKey);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = getSupabase();

  // Watch for Auth changes on mount
  useEffect(() => {
    if (!supabase) return;

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        onAuthChange?.(true, session.user.email ?? null);
      }
    });

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        onAuthChange?.(!!session, session?.user?.email ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClientRefTrigger(supabaseConfig.isConfigured)]);

  // Trigger effect helper when config status changes
  function supabaseClientRefTrigger(status: boolean) {
    return status;
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!tempUrl.startsWith('https://')) {
      setErrorMsg('Supabase URL must start with https://');
      return;
    }

    const success = saveConnectionConfig(tempUrl, tempPublishableKey);
    const newConfig = getSupabaseConfig();
    setSupabaseConfig(newConfig);

    if (success) {
      setSuccessMsg('Supabase database connection configured successfully!');
      // Force page reload or trigger updates to components in a split second
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      setErrorMsg('Failed to initialize Supabase with these credentials. Please check for spelling issues.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const client = getSupabase();
    if (!client) {
      setErrorMsg('Please configure your Supabase Project settings first using the Config panel below!');
      setIsConfigOpen(true);
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up logic with user_metadata option
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
          setSuccessMsg('Sign up successful! You are now logged in.');
          setUser(data.user);
          onAuthChange?.(true, data.user?.email ?? null);
        } else {
          setSuccessMsg('Registration submitted! Please check your email inbox to verify your account.');
        }
      } else {
        // Sign in logic
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        
        setSuccessMsg(`Welcome back, ${data.user?.user_metadata?.display_name || data.user?.email}!`);
        setUser(data.user);
        onAuthChange?.(true, data.user?.email ?? null);
        
        // Hide panel shortly
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabase();
    if (!client) return;

    try {
      setIsLoading(true);
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setUser(null);
      onAuthChange?.(false, null);
      setSuccessMsg('Logged out successfully.');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Account Info Button / Avatar in Navbar */}
      <button 
        id="supabase-auth-trigger"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 py-2 px-4 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
          user 
            ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100' 
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <User size={15} className={user ? 'text-orange-500 animate-pulse' : 'text-slate-400'} />
        <span>
          {user 
            ? (user.user_metadata?.display_name || user.email?.split('@')[0])
            : 'Sign In / Register'
          }
        </span>
      </button>

      {/* Slide-over Panel drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900"
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="text-orange-500 h-5 w-5" />
                    <div>
                      <h3 className="font-bold text-base text-white">FoodFix Customer Accounts</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Secured with Supabase Database Auth</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    Close [✕]
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                  
                  {/* Status Banner */}
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex gap-2 items-start font-medium leading-relaxed animate-shake">
                      <AlertCircle className="shrink-0 h-4 w-4 text-red-500 mt-0.5" />
                      <div>{errorMsg}</div>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-xl text-xs flex gap-2 items-start font-medium leading-relaxed">
                      <CheckCircle2 className="shrink-0 h-4 w-4 text-green-500 mt-0.5" />
                      <div>{successMsg}</div>
                    </div>
                  )}

                  {/* Logged In view */}
                  {user ? (
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-12 w-12 bg-orange-500 text-white font-bold rounded-full flex items-center justify-center text-lg shadow-inner">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">
                              {user.user_metadata?.display_name || 'FoodFix Customer'}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/60 pt-3.5 space-y-2.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase">Account ID:</span>
                            <span className="font-mono text-slate-600 font-bold">{user.id.substring(0, 12)}...</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase">Provider:</span>
                            <span className="text-slate-600 font-bold">{user.app_metadata?.provider || 'Email'}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase">Last Sign In:</span>
                            <span className="text-slate-600 font-bold">
                              {new Date(user.last_sign_in_at || Date.now()).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-250 cursor-pointer text-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin h-4 w-4 text-slate-300" />
                        ) : (
                          <LogOut size={15} />
                        )}
                        <span>Sign Out of Account</span>
                      </button>
                    </div>
                  ) : (
                    /* Authenticating Register / Login forms */
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Create Account
                        </button>
                      </div>

                      {isSignUp && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <label className="text-[11px] font-bold text-slate-600 uppercase">Mock Display Name</label>
                          <input
                            type="text"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full text-xs border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 bg-slate-50 transition"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full text-xs border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 bg-slate-50 transition"
                        />
                      </div>

                      <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-xs border border-slate-200 p-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 bg-slate-50 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">At least 6 characters</p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-md shadow-orange-500/10 text-xs mt-3"
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin h-4.5 w-4.5 text-white" />
                        ) : (
                          <LogIn size={15} />
                        )}
                        <span>{isSignUp ? 'Create My Account' : 'Sign In Now'}</span>
                      </button>
                    </form>
                  )}

                  {/* Supabase Connection Config Portal */}
                  <div className="border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(!isConfigOpen)}
                      className="w-full flex items-center justify-between text-slate-500 hover:text-slate-800 transition text-xs font-semibold py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Settings size={14} className="text-slate-400" />
                        Supabase DB Configuration
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {supabaseConfig.isConfigured ? (
                          <span className="flex items-center gap-1 text-green-600 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500">
                            Disconnected
                          </span>
                        )}
                        • {isConfigOpen ? 'Hide' : 'Show'}
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
                          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4">
                            <div className="text-[11px] text-slate-500 leading-normal flex gap-1.5 items-start">
                              <Info className="shrink-0 h-3.5 w-3.5 text-orange-500 mt-0.5" />
                              <span>
                                If your database environment credentials are not declared in your `Settings &gt; Secrets` panel yet, you can copy-paste your database details in the form below. They will be stored safely in browser state for testing!
                              </span>
                            </div>

                            <form onSubmit={handleConfigSubmit} className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                  <Key size={10} />
                                  Supabase Project URL
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="https://abcdefghijklmnopqrst.supabase.co"
                                  value={tempUrl}
                                  onChange={(e) => setTempUrl(e.target.value)}
                                  className="w-full font-mono text-[11px] border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                  <Key size={10} />
                                  Supabase Public Publishable Key
                                </label>
                                <textarea
                                  required
                                  rows={2}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS..."
                                  value={tempPublishableKey}
                                  onChange={(e) => setTempPublishableKey(e.target.value)}
                                  className="w-full font-mono text-[10px] border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white leading-normal"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl transition cursor-pointer text-[11px]"
                              >
                                Save & Connect Project
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

                {/* Footer brand info */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
                  Supabase Authentication Service Integration
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
