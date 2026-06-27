import React, { useState } from "react";
import { 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  Bot, 
  Check, 
  Award, 
  ShieldCheck, 
  Calendar,
  RefreshCw
} from "lucide-react";
import { Task, UserProfile } from "../types";

interface NightReflectionProps {
  tasks: Task[];
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function NightReflection({ tasks, profile, setProfile }: NightReflectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reflectionData, setReflectionData] = useState<any | null>(null);
  const [userInputReasons, setUserInputReasons] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const completedToday = tasks.filter(t => t.status === "Completed");
  const pendingToday = tasks.filter(t => t.status !== "Completed");

  const handleGenerateReflection = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedTasks: completedToday.map(t => t.title),
          pendingTasks: pendingToday.map(t => t.title),
          streak: profile.dailyStreak,
          date: new Date().toISOString().split("T")[0]
        })
      });

      const data = await response.json();
      setReflectionData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitReflection = () => {
    setIsSubmitted(true);
    // Award reflection completion XP bonus
    setProfile(prev => ({
      ...prev,
      xp: prev.xp + 350,
      level: prev.level + (prev.xp + 350 >= 1000 ? 1 : 0) // Sim level up
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Intro Card */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950/20 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-400" />
          <h2 className="font-display font-bold text-lg text-white">Daily Review & Reflection</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          At the end of each day, review your completed sprints, account for any deferred items, and receive an AI-calibrated action strategy for tomorrow morning. Completing your review boosts your XP and maintains your streak multiplier!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Completed Today list */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-3">
          <h3 className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">Completed Missions Today</h3>
          {completedToday.length === 0 ? (
            <p className="text-xs text-slate-500">No tasks marked completed today. Finish a study block to list it here.</p>
          ) : (
            <div className="space-y-2">
              {completedToday.map((t) => (
                <div key={t.id} className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-850 text-xs text-slate-300">
                  🎉 {t.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deferred or Pending tasks */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-3">
          <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Pending / Deferred Items</h3>
          {pendingToday.length === 0 ? (
            <p className="text-xs text-slate-500">A clean slate! All deadlines successfully completed or scheduled.</p>
          ) : (
            <div className="space-y-2">
              {pendingToday.map((t) => (
                <div key={t.id} className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-850 text-xs text-slate-300">
                  ⏳ {t.title}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Input Block: Describe reasons/blockers */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-4">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wide">
          Account for Blockers & Friction (Optional)
        </h3>
        <p className="text-xs text-slate-500 leading-normal">
          Did you face unexpected meetings, phone distractions, or burnout energy drops? Entering these variables updates the AI habits model, ensuring tomorrow's calendar suggestions are realistic.
        </p>

        <textarea
          id="blocker-reasons-input"
          value={userInputReasons}
          onChange={(e) => setUserInputReasons(e.target.value)}
          placeholder="e.g., spent extra time debugging compilation errors, got stuck in meetings from 2pm to 4pm..."
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
        />

        <div className="flex justify-end pt-2">
          <button
            id="generate-reflection-report-btn"
            onClick={handleGenerateReflection}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Compiling Report..." : "Generate AI Reflection Report"}</span>
          </button>
        </div>
      </div>

      {/* AI Report presentation */}
      {reflectionData && (
        <div className="p-6 rounded-3xl border border-teal-500/20 bg-teal-500/5 space-y-6 animate-fadeIn">
          
          <div className="flex items-center gap-2 border-b border-teal-500/10 pb-3">
            <Bot className="w-5 h-5 text-teal-400" />
            <h3 className="font-display font-bold text-sm text-teal-300 uppercase tracking-wider">AI Daily Reflection Strategy</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1.5">
              <span className="font-bold text-teal-400 uppercase font-mono tracking-widest block text-[10px]">Today's Achievements</span>
              <p className="text-slate-300 italic">"{reflectionData.achievements}"</p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-amber-400 uppercase font-mono tracking-widest block text-[10px]">Deferred Item Recovery</span>
              <p className="text-slate-300 italic">"{reflectionData.missedMilestones}"</p>
            </div>

            <div className="space-y-1.5 md:col-span-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="font-bold text-indigo-400 uppercase font-mono tracking-widest block text-[10px] mb-1">Coaching Strategy for Tomorrow</span>
              <p className="text-slate-300">"{reflectionData.coachingStrategy}"</p>
            </div>
          </div>

          <div className="pt-2 border-t border-teal-500/10 flex items-center justify-between">
            <span className="text-xs text-teal-400 font-mono font-medium">{reflectionData.streakBonus}</span>
            
            {!isSubmitted ? (
              <button
                id="submit-daily-reflection-btn"
                onClick={handleSubmitReflection}
                className="flex items-center gap-1 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all duration-200"
              >
                <Check className="w-4 h-4" />
                <span>Submit & Complete Review (+350 XP)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-mono bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-lg">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Reflection Logged. Day Complete!</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
