import React from "react";
import { 
  Compass, 
  Calendar as CalendarIcon, 
  Award, 
  Flame, 
  Settings as SettingsIcon, 
  Bot, 
  Zap, 
  TrendingUp, 
  ShieldAlert, 
  BookOpen, 
  CheckSquare
} from "lucide-react";
import { UserProfile } from "../types";

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  openEmergencyMode: () => void;
}

export default function Navigation({ currentTab, setTab, profile, setProfile, openEmergencyMode }: NavigationProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Compass },
    { id: "tasks", label: "Task Pilot", icon: CheckSquare },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "coach", label: "AI Coach", icon: Bot },
    { id: "focus", label: "Focus Zone", icon: Zap },
    { id: "reflection", label: "Night Reflection", icon: BookOpen },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // Calculate percentage to next level (e.g., each level is 1000 XP)
  const xpNeeded = 1000;
  const currentLevelXp = profile.xp % xpNeeded;
  const xpPercentage = (currentLevelXp / xpNeeded) * 100;

  return (
    <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab("dashboard")}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 shadow-lg shadow-teal-500/20">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 opacity-20 blur-sm animate-pulse"></div>
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Deadline<span className="text-teal-400">Pilot</span>
              </span>
              <div className="text-[9px] font-mono tracking-wider text-teal-400/80 font-bold uppercase">
                Autonomous AI Companion
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-slate-800/80 text-white shadow-inner border border-slate-700/50"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Pilot Badges / Level Stats */}
          <div className="flex items-center gap-4">
            {/* Rescue Button */}
            <button
              id="emergency-rescue-btn"
              onClick={openEmergencyMode}
              className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md shadow-red-950/30 group animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
              <span>Rescue Mode</span>
            </button>

            {/* XP and Level Bar */}
            <div className="hidden lg:flex flex-col items-end gap-1 select-none">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-teal-400 font-bold font-mono">
                  LVL {profile.level}
                </span>
                <span className="text-[10px] font-mono">{profile.xp} XP</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-900 border border-slate-800/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${xpPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Streaks badge */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{profile.dailyStreak}d Streak</span>
            </div>

            {/* Profile Avatar / Mood Badge */}
            <div className="flex items-center gap-2 border-l border-slate-800/80 pl-3">
              <div className="relative group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm border border-slate-600/40">
                  {profile.name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Scrolling Tabs */}
      <div className="md:hidden flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none border-t border-slate-900/50 pt-2 bg-slate-950/40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-mobile-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all duration-200 ${
                isActive
                  ? "bg-slate-800 text-white border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
