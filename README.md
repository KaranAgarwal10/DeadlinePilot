# 🛸 DeadlinePilot — Autonomous Multi-Agent AI Productivity Platform

> **Google AI Hackathon Winner Blueprint**  
> *An autonomous, cognitive multi-agent productivity companion that actively schedules, analyzes, and predicts risk to help you beat deadlines.*

---

## 🧭 Project Quick Links & Live URLs
- **Development App Preview:** [Live Cockpit Preview](https://ais-dev-vwzf5glkt6szxx5h4xn2pa-155228287713.asia-east1.run.app)
- **Shared App URL:** [Interactive Client](https://ais-pre-vwzf5glkt6szxx5h4xn2pa-155228287713.asia-east1.run.app)
- **Backend Architecture:** Full-Stack Node.js (Express) + TypeScript + React/Vite
- **Core Intelligence Engine:** Google Gemini 3.5 Models (`gemini-3.5-flash`)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📐 1. ARCHITECTURE DIAGRAM
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
                    ┌──────────────────────────────┐
                    │      Vite Client App         │
                    │   (React 19 / Tailwind v4)   │
                    └──────────────┬───────────────┘
                                   │
                     JSON Sync / HTTP Commands / TTS & STT
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      Express Backend         │
                    │    (TypeScript / tsx)        │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌──────────────────────────┐               ┌──────────────────────────┐
│    Gemini API Gateway    │               │    Durable JSON Store    │
│  (Structured Swarm JSON) │               │   (Sync / Local Heuristics)│
└─────────────┬────────────┘               └──────────────────────────┘
              │
              ├─► [Coordinator Agent] ────► Orchestrates sub-agents
              ├─► [Planner Agent] ───────► Milestones & Sizing
              ├─► [Scheduler Agent] ─────► Micro-block placement
              ├─► [Risk Predictor] ──────► Failure probability
              ├─► [Motivation Agent] ────► Personalized cognitive coaching
              ├─► [Burnout Rescue] ──────► Fatigue relief calculations
              └─► [Insight Analyzer] ────► Long-term memory loops
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🤖 2. MULTI-AGENT SWARM DIAGRAM
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
                          ┌──────────────────────┐
                          │   User Task Input    │
                          │   "Add Physics Lab"  │
                          └──────────┬───────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │   [Coordinator Agent]        │
                      │   Orchestration Master       │
                      └──────┬─────┬─────┬─────┬─────┘
                             │     │     │     │
            ┌────────────────┘     │     │     └────────────────┐
            ▼                      ▼     ▼                      ▼
┌──────────────────────┐ ┌─────────┴┐  ┌─┴────────┐ ┌──────────────────────┐
│   [Planner Agent]    │ │Scheduler │  │ Risk     │ │  [Motivation Agent]  │
│                      │ │  Agent   │  │Predictor │ │                      │
│ - Complexity Index   │ │ - Blocks │  │- Stress  │ │ - Cognitive Praise   │
│ - Milestones         │ │ - Timings│  │- Margin  │ │ - Motivational Prompt│
└───────────┬──────────┘ └────┬─────┘  └────┬─────┘ └───────────┬──────────┘
            │                 │             │                   │
            └─────────────────┼─────────────┴───────────────────┘
                              ▼
                      ┌───────────────┐
                      │ Insights Loop │◄─────── Long-Term Memory
                      └───────┬───────┘
                              ▼
                ┌───────────────────────────┐
                │ Clean Structured Output   │
                │ (JSON validated schema)   │
                └───────────────────────────┘
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🗄️ 3. FIRESTORE DATABASE SCHEMA
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```typescript
// Firestore Entity Blueprints
export interface TaskCollection {
  id: string;             // Document ID
  userId: string;         // Owner reference for secure multi-tenant queries
  title: string;          // Extracted task name
  deadline: string;       // YYYY-MM-DD
  priority: "High" | "Medium" | "Low";
  estimatedTime: number;  // Sized in hours
  actualTimeSpent: number;
  difficulty: number;     // 1 to 5 scale
  dependencies: string[];
  category: string;
  urgency: "Urgent" | "Normal" | "Backlog";
  riskScore: number;      // 0 to 100 calculated by Risk Predictor
  stressLevel: "Low" | "Medium" | "High" | "Extreme";
  probabilityOfMissing: number;
  confidenceScore: number;
  motivatingPhrase: string;
  
  goalBreakdown: Array<{
    name: string;
    hours: number;
    completed: boolean;
  }>;
  
  suggestedSchedule: Array<{
    day: string;
    block: string;
    action: string;
    explanation?: string; // Explainable AI attribute
  }>;
  
  agentAssessments?: {
    coordinatorSummary: string;
    plannerOutput: string;
    schedulerOutput: string;
    riskOutput: string;
    motivationOutput: string;
    insightOutput: string;
  };
  
  status: "Pending" | "In_Progress" | "Completed" | "Overdue";
}

export interface UserProfileCollection {
  userId: string;
  name: string;
  email: string;
  mood: string;
  energyLevel: "High" | "Medium" | "Low";
  workloadLimit: number; // in hours per day
  dailyStreak: number;
  level: number;
  xp: number;
  totalFocusMins: number;
  sleepHours?: number;   // Dynamic cognitive burnout variable
  badges: string[];
}
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📡 4. REST API DOCUMENTATION
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### `POST /api/analyze-deadline`
*Analyzes raw user input and spawns the Multi-Agent Swarm to structure milestones and predict risk.*
* **Request Body:**
  ```json
  {
    "text": "Complete chemistry workbook by next Wednesday",
    "userContext": { "energyLevel": "High" }
  }
  ```
* **Response Status:** `200 OK`
* **Response Body:** Returns the structured `Task` entity complete with `agentAssessments` traces.

### `POST /api/simulate-whatif`
*Chronologically simulates the impact of procrastination on task risk, stress levels, and buffer margins.*
* **Request Body:**
  ```json
  {
    "task": { "id": "task-abc", "title": "Math Homework", "riskScore": 40, "deadline": "2026-06-30" },
    "postponeDays": 2
  }
  ```
* **Response Body:**
  ```json
  {
    "postponedTaskName": "Math Homework",
    "daysPostponed": 2,
    "originalRisk": 40,
    "simulatedRisk": 70,
    "originalStress": "Medium",
    "simulatedStress": "High",
    "warningMessage": "Postponing this task squeezes work windows. Stress will surge!",
    "mitigationPlan": "Complete a 45-minute focus session tomorrow to recover confidence."
  }
  ```

### `POST /api/reduce-workload`
*Empathetic Burnout Protection endpoint. Defers non-critical task deadlines and recalculates fatigue relief.*
* **Request Body:** `(Synchronizes current active state)`
  ```json
  { "tasks": [...], "profile": {...} }
  ```
* **Response:** Returns updated tasks list with delayed deadlines, a dynamic summary message, and action logs.

### `POST /api/daily-briefing`
*Compiles morning briefs summarizing priorities, completion probability, and recommended schedules.*
* **Response:** `{ "briefing": "Good morning Karan! Today's highest risk task is..." }`

### `POST /api/voice-command`
*Processes spoken audio transcriptions and executes direct state updates (e.g., adding tasks, replanning).*
* **Request Body:** `{ "commandText": "Add physics research due friday" }`
* **Response:** `{ "type": "ADD_TASK", "taskText": "physics research due friday", "reply": "Scheduling physics research!" }`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🚀 5. DEPLOYMENT & ENVIRONMENT VARIABLE GUIDE
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Deployment to Google Cloud Run (Containerized)
1. **Prepare Build Scripts:** Ensure `package.json` contains production-compliant commands:
   ```json
   "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs"
   ```
2. **Build and Tag Container:**
   ```bash
   gcloud builds submit --tag gcr.io/your-project-id/deadlinepilot .
   ```
3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy deadlinepilot \
     --image gcr.io/your-project-id/deadlinepilot \
     --platform managed \
     --port 3000 \
     --allow-unauthenticated
   ```

### Environment Variables (`.env.example`)
To configure cognitive intelligence, copy `.env.example` to `.env` and provide your secrets:
```env
# Google Gemini API Access key (Crucial for live swarm predictions)
GEMINI_API_KEY=your_gemini_api_key_here

# Runtime Config
NODE_ENV=production
PORT=3000
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 6. HACKATHON TESTING CHECKLIST
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [x] **Verification 1:** Multi-agent inspector console successfully logs individual agent traces.
- [x] **Verification 2:** Interactive slider recalculates Burnout Index dynamically based on sleep.
- [x] **Verification 3:** Clicking "De-congest Schedule" POSTs to `/api/reduce-workload` and shifts tasks.
- [x] **Verification 4:** Text-to-Speech (TTS) engine speaks the cockpit briefing clearly without HTML/markdown artifacts.
- [x] **Verification 5:** What-If simulation engine is fully wired and displays precise confidence calculations.
- [x] **Verification 6:** Multi-agent task analyzer correctly returns structured schemas under high concurrent loads.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔮 7. FUTURE ROADMAP
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
* **Phase 1:** Native integration with Google Workspace (Calendar, Gmail, Drive) to map real-time scheduled overlaps.
* **Phase 2:** Hardware notification support using IoT-enabled cockpit alert lights (e.g., physical desk lights shifting color as risk scores spike).
* **Phase 3:** Group Swarms—collaborative school or enterprise swarms scheduling parallel shared sprints.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📓 8. RELEASE NOTES & VERSION 1.0 CHANGELOG
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### **Version 1.0 — "Apollo Launch" (Stable Production Release)**
* **Feature:** Spelled out a full-stack Multi-Agent Swarm with detailed visual tracing consoles.
* **Feature:** Added native, offline-first deterministic heuristic calculators when the Gemini API is offline.
* **Feature:** Programmed HTML5 SpeachRecognition (STT) and SpeechSynthesis (TTS) directly into the cockpit brief cards.
* **Performance:** Bundled the Express backend into `dist/server.cjs` via `esbuild` to decrease memory and optimize server cold-starts on Cloud Run containers.
