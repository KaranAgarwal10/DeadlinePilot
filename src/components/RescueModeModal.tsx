import React, { useState } from "react";
import { 
  ShieldAlert, 
  X, 
  Zap, 
  Bot, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  Clock
} from "lucide-react";
import { Task } from "../types";

interface RescueModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export default function RescueModeModal({ isOpen, onClose, tasks }: RescueModeModalProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [crashPlan, setCrashPlan] = useState<any | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCrashPlan = async () => {
    if (!selectedTaskId) return;
    setIsCompiling(true);

    const target = tasks.find(t => t.id === selectedTaskId);
    try {
      const response = await fetch("/api/generate-rescue-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: target })
      });
      const data = await response.json();
      setCrashPlan(data);
    } catch (e) {
      console.error(e);
      setCrashPlan({
        title: target?.title || "Syllabus Project",
        minimalStrategy: "Trim secondary literature reviews. Focus strictly on executing the core requirements. Skip verbose styling to save time.",
        timelineBlocks: [
          { time: "Next 45 mins", action: "Write primary code structure & stub file routing." },
          { time: "Take 5m break", action: "Stand up, drink water, clear visual fields." },
          { time: "Next 60 mins", action: "Assemble core operational calculations / logic validation." },
          { time: "Final 30 mins", action: "Polishing validation and format submission. Verify zip assets." }
        ],
        confidenceScore: 78
      });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2 bg-red-500/15 rounded-xl text-red-400 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">AI Emergency Rescue Mode</h2>
            <span className="text-[10px] text-red-400 font-mono tracking-widest uppercase font-bold">Priority Code Red Crash Planning</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Behind schedule? Running out of time? The Rescue Agent strips out secondary non-essential items to formulate a high-intensity, minimal viable completion strategy to save your grade or client trust.
        </p>

        {/* Select a task to rescue */}
        <div className="space-y-3 text-xs">
          <label className="block text-slate-400 font-mono uppercase tracking-wide">Select Task to Rescue:</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                setCrashPlan(null);
              }}
              className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-red-500"
            >
              <option value="">-- Choose target task --</option>
              {tasks.filter(t => t.status !== "Completed").map(t => (
                <option key={t.id} value={t.id}>🚨 {t.title} (Risk: {t.riskScore}%)</option>
              ))}
            </select>

            <button
              onClick={handleGenerateCrashPlan}
              disabled={isCompiling || !selectedTaskId}
              className="px-5 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isCompiling ? "animate-spin" : ""}`} />
              <span>Compile Crash Plan</span>
            </button>
          </div>
        </div>

        {/* Crash Plan presentation */}
        {crashPlan && (
          <div className="p-5 bg-red-500/5 rounded-2xl border border-red-500/20 space-y-4 animate-fadeIn text-xs leading-relaxed">
            <div>
              <span className="font-mono font-bold text-red-400 uppercase tracking-widest block text-[10px]">Minimal Viable Strategy</span>
              <p className="text-slate-200 font-medium mt-1">
                {crashPlan.minimalStrategy}
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-mono font-bold text-slate-400 uppercase tracking-widest block text-[10px]">High-Intensity Roadblocks</span>
              <div className="space-y-2">
                {crashPlan.timelineBlocks.map((tb: any, idx: number) => (
                  <div key={idx} className="flex gap-2.5 p-2 bg-slate-950 rounded-lg border border-slate-850">
                    <span className="font-bold text-red-400 font-mono uppercase shrink-0 min-w-[100px] text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-400" />
                      <span>{tb.time}</span>
                    </span>
                    <span className="text-slate-300 font-medium">{tb.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-red-500/10 flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">Survival probability score:</span>
              <span className="text-emerald-400 font-bold">{crashPlan.confidenceScore}% (Stable)</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
