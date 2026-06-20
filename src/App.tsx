/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { categories, foodItems } from './data';
import { SearchBar } from './components/SearchBar';
import { FoodGrid } from './components/FoodGrid';
import { SupportChat } from './components/SupportChat';
import { SupabaseAuth } from './components/SupabaseAuth';
import { LoginScreen } from './components/LoginScreen';
import { getSupabase } from './lib/supabase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }

    // Check existing session on start
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Subscribe to session state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = (isLoggedIn: boolean, email: string | null) => {
    setIsAuthenticated(isLoggedIn);
    setUserEmail(email);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-105 flex flex-col justify-center items-center">
        <div className="h-9 w-9 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3.5 text-xs font-semibold text-slate-400">Securing connection to FoodFix...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={(email) => {
          setIsAuthenticated(true);
          setUserEmail(email);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-white border-b border-slate-100 py-4 px-8 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-orange-500 tracking-tight">Food<span className="text-slate-800">Fix</span></h1>
        <SupabaseAuth onAuthChange={handleAuthChange} />
      </nav>

      <header className="py-12 bg-orange-50 text-center px-4">
        <h2 className="text-4xl font-bold text-slate-900 mb-6">Hungry? We've got you covered.</h2>
        <SearchBar />
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <section className="mb-12">
          <div className="flex gap-6 overflow-x-auto pb-4 justify-between">
            {categories.map(c => (
              <button key={c.id} className="flex flex-col items-center gap-2 min-w-20 bg-white p-4 rounded-2xl border border-slate-100 hover:border-orange-200 transition">
                <span className="text-3xl">{c.icon}</span>
                <span className="font-semibold text-xs text-slate-600">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Popular near you</h3>
          <FoodGrid items={foodItems} />
        </section>
      </main>
      
      <SupportChat />
    </div>
  );
}
