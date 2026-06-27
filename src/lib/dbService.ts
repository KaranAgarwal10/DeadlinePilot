import { Task, UserProfile } from "../types";

// Database Service abstracting Auth and Firestore-like synced CRUD operations
// This provides zero-config high-durability persistence that works in sandboxes,
// synced with server-side database and fully prepared to switch to Firebase SDK.

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

class DatabaseService {
  private static AUTH_KEY = "deadlinepilot_auth_user";

  // Auth Operations
  static getLocalUser(): AuthUser | null {
    try {
      const saved = localStorage.getItem(this.AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  static async register(email: string, name: string): Promise<AuthUser> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to sign up.");
    }
    
    const data = await res.json();
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(data.user));
    return data.user;
  }

  static async login(email: string): Promise<AuthUser> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to log in.");
    }
    
    const data = await res.json();
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(data.user));
    return data.user;
  }

  static logout() {
    localStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem("deadlinepilot_tasks");
    localStorage.removeItem("deadlinepilot_profile");
  }

  // Synced Task Operations
  static async fetchTasks(userId: string): Promise<Task[]> {
    try {
      const res = await fetch(`/api/tasks?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Server fetch error");
      const data = await res.json();
      return data.tasks || [];
    } catch (e) {
      console.warn("Offline fallback for fetching tasks:", e);
      const saved = localStorage.getItem("deadlinepilot_tasks");
      return saved ? JSON.parse(saved) : [];
    }
  }

  static async syncTasks(userId: string, tasks: Task[]): Promise<void> {
    try {
      localStorage.setItem("deadlinepilot_tasks", JSON.stringify(tasks));
      await fetch("/api/tasks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tasks }),
      });
    } catch (e) {
      console.error("Database sync task error, remaining in offline-first mode:", e);
    }
  }

  // Synced User Profile Operations
  static async fetchProfile(userId: string): Promise<UserProfile> {
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Server profile fetch error");
      const data = await res.json();
      return data.profile;
    } catch (e) {
      console.warn("Offline fallback for fetching profile:", e);
      const saved = localStorage.getItem("deadlinepilot_profile");
      return saved ? JSON.parse(saved) : {
        name: "Developer",
        email: "developer@deadlinepilot.com",
        mood: "Focused",
        energyLevel: "High",
        workloadLimit: 6,
        dailyStreak: 3,
        level: 1,
        xp: 450,
        totalFocusMins: 120,
        badges: ["Safety Pilot"]
      };
    }
  }

  static async updateProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      localStorage.setItem("deadlinepilot_profile", JSON.stringify(profile));
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profile }),
      });
    } catch (e) {
      console.error("Profile sync failure:", e);
    }
  }
}

export default DatabaseService;
