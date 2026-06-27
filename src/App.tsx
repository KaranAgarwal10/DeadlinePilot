import React, { useState, useEffect } from "react";
import { UserProfile, Task } from "./types";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import TaskPilot from "./components/TaskPilot";
import CalendarView from "./components/CalendarView";
import AICoach from "./components/AICoach";
import FocusZone from "./components/FocusZone";
import NightReflection from "./components/NightReflection";
import SettingsView from "./components/SettingsView";
import RescueModeModal from "./components/RescueModeModal";
import AuthScreen from "./components/AuthScreen";
import DatabaseService, { AuthUser } from "./lib/dbService";
import { Sparkles, Bot, Compass, ShieldAlert } from "lucide-react";

// Pre-seeded high quality deadlines for immediate hackathon demo success
const INITIAL_TASKS: Task[] = [
  {
    id: "task-physics-202",
    title: "Complete Physics Lab 4 Electromagnetism report",
    deadline: "2026-06-29",
    priority: "High",
    estimatedTime: 5,
    actualTimeSpent: 0,
    difficulty: 4,
    dependencies: ["Acquire raw voltage calculations from lab partner", "Review magnetism formulas"],
    category: "Study",
    urgency: "Urgent",
    riskScore: 68,
    stressLevel: "High",
    probabilityOfMissing: 55,
    confidenceScore: 72,
    motivatingPhrase: "I noticed this lab report takes around 5 hours. You have optimal energy slots tonight. Let's finish Q1 immediately!",
    goalBreakdown: [
      { name: "Compile raw experimental voltage values", hours: 1, completed: true },
      { name: "Draft formulas & calculate resistance averages", hours: 2, completed: false },
      { name: "Generate visual plots and conclusions", hours: 2, completed: false }
    ],
    suggestedSchedule: [
      { day: "Today", block: "Focus Block (2 hrs)", action: "Map formula conclusions and verify partner's metrics." },
      { day: "Tomorrow", block: "Deep Work (2 hrs)", action: "Draft experimental procedures & analysis report." },
      { day: "Deadline Day", block: "Final Review (1 hr)", action: "Execute submission checks and zip lab document." }
    ],
    status: "In_Progress"
  },
  {
    id: "task-electricity-bill",
    title: "Settle recurring quarterly electric power bill",
    deadline: "2026-06-30",
    priority: "High",
    estimatedTime: 1,
    actualTimeSpent: 0,
    difficulty: 2,
    dependencies: ["Access bank online router"],
    category: "Bills",
    urgency: "Normal",
    riskScore: 42,
    stressLevel: "Medium",
    probabilityOfMissing: 20,
    confidenceScore: 90,
    motivatingPhrase: "Settle this today to secure your streak multiplier and lock in your Bill Protection safety logs.",
    goalBreakdown: [
      { name: "Review statement invoice totals", hours: 0.5, completed: false },
      { name: "Execute wire transfer via online bank portal", hours: 0.5, completed: false }
    ],
    suggestedSchedule: [
      { day: "Today", block: "Micro sprint (30 mins)", action: "Verify bill statement value and initialize payment wire." }
    ],
    status: "Pending",
    billProtection: {
      isAutoPay: false,
      amount: 142.50,
      billingCycle: "monthly"
    }
  },
  {
    id: "task-career-interview",
    title: "Research target company & prepare technical interview deck",
    deadline: "2026-07-03",
    priority: "Medium",
    estimatedTime: 8,
    actualTimeSpent: 0,
    difficulty: 3,
    dependencies: ["Verify company mission values", "Practice dynamic behavioral scenarios"],
    category: "Career",
    urgency: "Normal",
    riskScore: 28,
    stressLevel: "Low",
    probabilityOfMissing: 15,
    confidenceScore: 94,
    motivatingPhrase: "We have substantial buffer days. Completing the company research checklist tomorrow boosts safety margin.",
    goalBreakdown: [
      { name: "Outline product roadmap for company key products", hours: 3, completed: false },
      { name: "Structure behavioral practice template response sheets", hours: 3, completed: false },
      { name: "Interactive review run-through session", hours: 2, completed: false }
    ],
    suggestedSchedule: [
      { day: "Monday", block: "Preparation (3 hrs)", action: "Deep dive target company structure & product goals." },
      { day: "Tuesday", block: "Mock drills (3 hrs)", action: "Practice behavioural question sets in front of mirror." },
      { day: "Wednesday", block: "Final Review (2 hrs)", action: "Re-read resumes and dress-code check." }
    ],
    status: "Pending",
    interviewMode: true
  }
];

const INITIAL_PROFILE: UserProfile = {
  name: "Karan",
  email: "karanagar811@gmail.com",
  mood: "Focused",
  energyLevel: "High",
  workloadLimit: 6,
  dailyStreak: 3,
  level: 1,
  xp: 450,
  totalFocusMins: 120,
  theme: "teal",
  badges: ["Safety Pilot", "Streak Master"]
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => DatabaseService.getLocalUser());
  const [currentTab, setTab] = useState<string>("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isRescueOpen, setIsRescueOpen] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch tasks and profile from db once user logs in
  useEffect(() => {
    if (!currentUser) {
      setHasLoaded(false);
      return;
    }
    
    const loadPilotData = async () => {
      setIsDbLoading(true);
      try {
        const loadedTasks = await DatabaseService.fetchTasks(currentUser.uid);
        const loadedProfile = await DatabaseService.fetchProfile(currentUser.uid);
        
        // If server database doesn't have tasks yet, initialize with INITIAL_TASKS
        if (loadedTasks.length === 0) {
          setTasks(INITIAL_TASKS);
          await DatabaseService.syncTasks(currentUser.uid, INITIAL_TASKS);
        } else {
          setTasks(loadedTasks);
        }
        
        setProfile(loadedProfile);
        setHasLoaded(true);
      } catch (e) {
        console.error("Failed to load synced pilot profile:", e);
      } finally {
        setIsDbLoading(false);
      }
    };
    
    loadPilotData();
  }, [currentUser]);

  // Sync state to database service
  useEffect(() => {
    if (!currentUser || !hasLoaded) return;
    DatabaseService.syncTasks(currentUser.uid, tasks);
  }, [tasks, currentUser, hasLoaded]);

  useEffect(() => {
    if (!currentUser || !hasLoaded) return;
    DatabaseService.updateProfile(currentUser.uid, profile);
  }, [profile, currentUser, hasLoaded]);

  // Check system API config on load and regularly poll for quota status updates
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
        setIsQuotaExceeded(data.isQuotaExceeded || false);
      } catch (e) {
        setHasApiKey(false);
        setIsQuotaExceeded(false);
      }
    };
    checkConfig();
    const interval = setInterval(checkConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handler to add new tasks (analyzed or simple)
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    // Gain immediate XP for capturing and outlining a deadline
    setProfile(prev => ({ ...prev, xp: prev.xp + 100 }));
  };

  // Quick Capture from the Dashboard input
  const handleQuickAdd = async (text: string) => {
    try {
      const response = await fetch("/api/analyze-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const parsed = await response.json();
      
      const builtTask: Task = {
        id: `task-${Date.now()}`,
        title: parsed.title || text,
        deadline: parsed.deadline || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        priority: parsed.priority || "Medium",
        estimatedTime: parsed.estimatedTime || 4,
        actualTimeSpent: 0,
        difficulty: parsed.difficulty || 3,
        dependencies: parsed.dependencies || [],
        category: parsed.category || "Study",
        urgency: parsed.urgency || "Normal",
        riskScore: parsed.riskScore || 50,
        stressLevel: parsed.stressLevel || "Medium",
        probabilityOfMissing: parsed.probabilityOfMissing || 35,
        confidenceScore: parsed.confidenceScore || 85,
        motivatingPhrase: parsed.motivatingPhrase || "Captured and dynamically planned!",
        goalBreakdown: (parsed.goalBreakdown || []).map((b: any) => ({ ...b, completed: false })),
        suggestedSchedule: parsed.suggestedSchedule || [],
        status: "Pending",
        agentAssessments: parsed.agentAssessments
      };

      setTasks(prev => [builtTask, ...prev]);
      setProfile(prev => ({ ...prev, xp: prev.xp + 150 }));
      setTab("tasks");
    } catch (e) {
      console.error(e);
    }
  };

  const [isReplanning, setIsReplanning] = useState(false);
  const [replanAssessment, setReplanAssessment] = useState<string>("");

  const handleAdaptiveReplan = async () => {
    setIsReplanning(true);
    try {
      const response = await fetch("/api/adaptive-replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, userProfile: profile })
      });
      const data = await response.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
      if (data.globalCoachingAssessment) {
        setReplanAssessment(data.globalCoachingAssessment);
      }
      // Award XP for swarm optimization
      setProfile(curr => ({ 
        ...curr, 
        xp: curr.xp + 200,
        level: curr.level + (curr.xp + 200 >= 1000 ? 1 : 0)
      }));
    } catch (e) {
      console.error("Adaptive Replan Error:", e);
    } finally {
      setIsReplanning(false);
    }
  };

  const handleUpdateTask = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isComp = t.status === "Completed";
        const targetStatus = isComp ? "Pending" : "Completed";
        const targetRisk = isComp ? 50 : 0;
        
        // Award substantial XP for completing missions
        if (!isComp) {
          setProfile(curr => ({ ...curr, xp: curr.xp + 300 }));
        }

        return {
          ...t,
          status: targetStatus as any,
          riskScore: targetRisk
        };
      }
      return t;
    }));
  };

  const handleResetData = () => {
    setTasks(INITIAL_TASKS);
    setProfile(INITIAL_PROFILE);
    if (currentUser) {
      DatabaseService.syncTasks(currentUser.uid, INITIAL_TASKS);
      DatabaseService.updateProfile(currentUser.uid, INITIAL_PROFILE);
    }
  };

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(usr) => setCurrentUser(usr)} />;
  }

  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-xs font-mono text-teal-400 animate-pulse uppercase tracking-wider">Loading Synced Pilot Logbooks...</p>
      </div>
    );
  }

  return (
    <div data-theme={profile.theme || "teal"} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navigation and Top Bar */}
      <Navigation 
        currentTab={currentTab} 
        setTab={setTab} 
        profile={profile} 
        setProfile={setProfile}
        openEmergencyMode={() => setIsRescueOpen(true)}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        {currentTab === "dashboard" && (
          <Dashboard 
            tasks={tasks} 
            profile={profile} 
            setTab={setTab} 
            onQuickAdd={handleQuickAdd}
            onToggleTask={handleToggleTask}
            onAdaptiveReplan={handleAdaptiveReplan}
            isReplanning={isReplanning}
            replanAssessment={replanAssessment}
            setProfile={setProfile}
            setTasks={setTasks}
            hasApiKey={hasApiKey}
            isQuotaExceeded={isQuotaExceeded}
          />
        )}
        {currentTab === "tasks" && (
          <TaskPilot 
            tasks={tasks} 
            profile={profile}
            onAddTask={handleAddTask} 
            onUpdateTask={handleUpdateTask} 
            onDeleteTask={handleDeleteTask}
            hasApiKey={hasApiKey}
          />
        )}
        {currentTab === "calendar" && (
          <CalendarView 
            tasks={tasks} 
            onAddTask={handleAddTask}
          />
        )}
        {currentTab === "coach" && (
          <AICoach 
            tasks={tasks} 
            profile={profile} 
            setProfile={setProfile}
          />
        )}
        {currentTab === "focus" && (
          <FocusZone 
            profile={profile} 
            setProfile={setProfile}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
          />
        )}
        {currentTab === "reflection" && (
          <NightReflection 
            tasks={tasks} 
            profile={profile} 
            setProfile={setProfile}
          />
        )}
        {currentTab === "settings" && (
          <SettingsView 
            profile={profile} 
            setProfile={setProfile} 
            hasApiKey={hasApiKey}
            isQuotaExceeded={isQuotaExceeded}
            onResetData={handleResetData}
            onLogout={() => {
              DatabaseService.logout();
              setCurrentUser(null);
              setTasks([]);
              setProfile(INITIAL_PROFILE);
            }}
          />
        )}
      </main>

      {/* Emergency Rescue Mode Modal Overlay */}
      <RescueModeModal 
        isOpen={isRescueOpen} 
        onClose={() => setIsRescueOpen(false)} 
        tasks={tasks}
      />

      {/* Global minimal system status footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[10px] text-slate-500 font-mono tracking-wide">
        <span>© 2026 DeadlinePilot. Built with modern Google AI. Powered by Gemini 3.5.</span>
      </footer>

    </div>
  );
}
