import React from "react";
import { 
  Settings, 
  User, 
  Flame, 
  Brain, 
  ShieldAlert, 
  Clock, 
  HelpCircle,
  Database,
  Sparkles
} from "lucide-react";
import { UserProfile } from "../types";

interface SettingsViewProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  hasApiKey: boolean;
  isQuotaExceeded?: boolean;
  onResetData: () => void;
  onLogout: () => void;
}

export default function SettingsView({ 
  profile, 
  setProfile, 
  hasApiKey, 
  isQuotaExceeded = false,
  onResetData, 
  onLogout 
}: SettingsViewProps) {
  
  const handleNameChange = (val: string) => {
    setProfile(prev => ({ ...prev, name: val }));
  };

  const handleMoodChange = (val: any) => {
    setProfile(prev => ({ ...prev, mood: val }));
  };

  const handleEnergyChange = (val: any) => {
    setProfile(prev => ({ ...prev, energyLevel: val }));
  };

  const handleLimitChange = (val: number) => {
    setProfile(prev => ({ ...prev, workloadLimit: val }));
  };

  const handleThemeChange = (val: "teal" | "amber" | "emerald" | "indigo" | "rose") => {
    setProfile(prev => ({ ...prev, theme: val }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Settings className="w-5 h-5 text-teal-400" />
        <h2 className="font-display font-bold text-lg text-white">Pilot Profile & System Configuration</h2>
      </div>

      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-6">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <User className="w-4 h-4 text-teal-400" />
          <span>Personalize Copilot Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-medium">
          {/* Pilot Name */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-mono uppercase tracking-wide">Pilot Call Sign (Name)</label>
            <input 
              id="settings-profile-name"
              type="text" 
              value={profile.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Daily Workload limit */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-mono uppercase tracking-wide">Daily Deep Work Cap (Hours)</label>
            <input 
              id="settings-workload-limit"
              type="number" 
              value={profile.workloadLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              min={1}
              max={24}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Core mood selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-mono uppercase tracking-wide">Current Mood</label>
            <select
              id="settings-mood-select"
              value={profile.mood}
              onChange={(e) => handleMoodChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {["Focused", "Exhausted", "Anxious", "Determined", "Chill", "Overwhelmed"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Energy Score index */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-mono uppercase tracking-wide">Current Energy Reserve</label>
            <select
              id="settings-energy-select"
              value={profile.energyLevel}
              onChange={(e) => handleEnergyChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {["High", "Moderate", "Low"].map((el) => (
                <option key={el} value={el}>{el} Energy</option>
              ))}
            </select>
          </div>

          {/* HUD Accent Theme selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-mono uppercase tracking-wide">HUD Accent Theme</label>
            <select
              id="settings-theme-select"
              value={profile.theme || "teal"}
              onChange={(e) => handleThemeChange(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="teal">Space Cadet (Teal)</option>
              <option value="amber">Safety Alert (Amber)</option>
              <option value="emerald">Horizon Clear (Emerald)</option>
              <option value="indigo">Galactic Deep (Indigo)</option>
              <option value="rose">Crimson Velocity (Rose)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backend / API status indicator */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-4">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-400" />
          <span>API Key Connection Infrastructure</span>
        </h3>

        <p className="text-xs text-slate-400 leading-normal">
          The core scheduler uses server-side Gemini 3.5 API calls to model stress indices and extract deadline constraints.
        </p>

        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasApiKey && !isQuotaExceeded ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
          <span className="text-xs font-mono font-bold text-slate-300">
            {hasApiKey 
              ? isQuotaExceeded 
                ? "GEMINI_API_KEY daily free tier quota reached (Fallback local scheduler active)." 
                : "GEMINI_API_KEY connection live. Real-time NLP active." 
              : "GEMINI_API_KEY offline. Operating with localized pilot heuristic rules."}
          </span>
        </div>

        {hasApiKey && isQuotaExceeded && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-300 leading-relaxed font-medium">
            ⚠️ Your API key has reached its free tier daily request limit (20 requests per day). We have enabled offline local backup engines to keep your schedules, coaching, and dashboard fully active and functional without interruption.
          </div>
        )}

        {!hasApiKey && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-300 leading-relaxed font-medium">
            💡 To unlock deep generative modeling of schedules, simply configure your <span className="font-mono bg-slate-950 px-1 py-0.5 rounded text-white">GEMINI_API_KEY</span> in the Secrets panel in AI Studio.
          </div>
        )}
      </div>

      {/* System Actions */}
      <div className="p-6 rounded-3xl border border-red-500/15 bg-red-500/5 space-y-4">
        <h3 className="font-display font-bold text-sm text-red-400">Advanced Systems Recovery</h3>
        <p className="text-xs text-slate-400">
          Resetting database parameters wipes your local task history, XP logs, focus sessions, and streak counts back to baseline. Use with caution. Or sign out to connect another pilot profile.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            id="system-reset-data-btn"
            onClick={onResetData}
            className="px-4 py-2 bg-red-500/15 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all duration-300"
          >
            Reset Local Database States
          </button>
          
          <button
            id="system-logout-btn"
            onClick={onLogout}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-250 border border-slate-800 text-xs font-bold rounded-xl transition-all duration-300"
          >
            Sign Out from Pilot
          </button>
        </div>
      </div>

    </div>
  );
}
