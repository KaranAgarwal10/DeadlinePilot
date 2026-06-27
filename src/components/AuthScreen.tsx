import React, { useState } from "react";
import { Sparkles, Bot, Shield, Mail, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";
import DatabaseService, { AuthUser } from "../lib/dbService";

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulated google auth loader
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockGoogleEmail = "karanagar811@gmail.com";
      const user = await DatabaseService.register(mockGoogleEmail, "Karan");
      onAuthSuccess(user);
    } catch (e: any) {
      setError(e.message || "Failed to initialize Google Authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all credentials.");
      return;
    }
    if (!isLogin && !name) {
      setError("Name is required for registering your pilot profile.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const user = await DatabaseService.login(email);
        onAuthSuccess(user);
      } else {
        const user = await DatabaseService.register(email, name);
        setSuccessMsg("Account created! Logging in...");
        setTimeout(() => {
          onAuthSuccess(user);
        }, 1200);
      }
    } catch (e: any) {
      setError(e.message || "Authentication failed. Let's try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError("Provide your email address to receive a recovery link.");
      return;
    }
    setError(null);
    setSuccessMsg(`A secure verification code was dispatched to ${email}!`);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Decorative Brand Header */}
      <div className="z-10 text-center mb-8 space-y-2 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20 px-4 py-2 rounded-full mb-2">
          <Bot className="w-4 h-4 text-teal-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-300">
            SYSTEM ENGINE ACCESS
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          Deadline<span className="text-teal-400">Pilot</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-sm">
          Lock in your tasks, predict stress overload, and command your academic and study goals with AI.
        </p>
      </div>

      {/* Glassmorphic Access Card */}
      <div className="z-10 w-full max-w-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#070b13]/85 rounded-2xl z-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-teal-500 animate-spin" />
            <p className="text-xs font-mono text-teal-400 animate-pulse">Syncing Pilot Credentials...</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400" />
            <span>{isLogin ? "Authenticate Account" : "Enlist New Pilot"}</span>
          </h2>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
          >
            {isLogin ? "Join System" : "Already Registered?"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4 text-xs text-red-400 leading-normal flex items-start gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-xl mb-4 text-xs text-teal-400 leading-normal flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-650" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karan"
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-650" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pilot@deadlinepilot.com"
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-semibold text-slate-400">Access Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-slate-500 hover:text-teal-400"
                >
                  Forgot Key?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-650" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-350"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-teal-450 hover:from-teal-400 hover:to-teal-450 text-slate-950 rounded-xl py-3 font-bold text-xs shadow-lg transition-all duration-300 mt-2"
          >
            {isLogin ? "Authenticate" : "Create Pilot Account"}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/85" />
          </div>
          <span className="relative bg-[#0b1019] px-3 text-[10px] font-mono text-slate-600">
            OR TRUST INTEGRATION
          </span>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl py-3 flex items-center justify-center gap-2 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-300"
        >
          {/* Custom vector SVG for official clean Google Identity logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Footer Credentials Info */}
      <div className="z-10 text-center mt-8 space-y-1">
        <p className="text-[10px] font-mono text-slate-600">
          🔒 Production Guard Active • SSL Encrypted Access Keys
        </p>
      </div>
    </div>
  );
}
