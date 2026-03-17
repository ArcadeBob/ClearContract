import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gem } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Invalid email or password');
      }
      // No need to handle success -- onAuthStateChange in AuthContext handles session update
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <motion.div
        className="glass-panel w-full max-w-sm p-8 rounded-xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Branding */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Gem className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mt-4">ClearContract</h1>
          <p className="text-sm text-slate-500">AI-Powered Contract Review</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 mt-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            aria-disabled={isSubmitting || undefined}
            className="w-full py-2.5 mt-8 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"
                aria-hidden="true"
              />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
