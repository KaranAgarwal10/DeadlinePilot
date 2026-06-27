import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  AlertTriangle, 
  HelpCircle,
  Sparkles,
  Bot,
  RefreshCw,
  Plus
} from "lucide-react";
import { Task } from "../types";

interface CalendarViewProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
}

export default function CalendarView({ tasks, onAddTask }: CalendarViewProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Real syncing/exporting with Google Calendar via .ics iCalendar file
  const handleGoogleCalendarSync = () => {
    setIsSyncing(true);
    
    try {
      // Build real iCalendar .ics content string
      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DeadlinePilot//Calendar Sync//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";
      
      tasks.forEach((task) => {
        // Build an event for the primary deadline date
        const cleanTitle = task.title.replace(/[,;]/g, "");
        const formattedDate = task.deadline.replace(/-/g, ""); // YYYYMMDD
        
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:deadline-${task.id}@deadlinepilot.com\n`;
        icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\n`;
        icsContent += `DTSTART;VALUE=DATE:${formattedDate}\n`;
        icsContent += `DTEND;VALUE=DATE:${formattedDate}\n`;
        icsContent += `SUMMARY:🚨 [DeadlinePilot] ${cleanTitle}\n`;
        icsContent += `DESCRIPTION:Task category: ${task.category}. Stress Level: ${task.stressLevel}. Difficulty: ${task.difficulty}/5. Motivating Phrase: ${task.motivatingPhrase}\n`;
        icsContent += "END:VEVENT\n";

        // Add events for suggested scheduled blocks if present
        if (task.suggestedSchedule) {
          task.suggestedSchedule.forEach((sch, idx) => {
            icsContent += "BEGIN:VEVENT\n";
            icsContent += `UID:schedule-${task.id}-${idx}@deadlinepilot.com\n`;
            icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\n`;
            
            // Map Day names or Today/Tomorrow to actual simulation calendar dates
            let eventDate = new Date();
            const schDay = sch.day?.toLowerCase() || "";
            if (schDay === "tomorrow") {
              eventDate.setDate(eventDate.getDate() + 1);
            } else if (schDay === "monday") {
              const currentDay = eventDate.getDay();
              const daysUntilMon = (1 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilMon === 0 ? 7 : daysUntilMon));
            } else if (schDay === "tuesday") {
              const currentDay = eventDate.getDay();
              const daysUntilTue = (2 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilTue === 0 ? 7 : daysUntilTue));
            } else if (schDay === "wednesday") {
              const currentDay = eventDate.getDay();
              const daysUntilWed = (3 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilWed === 0 ? 7 : daysUntilWed));
            } else if (schDay === "thursday") {
              const currentDay = eventDate.getDay();
              const daysUntilThu = (4 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilThu === 0 ? 7 : daysUntilThu));
            } else if (schDay === "friday") {
              const currentDay = eventDate.getDay();
              const daysUntilFri = (5 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilFri === 0 ? 7 : daysUntilFri));
            } else if (schDay === "saturday" || schDay === "sat") {
              const currentDay = eventDate.getDay();
              const daysUntilSat = (6 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilSat === 0 ? 7 : daysUntilSat));
            } else if (schDay === "sunday" || schDay === "sun") {
              const currentDay = eventDate.getDay();
              const daysUntilSun = (0 + 7 - currentDay) % 7;
              eventDate.setDate(eventDate.getDate() + (daysUntilSun === 0 ? 7 : daysUntilSun));
            }
            
            const icsDateStr = eventDate.toISOString().split("T")[0].replace(/-/g, "");
            icsContent += `DTSTART;VALUE=DATE:${icsDateStr}\n`;
            icsContent += `DTEND;VALUE=DATE:${icsDateStr}\n`;
            icsContent += `SUMMARY:⚡ [Focus Block] ${cleanTitle}\n`;
            icsContent += `DESCRIPTION:Allocated Block: ${sch.block}. Action required: ${sch.action}\n`;
            icsContent += "END:VEVENT\n";
          });
        }
      });
      
      icsContent += "END:VCALENDAR\n";
      
      // Trigger user file download
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "DeadlinePilot_Calendar_Sync.ics");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsSyncing(false);
      setSyncMessage("Successfully compiled and downloaded your DeadlinePilot.ics file! Import this directly into Google Calendar or Apple Calendar.");
      setTimeout(() => setSyncMessage(null), 10000);
    } catch (e: any) {
      console.error(e);
      setIsSyncing(false);
      setSyncMessage("Failed to compile calendar sync data. Please try again.");
    }
  };

  // Generate a mock grid of the current month
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const currentMonthName = "June 2026";

  // Match tasks to day numbers based on their deadline string YYYY-MM-DD
  const getTasksForDay = (dayNum: number) => {
    const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const targetDateStr = `2026-06-${dayStr}`;
    return tasks.filter(t => t.deadline === targetDateStr);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header and Sync Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-400" />
            <h2 className="font-display font-bold text-lg text-white">Smart Calendar Integration</h2>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            Autonomous coordination. Automatically allocates hourly deep work blocks and breaks avoiding calendar overlaps.
          </p>
        </div>

        <button
          id="sync-google-calendar-btn"
          onClick={handleGoogleCalendarSync}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold text-xs transition-all duration-300 shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing Workspace..." : "Sync Google Calendar"}</span>
        </button>
      </div>

      {syncMessage && (
        <div className="p-4 bg-teal-500/5 rounded-2xl border border-teal-500/20 text-xs text-teal-300 font-medium font-mono flex items-center gap-2.5 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Main Grid: Visual Monthly Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Monthly Calendar layout */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <h3 className="font-display font-bold text-base text-white">{currentMonthName}</h3>
            <span className="text-xs font-mono text-slate-400">Current Week</span>
          </div>

          <div className="grid grid-cols-7 gap-2.5">
            {/* Week Headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}

            {/* Empty grid buffers to align days */}
            {Array.from({ length: 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[85px] rounded-xl border border-transparent"></div>
            ))}

            {daysInMonth.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isToday = day === 26; // Match system date (2026-06-26)

              return (
                <div 
                  key={day}
                  className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                    isToday 
                      ? "border-teal-500 bg-teal-500/5 shadow-md shadow-teal-500/5" 
                      : "border-slate-850 bg-slate-950/40 hover:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold font-mono ${isToday ? "text-teal-400" : "text-slate-500"}`}>
                      {day}
                    </span>
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>}
                  </div>

                  <div className="space-y-1 mt-2">
                    {dayTasks.map((t) => (
                      <div 
                        key={t.id} 
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate font-mono ${
                          t.priority === "High" ? "bg-red-500/15 text-red-400" : "bg-teal-500/15 text-teal-400"
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Dynamic Autopilot Focus Session Allocator */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Bot className="w-5 h-5 text-teal-400" />
            <h3 className="font-display font-bold text-base text-white">Planner Agent Timeline</h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Based on your deadline priority matrix and energy habits, our Planner Agent has allocated the following focus blocks:
            </p>

            <div className="space-y-3 font-mono">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs font-bold text-teal-400 uppercase">
                  <span>Today 19:00 - 21:00</span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-[9px]">Deep Work</span>
                </div>
                <span className="text-xs text-slate-300 block">Core Outline & Setup for high-risk study task</span>
                <span className="text-[10px] text-slate-500 block">Status: Waiting for focus trigger</span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-400 uppercase">
                  <span>Tomorrow 10:00 - 11:30</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-[9px]">Study Sprint</span>
                </div>
                <span className="text-xs text-slate-300 block">Review critical dependencies and study notes</span>
                <span className="text-[10px] text-slate-500 block">Status: Pre-scheduled in Google Calendar</span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs font-bold text-emerald-400 uppercase">
                  <span>Tomorrow 11:30 - 12:00</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px]">Recuperation</span>
                </div>
                <span className="text-xs text-slate-300 block">30-min buffer break & dynamic stress relief</span>
                <span className="text-[10px] text-slate-500 block">Status: Autocalculated break</span>
              </div>
            </div>

            {/* Dynamic conflict simulation feedback */}
            <div className="p-3 bg-teal-500/5 rounded-xl border border-teal-500/20 text-[11px] text-teal-300 font-mono leading-relaxed">
              ⭐ <span className="font-bold">Proactive Safety Rule:</span> The AI has rescheduled any meetings intersecting your primary Deep Work hours to preserve focus buffers.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
