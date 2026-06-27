import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  CheckCircle, 
  Info, 
  ShieldCheck, 
  PhoneOff,
  Flame,
  Award,
  Sparkles
} from "lucide-react";
import { UserProfile, Task } from "../types";

interface FocusZoneProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

export default function FocusZone({ profile, setProfile, tasks, onUpdateTask }: FocusZoneProps) {
  // Timer state
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"Pomodoro" | "Break">("Pomodoro");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  
  // Custom interactive simulations
  const [sound, setSound] = useState<"None" | "Rain" | "Lo-Fi" | "Binaural" | "Forest">("None");
  const [websiteBlocker, setWebsiteBlocker] = useState(true);
  const [phoneDistraction, setPhoneDistraction] = useState(true);
  
  const [encouragement, setEncouragement] = useState("Let's focus. Your Planner Agent has secured this slot for distraction-free execution.");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Set default countdowns
  useEffect(() => {
    if (mode === "Pomodoro") {
      setSecondsLeft(25 * 60);
    } else {
      setSecondsLeft(5 * 60);
    }
  }, [mode]);

  // Main tick engine
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (mode === "Pomodoro") {
      // Award substantial XP on completing a Pomodoro sprint
      const xpGain = 250;
      setProfile((prev) => ({
        ...prev,
        xp: prev.xp + xpGain,
        totalFocusMins: prev.totalFocusMins + 25,
        dailyStreak: prev.dailyStreak + 1
      }));

      // Find selected task and update its spent duration
      if (selectedTaskId) {
        const matchingTask = tasks.find(t => t.id === selectedTaskId);
        if (matchingTask) {
          const updatedTask = {
            ...matchingTask,
            actualTimeSpent: Number((matchingTask.actualTimeSpent + 0.42).toFixed(2)),
            status: matchingTask.status === "Pending" ? "In_Progress" : matchingTask.status
          };
          onUpdateTask(updatedTask);
          setEncouragement(`⚡ Legendary focus session completed! +250 XP Awarded. 25 minutes logged on "${matchingTask.title}". Take a short break!`);
        } else {
          setEncouragement("⚡ Legendary focus session completed! +250 XP Awarded. Take a short 5 minute break now.");
        }
      } else {
        setEncouragement("⚡ Legendary focus session completed! +250 XP Awarded. Take a short 5 minute break now.");
      }
      setMode("Break");
    } else {
      setEncouragement("Break finished. Shall we start another 25 minute study sprint?");
      setMode("Pomodoro");
    }
  };

  const handleToggleTimer = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setEncouragement("Deep Work underway! The Website Blocker is shielding your study cycle.");
    } else {
      setEncouragement("Session paused. Keep your buffer secure by returning to focus soon.");
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(mode === "Pomodoro" ? 25 * 60 : 5 * 60);
    setEncouragement("Focus timer reset. Ready for another high-intensity cycle.");
  };

  // Dynamic coaching alerts triggered on various sounds
  const handleSoundChange = (newSound: "None" | "Rain" | "Lo-Fi" | "Binaural" | "Forest") => {
    setSound(newSound);
    if (newSound === "Rain") {
      setEncouragement("🌧️ Rain ambience active. Enhances neural alpha-wave concentration.");
    } else if (newSound === "Lo-Fi") {
      setEncouragement("☕ Lo-Fi focus beats engaged. Keeps stress level and urgency index balanced.");
    } else if (newSound === "Binaural") {
      setEncouragement("🎧 Binaural Beats (40Hz) locked. Optimizes task memory retention.");
    } else if (newSound === "Forest") {
      setEncouragement("🌲 Forest streams active. Lowers heart rate variability during deep work.");
    } else {
      setEncouragement("Silence mode engaged. Dive in.");
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
      
      {/* Left Column: Pomodoro Interface */}
      <div className="lg:col-span-2 p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-between text-center space-y-8">
        
        {/* Toggle Mode */}
        <div className="flex gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-850">
          <button
            onClick={() => {
              setIsActive(false);
              setMode("Pomodoro");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
              mode === "Pomodoro" 
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Deep Work Sprint (25m)
          </button>
          <button
            onClick={() => {
              setIsActive(false);
              setMode("Break");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
              mode === "Break" 
                ? "bg-teal-500 text-slate-950 shadow-md" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Buffer Break (5m)
          </button>
        </div>

        {/* Active Task Selector */}
        <div className="w-full max-w-sm space-y-1.5">
          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
            Active Focus Mission Target:
          </label>
          <select
            id="focus-active-task-select"
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value);
              const t = tasks.find(tsk => tsk.id === e.target.value);
              if (t) {
                setEncouragement(`Target locked: "${t.title}". Deep work block is allocated.`);
              } else {
                setEncouragement("General focus mode. Start your deep study sprint.");
              }
            }}
            className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-teal-500 rounded-xl px-3 py-2.5 text-slate-200 outline-none"
          >
            <option value="">-- select mission target (optional) --</option>
            {tasks
              .filter((t) => t.status !== "Completed")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.category}] {t.title} ({t.priority} Priority)
                </option>
              ))}
          </select>
        </div>

        {/* Visual Countdown Timer */}
        <div className="relative w-64 h-64 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-950/40 shadow-2xl">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-teal-500/5 to-indigo-500/5 blur-sm animate-pulse-glow"></div>
          
          <span className="text-5xl font-mono font-bold text-white tracking-wider">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-[10px] text-teal-400 font-mono tracking-widest uppercase font-semibold mt-1">
            {isActive ? "Focus Block Active" : "Waiting for pilot"}
          </span>
        </div>

        {/* Control Button layout */}
        <div className="flex gap-4">
          <button
            id="focus-timer-start-btn"
            onClick={handleToggleTimer}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
              isActive 
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200" 
                : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/10"
            }`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isActive ? "Pause Sprint" : "Initiate Sprint"}</span>
          </button>

          <button
            id="focus-timer-reset-btn"
            onClick={handleReset}
            className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 transition-all duration-200"
            title="Reset Countdown"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* AI encouragement prompt ticker */}
        <div className="p-4 bg-teal-500/5 rounded-2xl border border-teal-500/20 max-w-lg">
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "{encouragement}"
          </p>
        </div>

      </div>

      {/* Right Column: Distraction Shield Dashboard (Blocker, Music) */}
      <div className="space-y-6">
        
        {/* Anti-Distraction Protection */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-display font-bold text-base text-white">Distraction Shield</h3>
          </div>

          <div className="space-y-4">
            {/* Website Blocker Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">AI Website Blocker</span>
                <span className="text-[10px] text-slate-500 block">Blocks Facebook, YouTube, Reddit...</span>
              </div>
              <button
                id="toggle-website-blocker"
                onClick={() => {
                  setWebsiteBlocker(!websiteBlocker);
                  setEncouragement(websiteBlocker ? "Website blocker offline. Use willpower!" : "Website Shield engaged. Productivity vectors sealed.");
                }}
                className={`w-12 h-6 rounded-full p-1 transition-all ${
                  websiteBlocker ? "bg-teal-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${
                  websiteBlocker ? "translate-x-6" : "translate-x-0"
                }`}></div>
              </button>
            </div>

            {/* Phone Distraction Block */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">Phone Distraction Shield</span>
                <span className="text-[10px] text-slate-500 block">Simulates notification filtering</span>
              </div>
              <button
                id="toggle-phone-blocker"
                onClick={() => {
                  setPhoneDistraction(!phoneDistraction);
                  setEncouragement(phoneDistraction ? "Phone filter paused. Expect notification noise." : "Phone distraction blocker engaged. Focus levels steady.");
                }}
                className={`w-12 h-6 rounded-full p-1 transition-all ${
                  phoneDistraction ? "bg-teal-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${
                  phoneDistraction ? "translate-x-6" : "translate-x-0"
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Synthesizer Music controls */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-teal-400" />
            <h3 className="font-display font-bold text-base text-white">Brain-Wave Music</h3>
          </div>
          <p className="text-xs text-slate-400">
            Select an acoustic frequency stream below to synchronize mental coherence during deep study sprints.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {[
              { id: "None", label: "🔇 Silent" },
              { id: "Rain", label: "🌧️ Rain Ambience" },
              { id: "Lo-Fi", label: "☕ Lo-Fi Beats" },
              { id: "Binaural", label: "🎧 Binaural 40Hz" },
              { id: "Forest", label: "🌲 Forest streams" }
            ].map((snd) => (
              <button
                key={snd.id}
                onClick={() => handleSoundChange(snd.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-300 border ${
                  sound === snd.id 
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/30" 
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800"
                }`}
              >
                {snd.label}
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
