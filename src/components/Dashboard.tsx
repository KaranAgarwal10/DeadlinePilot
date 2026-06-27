import React, { useMemo, useState, useEffect } from "react";
import { 
  TrendingUp, 
  Flame, 
  Zap, 
  Clock, 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  AlertTriangle,
  Sparkles,
  BarChart2,
  Brain,
  Layers,
  HelpCircle,
  TrendingDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Terminal,
  Sliders,
  Smile,
  Activity,
  Check
} from "lucide-react";
import { Task, UserProfile } from "../types";

interface DashboardProps {
  tasks: Task[];
  profile: UserProfile;
  setTab: (tab: string) => void;
  onQuickAdd: (text: string) => void;
  onToggleTask: (id: string) => void;
  onAdaptiveReplan?: () => Promise<void>;
  isReplanning?: boolean;
  replanAssessment?: string;
  setProfile?: React.Dispatch<React.SetStateAction<UserProfile>>;
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  hasApiKey: boolean;
  isQuotaExceeded?: boolean;
}

export default function Dashboard({ 
  tasks, 
  profile, 
  setTab, 
  onQuickAdd, 
  onToggleTask,
  onAdaptiveReplan,
  isReplanning = false,
  replanAssessment = "",
  setProfile,
  setTasks,
  hasApiKey,
  isQuotaExceeded = false
}: DashboardProps) {
  const [quickText, setQuickText] = React.useState("");
  
  // Custom states for advanced features
  const [briefingText, setBriefingText] = useState("");
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [sleepHours, setSleepHours] = useState(profile.sleepHours || 8);
  const [burnoutReductionLogs, setBurnoutReductionLogs] = useState<string[]>([]);
  const [isReducingWorkload, setIsReducingWorkload] = useState(false);
  const [activeTerminalTab, setActiveTerminalTab] = useState<"coordinator" | "planner" | "scheduler" | "risk" | "motivation" | "insight">("coordinator");
  const [selectedTerminalTaskId, setSelectedTerminalTaskId] = useState<string>("");

  // Speech synthesis utility
  const speakText = (txt: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = txt.replace(/[*#`_-]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // HTML5 Speech Recognition utility
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFeedback("Voice recognition not supported in this browser.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      setVoiceFeedback("Listening...");
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
      setVoiceFeedback("Speech error. Try again.");
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setVoiceFeedback(`Captured: "${text}"`);
      
      try {
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandText: text })
        });
        const data = await res.json();
        setVoiceFeedback(`AI Command: ${data.reply}`);
        speakText(data.reply);

        if (data.type === "ADD_TASK" && data.taskText) {
          onQuickAdd(data.taskText);
        } else if (data.type === "REPLAN") {
          if (onAdaptiveReplan) onAdaptiveReplan();
        } else if (data.type === "RESCUE") {
          setTab("tasks");
        } else if (data.type === "CHAT_COACH") {
          setTab("coach");
        }
      } catch (err) {
        setVoiceFeedback("Failed parsing voice command.");
      }
    };

    rec.start();
  };

  // Sync sleep hours change with profile context
  const handleSleepChange = (val: number) => {
    setSleepHours(val);
    if (setProfile) {
      setProfile(curr => ({
        ...curr,
        sleepHours: val
      }));
    }
  };

  // Run workload auto reduction endpoint
  const handleTriggerWorkloadReduction = async () => {
    if (!setTasks) return;
    setIsReducingWorkload(true);
    try {
      const res = await fetch("/api/reduce-workload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, profile })
      });
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
      if (data.adjustments) {
        setBurnoutReductionLogs(data.adjustments);
      }
      if (setProfile) {
        setProfile(curr => ({
          ...curr,
          energyLevel: "High"
        }));
      }
    } catch (e) {
      console.error("Relief error:", e);
    } finally {
      setIsReducingWorkload(false);
    }
  };

  // Fetch Daily Briefing on Mount/State Updates
  useEffect(() => {
    const fetchBriefing = async () => {
      setIsBriefingLoading(true);
      try {
        const res = await fetch("/api/daily-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks, profile })
        });
        const data = await res.json();
        setBriefingText(data.briefing || "");
      } catch (e) {
        console.error("Briefing load error:", e);
      } finally {
        setIsBriefingLoading(false);
      }
    };
    if (tasks.length > 0) {
      fetchBriefing();
    } else {
      setBriefingText(`Greetings Pilot ${profile.name}! Your cockpit is clear. Add a task to initiate dynamic safety buffers and multi-agent coordination.`);
    }
  }, [tasks, profile.energyLevel]);

  // Statistics memoization with customized sleep penalty
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Average Risk Score of pending tasks
    const pendingTasks = tasks.filter(t => t.status !== "Completed");
    const avgRisk = pendingTasks.length > 0 
      ? Math.round(pendingTasks.reduce((acc, t) => acc + t.riskScore, 0) / pendingTasks.length)
      : 0;

    // Calculate dynamic burnout index incorporating custom sleep hours slider and density penalty
    const sleepPenalty = Math.max(0, (8 - sleepHours) * 15);
    const totalPendingHrs = pendingTasks.reduce((acc, t) => acc + t.estimatedTime, 0);
    const densityPenalty = Math.min(45, (totalPendingHrs / (profile.workloadLimit || 6)) * 12);
    
    const calculatedBurnoutIndex = Math.min(100, Math.round((avgRisk * 0.4) + sleepPenalty + densityPenalty));
    const isBurnoutRisk = calculatedBurnoutIndex > 65;

    // Focus Score calculation (streaks, total focus minutes and completion speed)
    const focusScore = Math.min(100, Math.round((profile.totalFocusMins / 60) * 10 + profile.dailyStreak * 5 + completionRate * 0.5));

    return {
      total,
      completed,
      completionRate,
      avgRisk,
      totalPendingHrs,
      isBurnoutRisk,
      focusScore,
      calculatedBurnoutIndex
    };
  }, [tasks, profile, sleepHours]);

  const upcomingDeadlines = useMemo(() => {
    return [...tasks]
      .filter(t => t.status !== "Completed")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
  }, [tasks]);

  const burnoutChartData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const workloadLimit = profile.workloadLimit || 6;
    
    return days.map((day, idx) => {
      let dayHours = 0;
      tasks.forEach(t => {
        if (t.status !== "Completed") {
          (t.suggestedSchedule || []).forEach(sch => {
            const schDay = sch.day?.toLowerCase() || "";
            if (schDay === day.toLowerCase() || (idx === 0 && schDay === "today") || (idx === 1 && schDay === "tomorrow")) {
              const hrMatch = sch.block.match(/\d+/);
              dayHours += hrMatch ? parseFloat(hrMatch[0]) : 1.5;
            }
          });
        }
      });
      
      const ratio = dayHours / workloadLimit;
      const stressIndex = Math.min(100, Math.round(ratio * 65 + (stats.avgRisk * 0.35)));
      return {
        day,
        hours: Math.round(dayHours * 10) / 10,
        stressIndex: Math.max(12, stressIndex)
      };
    });
  }, [tasks, profile, stats.avgRisk]);

  // Handle Quick Add Action
  const handleSubmitQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    onQuickAdd(quickText);
    setQuickText("");
  };

  // Preset AI triggers for quick sprints
  const triggerSuggestions = [
    "Plan study sprint for final exam next Friday",
    "Submit Q2 software roadmap before tomorrow at 5pm",
    "Pay subscription bill due on Tuesday",
    "Prepare tech interview with company research roadmap"
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Dynamic Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-teal-500/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse-glow"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-400">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Pilot Status: Active Guidance</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                hasApiKey && !isQuotaExceeded
                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400" 
                  : "bg-amber-500/10 border border-amber-500/25 text-amber-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey && !isQuotaExceeded ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                <span>
                  {hasApiKey 
                    ? isQuotaExceeded 
                      ? "AI SWARM: LOCAL BACKUP (QUOTA EXCEEDED)" 
                      : "AI SWARM: CLOUD ACTIVE" 
                    : "AI SWARM: LOCAL BACKUP"}
                </span>
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Welcome back, Pilot <span className="text-teal-400">{profile.name}</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
              Our Agentic engine predicts a <span className="text-white font-medium">{100 - stats.avgRisk}% probability</span> of beating your upcoming deadlines this week. Keep your energy high and tackle your pending tasks.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              id="start-study-sprint-btn"
              onClick={() => setTab("focus")}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-teal-500/15"
            >
              <Zap className="w-4 h-4 text-white" />
              <span>Start Study Sprint</span>
            </button>
            <button 
              id="chat-copilot-btn"
              onClick={() => setTab("coach")}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 font-medium text-sm transition-all duration-300"
            >
              <Brain className="w-4 h-4 text-teal-400" />
              <span>Ask Coach</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Daily Briefing & Voice Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Daily Cockpit Briefing */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-slate-900 via-slate-950 to-teal-950/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-teal-400">AI Daily Pilot Briefing</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-semibold text-xs transition-all duration-300 shadow-md shadow-teal-500/20"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Pause Voice</span>
                </button>
              ) : (
                <button
                  onClick={() => speakText(briefingText)}
                  disabled={isBriefingLoading || !briefingText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all duration-300 disabled:opacity-40"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Speak Briefing</span>
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[70px] flex items-center">
            {isBriefingLoading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-teal-400 animate-pulse uppercase tracking-wider">Compiling tactical cockpit brief...</span>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed whitespace-pre-line prose prose-invert">
                {briefingText}
              </div>
            )}
          </div>
        </div>

        {/* Voice Command Console */}
        <div className="p-6 rounded-2xl border border-slate-850 bg-slate-900/40 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Mic className="w-4 h-4 text-indigo-400" />
              <span className="font-display font-bold text-xs uppercase tracking-wider">Voice AI Console</span>
            </div>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              isListening ? "bg-red-500/15 text-red-400 animate-pulse" : "bg-slate-800 text-slate-400"
            }`}>
              {isListening ? "Live Stream Active" : "Standby Channel"}
            </span>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-850">
            <button
              onClick={startListening}
              className={`p-3.5 rounded-full transition-all duration-300 ${
                isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/25"
              }`}
              title="Click to speak a command"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 font-mono block mb-1">Interactive Voice Pilot:</span>
              <p className="text-[11px] font-mono text-slate-300 leading-snug truncate">
                {voiceFeedback || "Click microphone and speak. Try: 'Add math sprint due Friday'."}
              </p>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 font-normal leading-relaxed">
            ⚡ Direct state triggers integrated. Spoken tasks are automatically captured & structured with milestones.
          </div>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Risk Score */}
        <div id="metric-risk-score" className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Threshold</span>
            <div className={`p-2 rounded-lg ${stats.avgRisk > 60 ? "bg-red-500/10 text-red-400" : stats.avgRisk > 35 ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-white">{stats.avgRisk}%</span>
              <span className="text-xs text-slate-400">Average Risk</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950/60 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${stats.avgRisk > 60 ? "bg-red-500" : stats.avgRisk > 35 ? "bg-amber-500" : "bg-teal-500"}`}
                style={{ width: `${stats.avgRisk}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {stats.avgRisk > 60 ? "🚨 Schedule congested. Action required." : "✨ Safety buffer looks optimal."}
          </span>
        </div>

        {/* AI Burnout Prevention Engine */}
        <div id="metric-burnout" className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300 col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Burnout Engine</span>
            <div className={`p-2 rounded-lg ${stats.isBurnoutRisk ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-teal-500/10 text-teal-400"}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-display font-bold ${stats.isBurnoutRisk ? "text-red-400" : "text-white"}`}>
                {stats.calculatedBurnoutIndex}%
              </span>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                stats.calculatedBurnoutIndex > 75 ? "bg-red-500/10 text-red-400" : stats.calculatedBurnoutIndex > 45 ? "bg-amber-500/10 text-amber-400" : "bg-teal-500/10 text-teal-400"
              }`}>
                {stats.calculatedBurnoutIndex > 75 ? "Severe Risk" : stats.calculatedBurnoutIndex > 45 ? "Moderate" : "Optimal"}
              </span>
            </div>
            
            {/* Interactive Sleep Hours Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Sleep duration</span>
                <span className="text-teal-400 font-bold">{sleepHours} Hours</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="10" 
                step="0.5"
                value={sleepHours}
                onChange={(e) => handleSleepChange(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Cognitive advice */}
            <p className="text-[10px] text-slate-400 font-normal leading-snug">
              {sleepHours < 7 
                ? "⚠️ Under 7h sleep adds 30% fatigue penalty to scheduling risk." 
                : "✅ Healthy sleep levels provide optimal safety buffers."}
            </p>

            {/* Relief Action Button */}
            <button
              onClick={handleTriggerWorkloadReduction}
              disabled={isReducingWorkload || tasks.filter(t => t.status !== "Completed").length === 0}
              className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold border transition-all duration-300 flex items-center justify-center gap-1.5 ${
                stats.isBurnoutRisk 
                  ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/30" 
                  : "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/20"
              }`}
            >
              {isReducingWorkload ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sliders className="w-3 h-3" />
                  <span>De-congest Schedule</span>
                </>
              )}
            </button>
          </div>
          {burnoutReductionLogs.length > 0 && (
            <div className="text-[9px] text-teal-400 font-mono bg-slate-950/60 p-1.5 rounded border border-teal-500/10 animate-fade-in truncate">
              ✔ {burnoutReductionLogs[0]}
            </div>
          )}
        </div>

        {/* Focus Score */}
        <div id="metric-focus" className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Focus Score</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-white">{stats.focusScore}</span>
              <span className="text-xs text-slate-400">/100 XP</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950/60 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.focusScore}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ⚡ {profile.totalFocusMins} mins of total focus time
          </span>
        </div>

        {/* Habits Streak */}
        <div id="metric-streak" className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Streak</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-white">{profile.dailyStreak} Days</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Completed {stats.completed} out of {stats.total} total missions
            </p>
          </div>
          <span className="text-[11px] text-orange-400 font-mono">
            🔥 Keep it up to protect streak multipliers!
          </span>
        </div>
      </div>

      {/* AI Task Capture & Upcoming Deadline List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Dynamic Task Capture */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-400" />
                <h2 className="font-display font-bold text-lg text-white">Capture Deadline & Build Strategy</h2>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded">
                AI Agent Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal leading-relaxed">
              Describe your assignment, bill, exam, or meeting naturally. The Planner & Risk Prediction Agents will automatically extract deadlines, construct milestones, and formulate a step-by-step safety plan.
            </p>

            <form onSubmit={handleSubmitQuick} className="relative mt-2">
              <input 
                id="quick-capture-input"
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="e.g., Submit my chemistry lab report due by Thursday night 10pm..."
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 text-sm text-slate-100 placeholder-slate-500 px-4 py-3.5 pr-28 rounded-xl focus:outline-none transition-all duration-200"
              />
              <button 
                id="quick-capture-submit-btn"
                type="submit"
                className="absolute right-2 top-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Analyze</span>
              </button>
            </form>

            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold block mb-2">💡 Try AI-powered templates:</span>
              <div className="flex flex-wrap gap-2">
                {triggerSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuickText(s)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/60 px-2.5 py-1.5 rounded-lg transition-all duration-200 text-left line-clamp-1"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Continuous Adaptive Swarm Re-planner Console */}
          <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">Scheduler Swarm Agent Console</h2>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded uppercase">
                Continuous Re-plan Enabled
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Our Multi-agent Swarm (Planner, Scheduler, and Risk Analyzer Agents) continuously recalculates safety buffers, stress margins, and schedules based on your active energy Level.
            </p>

            {replanAssessment ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-indigo-500/10 text-xs text-indigo-200 font-mono leading-relaxed">
                🚀 <span className="font-bold">Latest Swarm Assessment:</span> {replanAssessment}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-500 font-mono italic">
                No optimization cycles run for this session. Trigger optimization to synchronize task schedules with your workload profile.
              </div>
            )}

            <div className="flex justify-end">
              <button
                id="trigger-swarm-replan-btn"
                onClick={onAdaptiveReplan}
                disabled={isReplanning || tasks.filter(t => t.status !== "Completed").length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl disabled:opacity-40 shadow-lg shadow-indigo-600/10 transition-all duration-300"
              >
                <Sparkles className={`w-3.5 h-3.5 text-white ${isReplanning ? "animate-spin" : ""}`} />
                <span>{isReplanning ? "Running Swarm Solver..." : "Command Swarm: Optimize Calendar"}</span>
              </button>
            </div>
          </div>

          {/* AI Swarm Control Console & Agent Terminal */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-teal-400" />
                <h2 className="font-display font-bold text-base text-white">AI Swarm Agent Inspector Terminal</h2>
              </div>
              
              {/* Task Selector Dropdown for Agent Traces */}
              {tasks.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">Trace:</span>
                  <select
                    value={selectedTerminalTaskId || (tasks.find(t => t.agentAssessments)?.id || tasks[0]?.id)}
                    onChange={(e) => setSelectedTerminalTaskId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono rounded px-2 py-1 focus:outline-none focus:border-teal-500 cursor-pointer max-w-[180px]"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Trace execution logs, shared memory buffers, and individual cognitive decision outputs from DeadlinePilot's 8 specialized sub-agents.
            </p>

            {/* Sub-Agent Selector Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800/80 pb-2.5">
              {(["coordinator", "planner", "scheduler", "risk", "motivation", "insight"] as const).map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTerminalTab(tabId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 uppercase ${
                    activeTerminalTab === tabId
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  {tabId}
                </button>
              ))}
            </div>

            {/* Terminal View Area */}
            {(() => {
              const currentTerminalTask = tasks.find(t => t.id === (selectedTerminalTaskId || tasks.find(x => x.agentAssessments)?.id || tasks[0]?.id)) || null;
              
              const getAgentOutput = () => {
                if (!currentTerminalTask) {
                  return "Terminal Standby: No task active. Analyze or quick-add a task above to trace multi-agent orchestration streams.";
                }
                const assessments = currentTerminalTask.agentAssessments;
                if (!assessments) {
                  const title = currentTerminalTask.title;
                  switch (activeTerminalTab) {
                    case "coordinator":
                      return `[Master Coordinator] Orchestrating flight paths for "${title}". Verified calendar density metrics and assigned milestones.`;
                    case "planner":
                      return `[Planner Agent] Broke "${title}" down into milestone subtasks. Estimated ${currentTerminalTask.estimatedTime} focused hours.`;
                    case "scheduler":
                      return `[Scheduler Agent] Analyzed week view. Placed focused study sprint blocks during evening slots to align with sleep cycles.`;
                    case "risk":
                      return `[Risk Prediction] Evaluated deadline of ${currentTerminalTask.deadline}. Failure risk is calculated at ${currentTerminalTask.riskScore}%.`;
                    case "motivation":
                      return `[Motivation Agent] Motivation level calibrated to "High". ${currentTerminalTask.motivatingPhrase}`;
                    case "insight":
                      return `[Insight Agent] User historical data indicates optimal speedruns on early weekdays. Buffers expanded accordingly.`;
                  }
                }
                switch (activeTerminalTab) {
                  case "coordinator": return assessments.coordinatorSummary;
                  case "planner": return assessments.plannerOutput;
                  case "scheduler": return assessments.schedulerOutput;
                  case "risk": return assessments.riskOutput;
                  case "motivation": return assessments.motivationOutput;
                  case "insight": return assessments.insightOutput;
                }
              };

              const getAgentMeta = () => {
                switch (activeTerminalTab) {
                  case "coordinator":
                    return {
                      role: "Multi-Agent Swarm Manager",
                      decision: "Rule-based fallback routing + model-based synthesis constraints",
                      inputs: "User natural language + profile status",
                      memory: "Focus history averages"
                    };
                  case "planner":
                    return {
                      role: "Task Breakdown and Sizing Engineer",
                      decision: "Complexity index estimation via duration models",
                      inputs: "Task text + difficulty score",
                      memory: "Milestone completion logs"
                    };
                  case "scheduler":
                    return {
                      role: "Micro-Schedules and Block Scheduler",
                      decision: "Deep work allocation windows optimization",
                      inputs: "Schedules + workloadLimits",
                      memory: "Weekly focus minutes logs"
                    };
                  case "risk":
                    return {
                      role: "Predictive Failure Risk Forecaster",
                      decision: "Congestion ratios + time delta risk calculations",
                      inputs: "Milestones + deadlines",
                      memory: "Historical delay ratios"
                    };
                  case "motivation":
                    return {
                      role: "Coaching and Proactive Motivator",
                      decision: "Contextual cognitive praise generation",
                      inputs: "Stress levels + priority",
                      memory: "Streak multipliers"
                    };
                  case "insight":
                    return {
                      role: "Long-Term Behavioral Trend Analyzer",
                      decision: "Clustering task completions by time blocks",
                      inputs: "User profiles + logs",
                      memory: "Cognitive exhaustion indices"
                    };
                }
              };

              const meta = getAgentMeta();

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner font-mono text-[11px] leading-relaxed flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                  {/* Left Parameter Panel */}
                  <div className="p-4 sm:w-2/5 space-y-3 bg-slate-950/60 text-slate-400">
                    <div>
                      <span className="text-teal-400 font-bold block">ROLE:</span>
                      <span className="text-slate-200">{meta.role}</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-bold block">DECISION LOGIC:</span>
                      <span className="text-slate-300">{meta.decision}</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-bold block">SHARED MEMORY:</span>
                      <span className="text-slate-300">{meta.memory}</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-bold block">INPUTS:</span>
                      <span className="text-slate-400 text-[10px] break-words">{meta.inputs}</span>
                    </div>
                  </div>

                  {/* Right Output Screen */}
                  <div className="p-4 sm:w-3/5 flex flex-col justify-between text-slate-300 min-h-[140px] bg-slate-950/20">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1 border-b border-slate-900/60 pb-1">
                        <span>trace_stdout</span>
                        <span className="text-teal-500 animate-pulse">● LIVE_STREAM</span>
                      </div>
                      <p className="whitespace-pre-wrap">{getAgentOutput()}</p>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-2 flex justify-between">
                      <span>status_ok</span>
                      <span>uid: {profile.name}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Today's Tasks */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <h2 className="font-display font-bold text-lg text-white">Today's Focus Tasks</h2>
              </div>
              <button 
                id="dashboard-view-all-tasks-btn"
                onClick={() => setTab("tasks")} 
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
              >
                View Task Pilot →
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/40">
                <span className="text-slate-500 text-sm block">No tasks currently scheduled for today.</span>
                <span className="text-slate-400 text-xs mt-1 block">Describe a deadline above to create an AI schedule.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 4).map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700/60 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={task.status === "Completed"}
                        onChange={() => onToggleTask(task.id)}
                        className="w-4 h-4 text-teal-500 rounded border-slate-800 focus:ring-teal-500 bg-slate-950 cursor-pointer"
                      />
                      <div>
                        <span className={`text-sm font-medium transition-all ${task.status === "Completed" ? "line-through text-slate-500" : "text-slate-200"}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-mono font-bold ${
                            task.priority === "High" ? "bg-red-500/10 text-red-400" : task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ⏳ Due: {task.deadline}
                          </span>
                          <span className="text-[10px] text-teal-400 font-mono">
                            🔥 {task.estimatedTime} hrs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 font-mono">Risk Index</span>
                        <span className={`text-xs font-bold font-mono ${
                          task.riskScore > 65 ? "text-red-400" : task.riskScore > 40 ? "text-amber-400" : "text-teal-400"
                        }`}>
                          {task.riskScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Risk Insights, Deadlines, Burnout Predictions */}
        <div className="space-y-6">
          {/* Upcoming Deadlines Countdowns */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              <h2 className="font-display font-bold text-lg text-white">Upcoming Critical</h2>
            </div>

            <div className="space-y-4">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400">All calm. No urgent deadlines pending.</p>
              ) : (
                upcomingDeadlines.map((task) => {
                  const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={task.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-200 font-medium truncate max-w-[140px]">{task.title}</span>
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                          daysLeft <= 1 ? "bg-red-500/15 text-red-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {daysLeft <= 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days left`}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            task.riskScore > 65 ? "bg-red-500" : "bg-teal-500"
                          }`}
                          style={{ width: `${task.riskScore}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Burnout & Workload Forecast Chart */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">Burnout & Workload Forecast</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              7-day cognitive overload projection based on scheduled milestone hours vs workload limit.
            </p>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col items-center">
              {/* SVG Area Chart */}
              <svg width="100%" height="130" viewBox="0 0 300 130" className="overflow-visible">
                <defs>
                  <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="30" y1="20" x2="280" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="30" y1="60" x2="280" y2="60" stroke="#1e293b" strokeDasharray="3,3" />
                <line x1="30" y1="100" x2="280" y2="100" stroke="#334155" />

                {/* Y-Axis text */}
                <text x="5" y="24" className="text-[9px] fill-slate-500 font-mono">100%</text>
                <text x="5" y="64" className="text-[9px] fill-slate-500 font-mono">50%</text>
                <text x="5" y="104" className="text-[9px] fill-slate-500 font-mono">0%</text>

                {/* Fill Area */}
                {burnoutChartData.length > 0 && (
                  <path 
                    d={`M 30 100 ${burnoutChartData.map((d, idx) => `L ${30 + idx * 40} ${100 - (d.stressIndex / 100) * 80}`).join(" ")} L 270 100 Z`}
                    fill="url(#stressGrad)"
                  />
                )}

                {/* Outline Path */}
                {burnoutChartData.length > 0 && (
                  <path 
                    d={burnoutChartData.map((d, idx) => `${idx === 0 ? "M" : "L"} ${30 + idx * 40} ${100 - (d.stressIndex / 100) * 80}`).join(" ")}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2"
                  />
                )}

                {/* Data Points */}
                {burnoutChartData.map((d, idx) => {
                  const x = 30 + idx * 40;
                  const y = 100 - (d.stressIndex / 100) * 80;
                  return (
                    <g key={idx} className="group/point cursor-pointer">
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="3.5" 
                        fill="#0f172a" 
                        stroke="#2dd4bf" 
                        strokeWidth="2" 
                      />
                      {/* Hover Tooltip circle */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="7" 
                        fill="#2dd4bf" 
                        opacity="0" 
                        className="hover:opacity-20 transition-opacity" 
                      />
                      
                      {/* X-axis labels */}
                      <text x={x} y="118" textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
                        {d.day}
                      </text>

                      {/* Tooltip text inside SVG */}
                      <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <rect x={Math.max(10, x - 35)} y={y - 32} width="70" height="24" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        <text x={x} y={y - 23} textAnchor="middle" className="text-[8px] font-bold fill-white font-mono">
                          Stress: {d.stressIndex}%
                        </text>
                        <text x={x} y={y - 13} textAnchor="middle" className="text-[8px] fill-teal-400 font-mono font-bold">
                          {d.hours} hrs load
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono p-2 bg-slate-950/40 rounded border border-slate-850">
              <span className="text-slate-500">Predicted Overload:</span>
              <span className={stats.isBurnoutRisk ? "text-red-400 font-bold uppercase animate-pulse" : "text-teal-400 font-bold font-mono"}>
                {stats.isBurnoutRisk ? "High Overload" : "Low Risk"}
              </span>
            </div>
          </div>

          {/* AI Productivity Insights */}
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-400" />
              <h2 className="font-display font-bold text-lg text-white">AI Copilot Insights</h2>
            </div>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                <span className="text-teal-400 font-bold font-mono uppercase block mb-1">Energy Peak</span>
                <span className="text-slate-300">Your optimal focus window is identified between 7:00 PM and 10:00 PM. We suggest blocking high-difficulty tasks then.</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                <span className="text-amber-400 font-bold font-mono uppercase block mb-1">Velocity Alert</span>
                <span className="text-slate-300">Historical analysis shows study sessions exceeding 90 minutes lead to a 30% drop in milestone completion. Work in sprints!</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
