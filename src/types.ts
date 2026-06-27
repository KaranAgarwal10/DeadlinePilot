export interface SubTask {
  name: string;
  hours: number;
  completed: boolean;
}

export interface DaySchedule {
  day: string;
  block: string;
  action: string;
  explanation?: string;
}

export interface AgentAssessments {
  coordinatorSummary: string;
  plannerOutput: string;
  schedulerOutput: string;
  riskOutput: string;
  motivationOutput: string;
  insightOutput: string;
}

export interface Task {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  priority: "High" | "Medium" | "Low";
  estimatedTime: number; // hours
  actualTimeSpent: number; // hours
  difficulty: number; // 1-5
  dependencies: string[];
  category: "Study" | "Work" | "Health" | "Bills" | "Career" | "Personal";
  urgency: "Immediate" | "Urgent" | "Normal" | "Backlog";
  riskScore: number; // 0-100
  stressLevel: "Low" | "Medium" | "High" | "Extreme";
  probabilityOfMissing: number; // 0-100%
  confidenceScore: number; // 0-100%
  motivatingPhrase: string;
  goalBreakdown: SubTask[];
  suggestedSchedule: DaySchedule[];
  status: "Pending" | "In_Progress" | "Completed";
  notes?: string;
  examMode?: boolean;
  interviewMode?: boolean;
  isRecurring?: boolean;
  recurringInterval?: "Daily" | "Weekly" | "Monthly" | "None";
  attachments?: string[];
  comments?: { id: string; author: string; text: string; date: string }[];
  billProtection?: {
    isAutoPay: boolean;
    amount?: number;
    billingCycle?: "monthly" | "yearly" | "once";
  };
  agentAssessments?: AgentAssessments;
}

export interface LongTermMemory {
  preferredWorkHours: string;
  focusPatterns: string;
  habitHistory: string[];
  completedTasksCount: number;
  skippedTasksCount: number;
  studyPreferences: string;
  energyLevels: Record<string, number>;
  mostProductiveTime: string;
  longTermGoals: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  mood: "Focused" | "Exhausted" | "Anxious" | "Determined" | "Chill" | "Overwhelmed";
  energyLevel: "High" | "Moderate" | "Low";
  workloadLimit: number; // hours per day
  dailyStreak: number;
  level: number;
  xp: number;
  totalFocusMins: number;
  badges: string[];
  sleepHours?: number;
  theme?: "teal" | "amber" | "emerald" | "indigo" | "rose";
  burnoutPercentage?: number;
  burnoutRisk?: "Low" | "Moderate" | "High" | "Severe";
  recoverySuggestions?: string[];
  memory?: LongTermMemory;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "warning" | "success" | "info" | "coach";
  read: boolean;
}

export interface FocusSessionState {
  isActive: boolean;
  durationMins: number;
  timeLeftSeconds: number;
  mode: "Pomodoro" | "Short_Break" | "Long_Break";
  sound: "None" | "Rain" | "Lo-Fi" | "Binaural" | "Forest";
  websiteBlocker: boolean;
  phoneDistractionWarning: boolean;
  encouragementInterval: number;
}
