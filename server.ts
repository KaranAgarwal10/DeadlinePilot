import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Centralized Structured Logging Utilities
const Logger = {
  info: (message: string, meta?: any) => {
    const logObj = { timestamp: new Date().toISOString(), level: "INFO", message, ...meta };
    console.log(process.env.NODE_ENV === "production" ? JSON.stringify(logObj) : `[INFO] ${message} ${meta ? JSON.stringify(meta) : ""}`);
  },
  warn: (message: string, meta?: any) => {
    const logObj = { timestamp: new Date().toISOString(), level: "WARN", message, ...meta };
    console.warn(process.env.NODE_ENV === "production" ? JSON.stringify(logObj) : `\x1b[33m[WARN] ${message}\x1b[0m ${meta ? JSON.stringify(meta) : ""}`);
  },
  error: (message: string, error?: any, meta?: any) => {
    const logObj = { 
      timestamp: new Date().toISOString(), 
      level: "ERROR", 
      message, 
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      ...meta 
    };
    console.error(process.env.NODE_ENV === "production" ? JSON.stringify(logObj) : `\x1b[31m[ERROR] ${message}\x1b[0m`, error || "", meta || "");
  }
};

// Express Request Logger Middleware with Performance tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    Logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip
    });
  });
  next();
});

// Lazy-initialize Gemini SDK to prevent crashes on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global state to track dynamic API quota status and preferred start model
let quotaExceededState = false;
let preferredModelIndex = 0; // 0 = gemini-3.5-flash, 1 = gemini-3.1-flash-lite
let lastQuotaCheckTime = 0;
let currentQuotaCooldownMs = 5 * 60 * 1000; // Dynamic cooling-off period (5m for minute rate limits, 12h for daily free tier limit)

// Unified Gemini Generator with automated retry, model fallback & logging resilience
async function generateAI(contents: any, config: any = {}): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("Gemini API key is not configured or invalid.");
  }
  
  // High-resilience cascade of models to bypass specific model quotas (e.g., gemini-3.5-flash)
  const models = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  // If we had previously fallen back, check if the cooldown has expired to retry primary
  let startModelIndex = preferredModelIndex;
  if (startModelIndex > 0 && (Date.now() - lastQuotaCheckTime > currentQuotaCooldownMs)) {
    Logger.info("Gemini quota cooling-off period completed. Retrying primary model.");
    preferredModelIndex = 0;
    startModelIndex = 0;
  }
  
  let modelIndex = startModelIndex;
  let attempt = 0;
  const maxRetries = 2;

  while (modelIndex < models.length) {
    const currentModel = models[modelIndex];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: contents,
        config: config
      });
      // Clear quota error state if we successfully call the primary model
      if (modelIndex === 0) {
        quotaExceededState = false;
        preferredModelIndex = 0;
      }
      return response;
    } catch (err: any) {
      const errMsg = err?.message || "";
      const isQuotaError = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        quotaExceededState = true;
        if (modelIndex === 0) {
          // Track that the primary model is exhausted and we should default to fallback directly
          preferredModelIndex = 1;
          lastQuotaCheckTime = Date.now();
          const lowerMsg = errMsg.toLowerCase();
          if (lowerMsg.includes("requestsperday") || lowerMsg.includes("perday") || lowerMsg.includes("daily") || lowerMsg.includes("limit: 20")) {
            currentQuotaCooldownMs = 12 * 60 * 60 * 1000; // 12-hour cooling off period for daily quota limits
            Logger.warn(`Gemini 3.5-flash hit daily request limit. Setting 12-hour local backup model default.`);
          } else {
            currentQuotaCooldownMs = 5 * 60 * 1000; // 5 minutes for short-term RPM limits
          }
        }
        Logger.warn(`Gemini model ${currentModel} quota limits exceeded or rate limited. Cascading to next available model.`, { error: errMsg });
        modelIndex++;
        attempt = 0; // Reset retry attempts for the next model
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      attempt++;
      if (attempt > maxRetries) {
        Logger.error(`Gemini generation permanently failed after ${attempt} attempts on model ${currentModel}. Trying next cascade model.`, err, { contents });
        modelIndex++;
        attempt = 0;
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }
      Logger.warn(`Gemini generation transient error on model ${currentModel} (Attempt ${attempt}/${maxRetries}). Retrying...`, { error: errMsg });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error("All Gemini models in the resilient cascade failed or exceeded their quota limits.");
}

// Check API key endpoint
app.get("/api/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({ hasApiKey: hasKey, isQuotaExceeded: quotaExceededState });
});

// Helper for generating fallback mock responses
function generateMockAnalysis(text: string) {
  const title = text.replace(/submit|plan|schedule|do|exam|assignment/gi, "").trim() || "Important Task";
  const capitalTitle = title.charAt(0).toUpperCase() + title.slice(1);
  const difficulty = Math.floor(Math.random() * 3) + 2; // 2 to 4
  const estimatedTime = difficulty * 2 + 1; // 5 to 9 hours
  const riskScore = Math.floor(Math.random() * 30) + 40; // 40 to 70
  
  return {
    title: capitalTitle,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: riskScore > 60 ? "High" : "Medium",
    estimatedTime,
    difficulty,
    dependencies: ["Review prerequisite lectures", "Set up project repository"],
    category: text.toLowerCase().includes("bill") ? "Bills" : text.toLowerCase().includes("exam") ? "Health" : "Study",
    urgency: riskScore > 60 ? "Urgent" : "Normal",
    riskScore,
    stressLevel: riskScore > 75 ? "Extreme" : riskScore > 55 ? "High" : "Medium",
    probabilityOfMissing: riskScore - 10,
    confidenceScore: 85,
    motivatingPhrase: "I noticed this takes about " + estimatedTime + " hours. We have plenty of buffer if we start a study sprint now!",
    goalBreakdown: [
      { name: "Phase 1: Foundations & Planning", hours: Math.ceil(estimatedTime * 0.2) },
      { name: "Phase 2: Core Execution & Implementation", hours: Math.ceil(estimatedTime * 0.5) },
      { name: "Phase 3: Final Polishing & Verification", hours: Math.ceil(estimatedTime * 0.3) }
    ],
    suggestedSchedule: [
      { day: "Today", block: "Focus Block (2 hrs)", action: "Kickstart foundations and outline requirements." },
      { day: "Tomorrow", block: "Deep Work (4 hrs)", action: "Core development/drafting session without distractions." },
      { day: "Deadline Day", block: "Buffer Session (1 hr)", action: "Review and final submission checklist." }
    ]
  };
}

// 1. AI Task Capture & Smart Deadline Analyzer (Multi-Agent Swarm)
app.post("/api/analyze-deadline", async (req, res) => {
  const { text, userContext } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Task text is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful rule-based mockup fallback
    const mock = generateMockAnalysis(text);
    return res.json({
      ...mock,
      agentAssessments: {
        coordinatorSummary: "Master Coordinator routed this task capture request to the Planner and Scheduler agents. Integrated offline-optimized ruleset.",
        plannerOutput: "Planner broke this down into foundational milestones and calculated " + mock.estimatedTime + " hours of required focus blocks.",
        schedulerOutput: "Scheduler identified optimal work intervals based on typical evening focus peaks.",
        riskOutput: "Risk Prediction calculated a " + mock.riskScore + "% failure risk based on upcoming deadlines and stress metrics.",
        motivationOutput: "Motivation recommends starting with an active study sprint to secure initial XP boosts.",
        insightOutput: "Insight notes your focus level is highest during PM hours. Scheduled blocks placed accordingly."
      },
      isSimulated: true,
      message: "Using offline-optimized pilot scheduler. Configure your GEMINI_API_KEY for dynamic context-aware planning."
    });
  }

  try {
    const prompt = `You are the Master Coordinator Agent for DeadlinePilot, orchestrating a Multi-Agent Swarm to analyze the following task and user context:
Task Input: "${text}"
User Context: ${JSON.stringify(userContext || {})}

Coordinate with the following sub-agents:
1. Planner Agent: Break down into milestone hours, estimate realistic effort.
2. Scheduler Agent: Formulate day-by-day block level schedules.
3. Risk Prediction Agent: Estimate riskScore (0-100), probabilityOfMissing (0-100), stressLevel.
4. Motivation Agent: Formulate personalized, empowering coaching insights.
5. Insight Agent: Examine behavioral tendencies and suggest work alignments.

Generate a highly structured JSON response containing both the overall planned task and individual agent-by-agent evaluations.

Required overall task fields:
- title: string (short, clean human task name)
- deadline: string (YYYY-MM-DD format, estimate based on text or default to 3 days from now if not mentioned)
- priority: "High" | "Medium" | "Low"
- estimatedTime: number (hours required to complete, realistically modeled)
- difficulty: number (1 to 5 scale)
- dependencies: string[] (prerequisite actions or conditions required before starting)
- category: "Study" | "Work" | "Health" | "Bills" | "Career" | "Personal"
- urgency: "Immediate" | "Urgent" | "Normal" | "Backlog"
- riskScore: number (0-100 score indicating risk of missing the deadline)
- stressLevel: "Low" | "Medium" | "High" | "Extreme"
- probabilityOfMissing: number (0-100 percentage)
- confidenceScore: number (0-100 percentage)
- motivatingPhrase: string (personalized, highly motivating, proactive, coaching sentence)
- goalBreakdown: array of { name: string, hours: number } (milestones or steps)
- suggestedSchedule: array of { day: string, block: string, action: string, explanation: string } (step-by-step roadmap days leading to deadline with clear explanation why)

Required agentAssessments fields:
- coordinatorSummary: string (the Master Coordinator's orchestration summary)
- plannerOutput: string (Planner's breakdown analysis)
- schedulerOutput: string (Scheduler's calendar-block placement reasoning)
- riskOutput: string (Risk Prediction's failure-mode analysis)
- motivationOutput: string (Motivation's behavioral stimulus commentary)
- insightOutput: string (Insight's cognitive optimization advice)
`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: [
          "title", "deadline", "priority", "estimatedTime", "difficulty", 
          "dependencies", "category", "urgency", "riskScore", "stressLevel",
          "probabilityOfMissing", "confidenceScore", "motivatingPhrase", 
          "goalBreakdown", "suggestedSchedule", "agentAssessments"
        ],
        properties: {
          title: { type: Type.STRING },
          deadline: { type: Type.STRING },
          priority: { type: Type.STRING },
          estimatedTime: { type: Type.NUMBER },
          difficulty: { type: Type.NUMBER },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          category: { type: Type.STRING },
          urgency: { type: Type.STRING },
          riskScore: { type: Type.NUMBER },
          stressLevel: { type: Type.STRING },
          probabilityOfMissing: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          motivatingPhrase: { type: Type.STRING },
          goalBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "hours"],
              properties: {
                name: { type: Type.STRING },
                hours: { type: Type.NUMBER }
              }
            }
          },
          suggestedSchedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["day", "block", "action", "explanation"],
              properties: {
                day: { type: Type.STRING },
                block: { type: Type.STRING },
                action: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          },
          agentAssessments: {
            type: Type.OBJECT,
            required: ["coordinatorSummary", "plannerOutput", "schedulerOutput", "riskOutput", "motivationOutput", "insightOutput"],
            properties: {
              coordinatorSummary: { type: Type.STRING },
              plannerOutput: { type: Type.STRING },
              schedulerOutput: { type: Type.STRING },
              riskOutput: { type: Type.STRING },
              motivationOutput: { type: Type.STRING },
              insightOutput: { type: Type.STRING }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    const mock = generateMockAnalysis(text);
    return res.json({
      ...mock,
      agentAssessments: {
        coordinatorSummary: "Failed to load cloud swarm. Offline mode fallback activated.",
        plannerOutput: "Offline rules estimated task requirements.",
        schedulerOutput: "Standard evening blocks allocated.",
        riskOutput: "Risk predicted via deterministic time delta calculations.",
        motivationOutput: "Remember, consistency beats intensity. Start today!",
        insightOutput: "Keep track of task speedrun metrics to calibrate the local scheduler."
      },
      isSimulated: true,
      error: error.message
    });
  }
});

// 2. AI Coach Chat / Multi-Agent Dialogue
app.post("/api/chat-coach", async (req, res) => {
  const { messages, taskState, userProfile } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const ai = getGeminiClient();
  const recentMsg = messages[messages.length - 1]?.content || "";

  if (!ai) {
    // Fallback offline simulated replies
    let reply = "I am your DeadlinePilot Coach! Let's map out your focus roadmap. Make sure to complete the core milestones to keep your risk score green.";
    if (recentMsg.toLowerCase().includes("exhaust") || recentMsg.toLowerCase().includes("tired")) {
      reply = "I hear you. Burning out will destroy your efficiency. I've initiated a 'Smart Recovery Plan': let's reschedule today's focus block by 2 hours and schedule a 15-minute mindfulness buffer. Rest now, we'll attack it with 100% energy later.";
    } else if (recentMsg.toLowerCase().includes("exam") || recentMsg.toLowerCase().includes("study")) {
      reply = "Exam Mode engaged! I've activated our spaced-repetition timeline. I suggest breaking down your core chapters into 45-minute focus sprints. Shall we start the first session?";
    } else if (recentMsg.toLowerCase().includes("plan my week") || recentMsg.toLowerCase().includes("schedule")) {
      reply = "Weekly layout compiled! I've automatically allocated 12 deep-work blocks, keeping Friday evening as a reward buffer. This gives you a 94% success probability based on your current workload.";
    }
    return res.json({
      content: reply,
      agentType: "CoachAgent",
      timestamp: new Date().toISOString(),
      isSimulated: true
    });
  }

  try {
    const prompt = `You are the DeadlinePilot AI Productivity Coach, an empathetic, highly strategic, and hyper-competent executive coach.
You represent a collaborative group of specialized sub-agents:
- Planner Agent (breaking goals down, blocking calendar slots)
- Scheduler Agent (dynamic rescheduling, shift work windows)
- Motivation Agent (empathetic encouragement, gamification XP triggers)
- Risk Prediction Agent (burnout monitoring, stress calculations)
- Reflection Agent (nightly review analysis)

Current Workspace Task State: ${JSON.stringify(taskState || [])}
User Profile (Mood, Energy, Workload): ${JSON.stringify(userProfile || {})}

Dialogue History:
${messages.map((m: any) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n")}

Respond to the user with a helpful, actionable, and visually clean (Markdown) response. Keep it conversational, under 180 words, and exceptionally focused on guiding them through the current deadlines rather than passive alerts.`;

    const response = await generateAI(prompt);

    return res.json({
      content: response.text?.trim() || "Let's keep driving towards your deadline!",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini Coach Error:", error);
    return res.json({
      content: "I'm experiencing an API connection lag, but as your Pilot, I recommend focusing on your highest risk task first to lower your stress score!",
      isSimulated: true
    });
  }
});

// 3. "What-If" Procrastination Simulation Engine
app.post("/api/simulate-whatif", async (req, res) => {
  const { task, postponeDays } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task data is required" });
  }

  const days = postponeDays || 1;
  const ai = getGeminiClient();

  if (!ai) {
    // Fallback simulated numbers
    const baseRisk = task.riskScore || 45;
    const baseStress = task.stressLevel || "Medium";
    const newRisk = Math.min(100, baseRisk + (days * 15));
    const newStress = newRisk > 75 ? "Extreme" : newRisk > 50 ? "High" : "Medium";
    
    return res.json({
      postponedTaskName: task.title,
      daysPostponed: days,
      originalRisk: baseRisk,
      simulatedRisk: newRisk,
      originalStress: baseStress,
      simulatedStress: newStress,
      originalProbability: Math.max(0, baseRisk - 10),
      simulatedProbability: Math.max(0, newRisk - 5),
      warningMessage: `Postponing this task by ${days} days will squeeze your deep-work window. Your stress score will surge into the ${newStress} range!`,
      mitigationPlan: `To counteract this delay, I recommend a 45-minute high-intensity sprint immediately tomorrow morning to ensure you do not drop below 80% confidence.`
    });
  }

  try {
    const prompt = `Simulate the chronological impact of procrastinating or delaying the following task:
Task: ${JSON.stringify(task)}
Postponed by: ${days} days

Calculate the shift in:
- riskScore (0 to 100)
- stressLevel ("Low" | "Medium" | "High" | "Extreme")
- probabilityOfMissing (0 to 100)
- warningMessage (a strict, data-backed analytical coaching warning about why this delay is risky or how to handle it)
- mitigationPlan (concrete schedule changes to make up for the procrastination)

Return a strictly valid JSON object.`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["originalRisk", "simulatedRisk", "originalStress", "simulatedStress", "originalProbability", "simulatedProbability", "warningMessage", "mitigationPlan"],
        properties: {
          originalRisk: { type: Type.NUMBER },
          simulatedRisk: { type: Type.NUMBER },
          originalStress: { type: Type.STRING },
          simulatedStress: { type: Type.STRING },
          originalProbability: { type: Type.NUMBER },
          simulatedProbability: { type: Type.NUMBER },
          warningMessage: { type: Type.STRING },
          mitigationPlan: { type: Type.STRING }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    return res.json({
      postponedTaskName: task.title,
      daysPostponed: days,
      ...data
    });
  } catch (error: any) {
    console.error("What-if Simulation error:", error);
    return res.json({
      postponedTaskName: task.title,
      daysPostponed: days,
      originalRisk: task.riskScore || 50,
      simulatedRisk: Math.min(100, (task.riskScore || 50) + 20),
      originalStress: task.stressLevel || "Medium",
      simulatedStress: "High",
      originalProbability: 40,
      simulatedProbability: 75,
      warningMessage: "Warning: Postponing reduces available buffer time and increases risk of schedule congestion.",
      mitigationPlan: "Execute a focused sprint tomorrow morning to stay on track."
    });
  }
});

// 4. AI Extension Negotiation Assistant
app.post("/api/negotiate-extension", async (req, res) => {
  const { task, reason } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task details are required" });
  }

  const ai = getGeminiClient();
  const taskReason = reason || "unexpected technical blocker / workload congestion";

  if (!ai) {
    // Rich fallback
    return res.json({
      emailDraft: `Subject: Request for Extension - ${task.title}\n\nDear team,\n\nI hope this message finds you well.\n\nI am writing to respectfully request a brief extension for "${task.title}", which is currently due on ${task.deadline}.\n\nDue to ${taskReason}, I want to ensure the final deliverable meets our standard of excellence. I have structured a detailed catch-up roadmap and can submit the completed work by Friday.\n\nThank you for your understanding and support.\n\nWarm regards,\n[Your Name]`,
      strategyAdvice: "Send this email today! Asking for an extension at least 24 hours prior to a deadline demonstrates exceptional communication skills."
    });
  }

  try {
    const prompt = `Write a highly professional, respectful, and structured email draft to negotiate an extension for the following task:
Task: ${JSON.stringify(task)}
Reason for delay: "${taskReason}"

Provide:
1. emailDraft: A beautiful, editable text draft of the email requesting the extension.
2. strategyAdvice: Tactical coaching tips on how and when to present this request to a supervisor, teacher, or client.

Return a strictly valid JSON object with the keys "emailDraft" and "strategyAdvice".`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["emailDraft", "strategyAdvice"],
        properties: {
          emailDraft: { type: Type.STRING },
          strategyAdvice: { type: Type.STRING }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    return res.json(data);
  } catch (error: any) {
    console.error("Negotiator Error:", error);
    return res.json({
      emailDraft: `Subject: Request for Extension: ${task.title}\n\nDear team,\n\nI am writing to request a brief timeline extension for ${task.title} due to ${taskReason}. Thank you.`,
      strategyAdvice: "Present clear alternative dates and offer partial deliverables to build professional trust."
    });
  }
});

// 5. Daily Reflection Report Generator
app.post("/api/generate-reflection", async (req, res) => {
  const { completedTasks, pendingTasks, streak, date } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      achievements: "Completed high-priority planning blocks and maintained a clean focus layout.",
      missedMilestones: "Some lower-urgency tasks were deferred to keep your primary deadlines safe.",
      coachingStrategy: "Tomorrow's focus should be allocated to your highest risk tasks before 2 PM while your energy score is peak.",
      streakBonus: streak > 0 ? `You are on a ${streak} day streak! Maintain it tomorrow to unlock the Elite Pilot badge.` : "Start your streak tomorrow to trigger productivity XP multipliers!"
    });
  }

  try {
    const prompt = `You are the Reflection Agent for DeadlinePilot. Based on today's logs, generate a nightly productivity reflection report.
Completed Tasks: ${JSON.stringify(completedTasks || [])}
Pending Tasks: ${JSON.stringify(pendingTasks || [])}
Current Streak: ${streak}
Date: ${date}

Analyze performance and return a structured JSON response with:
- achievements: string (concise, inspiring bullet points)
- missedMilestones: string (honest but empathetic breakdown of what wasn't finished)
- coachingStrategy: string (actionable strategy for tomorrow)
- streakBonus: string (motivating statement about streak status)`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["achievements", "missedMilestones", "coachingStrategy", "streakBonus"],
        properties: {
          achievements: { type: Type.STRING },
          missedMilestones: { type: Type.STRING },
          coachingStrategy: { type: Type.STRING },
          streakBonus: { type: Type.STRING }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    return res.json(data);
  } catch (error: any) {
    return res.json({
      achievements: "Logged focus sessions and stayed on top of your priorities.",
      missedMilestones: "Deferred items have been securely moved to tomorrow's dynamic queue.",
      coachingStrategy: "Focus on the highest risk items first thing in the morning.",
      streakBonus: "Keep pushing tomorrow to secure your streak!"
    });
  }
});

// 6. Gemini Vision Note & Image Task Extractor
app.post("/api/analyze-vision", async (req, res) => {
  const { base64Data, mimeType, filename } = req.body;
  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: "base64Data and mimeType are required" });
  }

  const ai = getGeminiClient();
  let cleanBase64 = base64Data;
  if (base64Data.includes(";base64,")) {
    cleanBase64 = base64Data.split(";base64,")[1];
  }

  if (!ai) {
    // Return high quality offline mockup task derived from input and filename
    const isSyllabus = filename?.toLowerCase().includes("syllabus") || mimeType.includes("pdf");
    const title = isSyllabus ? "Complete Physics 202 Lab Report" : "Settle Electricity Bill payment";
    const category = isSyllabus ? "Study" : "Bills";
    const difficulty = isSyllabus ? 4 : 2;
    const estimatedTime = isSyllabus ? 6 : 1;

    return res.json({
      title,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: isSyllabus ? "High" : "Medium",
      estimatedTime,
      difficulty,
      dependencies: isSyllabus 
        ? ["Acquire voltage averages", "Review magnetism formulas"] 
        : ["Validate bank wire credentials"],
      category,
      urgency: "Urgent",
      riskScore: isSyllabus ? 72 : 45,
      stressLevel: isSyllabus ? "High" : "Medium",
      probabilityOfMissing: isSyllabus ? 60 : 25,
      confidenceScore: 85,
      motivatingPhrase: `Extracted from ${filename || "image"}. This will take around ${estimatedTime} hours. Let's start the setup phase!`,
      goalBreakdown: isSyllabus ? [
        { name: "Compile raw experimental voltage values", hours: 2 },
        { name: "Draft formulas & resistance calculation conclusions", hours: 2 },
        { name: "Polishing & final submission checklist", hours: 2 }
      ] : [
        { name: "Verify electricity bill statement invoice", hours: 0.5 },
        { name: "Authorize transaction via payment portal", hours: 0.5 }
      ],
      suggestedSchedule: isSyllabus ? [
        { day: "Today", block: "Focus block (2h)", action: "Consolidate voltages and format calculations.", explanation: "Scheduled now because your logged focus minutes peak during late-evening slots." },
        { day: "Tomorrow", block: "Deep Work (2h)", action: "Draft experimental conclusions and reports.", explanation: "Scheduled in the morning to leverage your high energy score." },
        { day: "Deadline Day", block: "Submission Check (2h)", action: "Final review and compilation.", explanation: "Scheduled near deadline as a low-stress buffer verification." }
      ] : [
        { day: "Today", block: "Micro sprint (1h)", action: "Authorize bank wire transfer.", explanation: "Settle this immediately to lock in daily streak multipliers and protect your credentials." }
      ],
      isSimulated: true
    });
  }

  try {
    const prompt = `You are a Vision-based Task Planner Agent for DeadlinePilot. Analyze this document, notes, screenshot, whiteboard, or syllabus.
Extract the most critical upcoming deadline or bill payment and structure it into a detailed, valid DeadlinePilot JSON task object.

IMPORTANT:
- Ensure the 'deadline' is a valid date string in YYYY-MM-DD format (estimate reasonably relative to today, which is June 27, 2026, if not specified).
- Ensure 'category' is one of: "Study" | "Work" | "Health" | "Bills" | "Career" | "Personal".
- Ensure 'priority' is one of: "High" | "Medium" | "Low".
- Ensure 'urgency' is one of: "Immediate" | "Urgent" | "Normal" | "Backlog".
- Ensure 'stressLevel' is one of: "Low" | "Medium" | "High" | "Extreme".
- For 'suggestedSchedule', every item MUST include: day, block, action, and explanation. The 'explanation' field must be a short sentence explaining why this day block is scheduled, ensuring Explainable AI transparency (e.g., 'Scheduled in the evening because your energy is peak.').`;

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const response = await generateAI({ parts: [imagePart, { text: prompt }] }, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: [
          "title", "deadline", "priority", "estimatedTime", "difficulty", 
          "dependencies", "category", "urgency", "riskScore", "stressLevel",
          "probabilityOfMissing", "confidenceScore", "motivatingPhrase", 
          "goalBreakdown", "suggestedSchedule"
        ],
        properties: {
          title: { type: Type.STRING },
          deadline: { type: Type.STRING },
          priority: { type: Type.STRING },
          estimatedTime: { type: Type.NUMBER },
          difficulty: { type: Type.NUMBER },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          category: { type: Type.STRING },
          urgency: { type: Type.STRING },
          riskScore: { type: Type.NUMBER },
          stressLevel: { type: Type.STRING },
          probabilityOfMissing: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          motivatingPhrase: { type: Type.STRING },
          goalBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "hours"],
              properties: {
                name: { type: Type.STRING },
                hours: { type: Type.NUMBER }
              }
            }
          },
          suggestedSchedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["day", "block", "action", "explanation"],
              properties: {
                day: { type: Type.STRING },
                block: { type: Type.STRING },
                action: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    return res.json({
      title: "Extracted Deadline",
      deadline: "2026-06-30",
      priority: "Medium",
      estimatedTime: 4,
      difficulty: 3,
      dependencies: ["Review document"],
      category: "Personal",
      urgency: "Normal",
      riskScore: 50,
      stressLevel: "Medium",
      probabilityOfMissing: 30,
      confidenceScore: 80,
      motivatingPhrase: "Document processed. Focus on your milestones!",
      goalBreakdown: [{ name: "Review extracted data", hours: 2 }, { name: "Finalize submission", hours: 2 }],
      suggestedSchedule: [
        { day: "Today", block: "Focus Block (2h)", action: "Initial review.", explanation: "Placed in your usual evening productivity hour." }
      ]
    });
  }
});

// 7. Live AI Emergency Rescue Crash Plan Generator
app.post("/api/generate-rescue-live", async (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      title: task.title,
      minimalStrategy: `Trim non-essential tasks. For '${task.title}', focus strictly on completing the bare core modules. Avoid spending hours on detailed UI styling or advanced code refactoring. You can save up to ${Math.ceil(task.estimatedTime * 0.4)} hours by omitting optional requirements.`,
      timelineBlocks: [
        { time: "Next 45 mins", action: "Establish core skeleton logic & file schema outlines." },
        { time: "Take 10m break", action: "Rest visual fields, stand up and perform deep breathing cycles." },
        { time: "Next 90 mins", action: "Complete core functionality validations & test basic operations." },
        { time: "Final 30 mins", action: "Polishing code references and preparing final ZIP file." }
      ],
      confidenceScore: 78,
      isSimulated: true
    });
  }

  try {
    const prompt = `You are the Emergency Rescue Agent for DeadlinePilot. Help a user rescue their deadline for this high-risk task:
Task: ${JSON.stringify(task)}

Formulate a realistic, hyper-focused survival plan to submit something viable before the deadline. Strip out non-essential activities and structure a hyper-dense catch-up roadmap.
Return a valid JSON object with:
- minimalStrategy: string (a concise paragraph of triage advice: exactly what components or fluff to drop)
- timelineBlocks: array of { time: string, action: string } (chronological, immediate step-by-step actions for the next few hours)
- confidenceScore: number (0-100 survival probability score)`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["minimalStrategy", "timelineBlocks", "confidenceScore"],
        properties: {
          minimalStrategy: { type: Type.STRING },
          timelineBlocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["time", "action"],
              properties: {
                time: { type: Type.STRING },
                action: { type: Type.STRING }
              }
            }
          },
          confidenceScore: { type: Type.NUMBER }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    return res.json({
      title: task.title,
      ...parsedData
    });
  } catch (error: any) {
    console.error("Gemini Rescue Error:", error);
    return res.json({
      title: task.title,
      minimalStrategy: "Triage secondary details. Work solely on functional code modules and basic tests to meet 100% core specs.",
      timelineBlocks: [
        { time: "Next 60 mins", action: "Build primary file system and component schemas." },
        { time: "Next 60 mins", action: "Wire up server-side routing endpoints." }
      ],
      confidenceScore: 70
    });
  }
});

// 8. Swarm-based Adaptive Re-planning & Explainable AI Scheduler
app.post("/api/adaptive-replan", async (req, res) => {
  const { tasks, userProfile } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks array is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Offline Rule-based continuous replanning simulation
    const updatedTasks = tasks.map(t => {
      if (t.status === "Completed") return t;
      // Recalculate based on current energy Level
      const energyFactor = userProfile.energyLevel === "Low" ? 1.3 : userProfile.energyLevel === "High" ? 0.8 : 1.0;
      const daysUntilDeadline = Math.max(1, Math.ceil((new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const rawRisk = Math.min(99, Math.round(((t.estimatedTime * energyFactor) / (daysUntilDeadline * 4)) * 100));
      const riskScore = Math.max(10, rawRisk);
      const stressLevel = riskScore > 75 ? "Extreme" : riskScore > 50 ? "High" : riskScore > 30 ? "Medium" : "Low";

      return {
        ...t,
        riskScore,
        stressLevel,
        probabilityOfMissing: Math.max(5, Math.min(95, riskScore - 5)),
        suggestedSchedule: [
          { 
            day: "Today", 
            block: `Adaptive Sprint (${Math.ceil(t.estimatedTime * 0.4)}h)`, 
            action: `Settle core requirements & review prerequisite assets.`,
            explanation: `I've shifted your focus load to tonight because your current profile energy score is ${userProfile.energyLevel}, maximizing efficiency.`
          },
          { 
            day: "Tomorrow", 
            block: `Deep Work (${Math.ceil(t.estimatedTime * 0.6)}h)`, 
            action: `Finalize remaining components and run validation tests.`,
            explanation: `I scheduled this block to avoid your scheduled afternoon meetings, providing a 100% uninterrupted workspace.`
          }
        ]
      };
    });

    return res.json({
      tasks: updatedTasks,
      globalCoachingAssessment: `Continuous Re-planning Completed! I synchronized all ${tasks.filter(t => t.status !== "Completed").length} pending deadlines with your energy profile. Shifted focus loads to optimal energy hours and added safety buffers.`,
      isSimulated: true
    });
  }

  try {
    const prompt = `You are the Scheduler Swarm Agent for DeadlinePilot.
Analyze the user's workload, current incomplete tasks, and their energy level/mood:
Tasks: ${JSON.stringify(tasks)}
UserProfile: ${JSON.stringify(userProfile)}

Perform a dynamic, continuous re-planning operation:
1. For each pending task, adjust its riskScore (0-100), probabilityOfMissing (0-100), stressLevel ("Low" | "Medium" | "High" | "Extreme"), and suggestedSchedule.
2. In the suggestedSchedule for each task, allocate realistic hourly work blocks. Every block MUST include: day, block, action, and explanation. The 'explanation' field must provide explicit EXPLAINABLE AI reasoning explaining why that block was placed on that day (e.g., 'Placed here because you finish coding 30% faster between 7-9 PM, and your daily energy index is peak.').
3. Create a globalCoachingAssessment explaining what adjustments were made, which tasks represent the highest overload risk, and how the re-plan mitigates burnout.

Return a valid JSON object matching the schema below exactly. Ensure 'tasks' in the response contains all tasks in the same order (or updated).`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["tasks", "globalCoachingAssessment"],
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: [
                "id", "title", "deadline", "priority", "estimatedTime", "difficulty", 
                "dependencies", "category", "urgency", "riskScore", "stressLevel",
                "probabilityOfMissing", "confidenceScore", "motivatingPhrase", 
                "goalBreakdown", "suggestedSchedule", "status"
              ],
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                deadline: { type: Type.STRING },
                priority: { type: Type.STRING },
                estimatedTime: { type: Type.NUMBER },
                difficulty: { type: Type.NUMBER },
                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                category: { type: Type.STRING },
                urgency: { type: Type.STRING },
                riskScore: { type: Type.NUMBER },
                stressLevel: { type: Type.STRING },
                probabilityOfMissing: { type: Type.NUMBER },
                confidenceScore: { type: Type.NUMBER },
                motivatingPhrase: { type: Type.STRING },
                goalBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["name", "hours"],
                    properties: {
                      name: { type: Type.STRING },
                      hours: { type: Type.NUMBER }
                    }
                  }
                },
                suggestedSchedule: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["day", "block", "action", "explanation"],
                    properties: {
                      day: { type: Type.STRING },
                      block: { type: Type.STRING },
                      action: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    }
                  }
                },
                status: { type: Type.STRING }
              }
            }
          },
          globalCoachingAssessment: { type: Type.STRING }
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Adaptive Replan Error (falling back to offline engine):", error);
    const updatedTasks = tasks.map(t => {
      if (t.status === "Completed") return t;
      const energyLevel = userProfile?.energyLevel || "Medium";
      const energyFactor = energyLevel === "Low" ? 1.3 : energyLevel === "High" ? 0.8 : 1.0;
      const daysUntilDeadline = Math.max(1, Math.ceil((new Date(t.deadline || Date.now()).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const rawRisk = Math.min(99, Math.round(((t.estimatedTime * energyFactor) / (daysUntilDeadline * 4)) * 100));
      const riskScore = Math.max(10, rawRisk);
      const stressLevel = riskScore > 75 ? "Extreme" : riskScore > 50 ? "High" : riskScore > 30 ? "Medium" : "Low";

      return {
        ...t,
        riskScore,
        stressLevel,
        probabilityOfMissing: Math.max(5, Math.min(95, riskScore - 5)),
        suggestedSchedule: [
          { 
            day: "Today", 
            block: `Adaptive Sprint (${Math.ceil(t.estimatedTime * 0.4)}h)`, 
            action: `Settle core requirements & review prerequisite assets.`,
            explanation: `I've shifted your focus load to tonight because your current profile energy score is ${energyLevel}, maximizing efficiency.`
          },
          { 
            day: "Tomorrow", 
            block: `Deep Work (${Math.ceil(t.estimatedTime * 0.6)}h)`, 
            action: `Finalize remaining components and run validation tests.`,
            explanation: `I scheduled this block to avoid your scheduled afternoon meetings, providing a 100% uninterrupted workspace.`
          }
        ]
      };
    });

    return res.json({
      tasks: updatedTasks,
      globalCoachingAssessment: `Offline Re-planning Activated! I synchronized all ${tasks.filter(t => t.status !== "Completed").length} pending deadlines with your energy profile. Shifted focus loads to optimal energy hours and added safety buffers.`,
      isSimulated: true
    });
  }
});

// Robust File-Backed Database System (Zero-dependency SQLite/Firestore replacement)
import fs from "fs";

interface DBStorage {
  users: Record<string, { uid: string; email: string; displayName: string }>;
  tasks: Record<string, any[]>;
  profiles: Record<string, any>;
}

const DB_FILE = path.join(process.cwd(), "db_storage.json");

function readDB(): DBStorage {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read DB file:", e);
  }
  return { users: {}, tasks: {}, profiles: {} };
}

function writeDB(data: DBStorage) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write DB file:", e);
  }
}

// 9. Auth registration endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required." });
  }

  const db = readDB();
  const cleanEmail = email.toLowerCase().trim();

  // Check if email already registered
  const existingUser = Object.values(db.users).find((u) => u.email === cleanEmail);
  if (existingUser) {
    return res.json({ user: existingUser });
  }

  const uid = `user-${Date.now()}`;
  const newUser = { uid, email: cleanEmail, displayName: name };
  db.users[uid] = newUser;

  // Set up default initial profile for the new user
  db.profiles[uid] = {
    name,
    email: cleanEmail,
    mood: "Focused",
    energyLevel: "High",
    workloadLimit: 6,
    dailyStreak: 1,
    level: 1,
    xp: 100,
    totalFocusMins: 0,
    badges: ["Safety Pilot"]
  };

  // Seed default items for immediate productivity success
  db.tasks[uid] = [
    {
      id: `task-phys-${Date.now()}`,
      title: "Complete Physics Lab Electromagnetism report",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
    }
  ];

  writeDB(db);
  return res.json({ user: newUser });
});

// 10. Auth login endpoint
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const db = readDB();
  const cleanEmail = email.toLowerCase().trim();

  const user = Object.values(db.users).find((u) => u.email === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "No pilot account found with this email. Please sign up." });
  }

  return res.json({ user });
});

// 11. Tasks fetch & sync endpoints
app.get("/api/tasks", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const db = readDB();
  const userTasks = db.tasks[userId as string] || [];
  return res.json({ tasks: userTasks });
});

app.post("/api/tasks/sync", (req, res) => {
  const { userId, tasks } = req.body;
  if (!userId || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "userId and tasks array are required" });
  }

  const db = readDB();
  db.tasks[userId] = tasks;
  writeDB(db);

  return res.json({ success: true });
});

// 12. Profile fetch & update endpoints
app.get("/api/profile", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const db = readDB();
  const profile = db.profiles[userId as string] || {
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
  return res.json({ profile });
});

app.post("/api/profile", (req, res) => {
  const { userId, profile } = req.body;
  if (!userId || !profile) {
    return res.status(400).json({ error: "userId and profile object are required" });
  }

  const db = readDB();
  db.profiles[userId] = profile;
  writeDB(db);

  return res.json({ success: true });
});

// 13. AI Daily Briefing Endpoint
app.post("/api/daily-briefing", async (req, res) => {
  const { tasks, profile } = req.body;
  if (!tasks || !profile) {
    return res.status(400).json({ error: "Tasks and profile are required." });
  }

  const ai = getGeminiClient();
  const incomplete = tasks.filter((t: any) => t.status !== "Completed");
  
  if (!ai) {
    const text = `Good morning, Pilot ${profile.name}! Today, your energy index is at ${profile.energyLevel || "High"}. You have ${incomplete.length} pending tasks on your flight plan. Your top priority is '${incomplete[0]?.title || "Reviewing Schedule"}' which carries a risk score of ${incomplete[0]?.riskScore || 40}%. I suggest initiating a 45-minute focus sprint today to build momentum and secure a +150 XP bonus. Let's make today a 100% completion success!`;
    return res.json({ briefing: text, isSimulated: true });
  }

  try {
    const prompt = `You are the Daily Briefing Agent for DeadlinePilot. Formulate a conversational, high-energy, and strategic morning briefing.
User profile: ${JSON.stringify(profile)}
Incomplete Tasks: ${JSON.stringify(incomplete)}
Provide a brief, inspiring, and actionable Markdown summary under 140 words. Highlight the single most critical task to attack today, the energy allocation advice, and a quick motivating quote. Keep it extremely readable and natural when spoken out loud.`;

    const response = await generateAI(prompt);

    return res.json({ briefing: response.text?.trim() || "Let's conquer your goals today!" });
  } catch (error: any) {
    return res.json({ briefing: `Good morning, Pilot! Focus on your highest-risk tasks today. Let's maintain your daily streak!`, error: error.message });
  }
});

// 14. AI Workload Reduction & Burnout Rescue Endpoint
app.post("/api/reduce-workload", async (req, res) => {
  const { tasks, profile } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks are required" });
  }

  const ai = getGeminiClient();
  const pending = tasks.filter((t: any) => t.status !== "Completed");
  
  if (!ai) {
    // Offline heuristic workload reduction: post-pone low/medium priority pending tasks
    const adjustments: string[] = [];
    const updatedTasks = tasks.map((t: any) => {
      if (t.status === "Completed") return t;
      if (t.priority !== "High") {
        const d = new Date(t.deadline);
        d.setDate(d.getDate() + 2); // Shift by 2 days
        adjustments.push(`Postponed '${t.title}' deadline by 2 days (Priority: ${t.priority}) to clear focus windows.`);
        return {
          ...t,
          deadline: d.toISOString().split("T")[0],
          riskScore: Math.max(15, Math.round(t.riskScore * 0.7)),
          urgency: "Normal"
        };
      }
      return t;
    });

    return res.json({
      tasks: updatedTasks,
      adjustments,
      message: "Burnout Rescue activated! Low and Medium priority tasks have been deferred by 2 days to protect your mental focus scores.",
      isSimulated: true
    });
  }

  try {
    const prompt = `You are the Burnout Protection Agent for DeadlinePilot.
Analyze the user's workload, incomplete tasks, and their burnout risk profile:
UserProfile: ${JSON.stringify(profile)}
Pending Tasks: ${JSON.stringify(pending)}

Your job is to automatically reduce their work strain:
1. Identify non-critical (Low or Medium priority) tasks with high workload congestion.
2. Shift their 'deadline' back by 1-3 days to provide safety margins.
3. Lower their riskScore, stressLevel, and probabilityOfMissing proportionally to reflect this relief.
4. Return the complete updated tasks list.
5. Create an array of 'adjustments' describing what you shifted and why.

Return a strictly valid JSON object matching this schema:
{
  "tasks": [ updated tasks array ],
  "adjustments": [ "string explaining each specific relief shift" ],
  "message": "Global empathetic summary message explaining the cognitive relief"
}`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["tasks", "adjustments", "message"],
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "title", "deadline", "riskScore", "stressLevel"],
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                deadline: { type: Type.STRING },
                riskScore: { type: Type.NUMBER },
                stressLevel: { type: Type.STRING }
              }
            }
          },
          adjustments: { type: Type.ARRAY, items: { type: Type.STRING } },
          message: { type: Type.STRING }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    
    // Merge updates back into full tasks array
    const adjustedTasks = tasks.map((t: any) => {
      const match = data.tasks?.find((ut: any) => ut.id === t.id);
      if (match) {
        return {
          ...t,
          deadline: match.deadline,
          riskScore: match.riskScore,
          stressLevel: match.stressLevel,
          probabilityOfMissing: Math.max(10, match.riskScore - 10)
        };
      }
      return t;
    });

    return res.json({
      tasks: adjustedTasks,
      adjustments: data.adjustments || ["Deferred secondary task deadlines"],
      message: data.message || "Workload de-congested successfully.",
      isSimulated: false
    });
  } catch (error: any) {
    console.error("Burnout reduction error:", error);
    return res.json({
      tasks,
      adjustments: ["Failed to calculate dynamic cloud relief. Try again later."],
      message: "API error. Working with local static workload limits."
    });
  }
});

// 15. Semantic Voice Commands Parser
app.post("/api/voice-command", async (req, res) => {
  const { commandText } = req.body;
  if (!commandText) {
    return res.status(400).json({ error: "Command text is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Basic offline parser
    const textLower = commandText.toLowerCase();
    if (textLower.includes("add") || textLower.includes("create") || textLower.includes("schedule")) {
      const cleaned = commandText.replace(/add|create|schedule/gi, "").trim();
      return res.json({
        type: "ADD_TASK",
        taskText: cleaned,
        reply: `Extracted command: I will schedule and analyze '${cleaned}' for you!`
      });
    } else if (textLower.includes("replan") || textLower.includes("optimize") || textLower.includes("adjust")) {
      return res.json({
        type: "REPLAN",
        reply: "Extracted command: Initiating swarm adaptive replanning sequence."
      });
    } else if (textLower.includes("rescue") || textLower.includes("emergency")) {
      return res.json({
        type: "RESCUE",
        reply: "Extracted command: Triggering Emergency Rescue Control Panel."
      });
    }
    return res.json({
      type: "CHAT_COACH",
      messageText: commandText,
      reply: `Spoken query: "${commandText}". I've routed this to our AI coach.`
    });
  }

  try {
    const prompt = `Analyze this spoken command for DeadlinePilot and map it to a structured client state action:
Spoken input: "${commandText}"

Allowed action types:
1. "ADD_TASK" - User wants to add/schedule a task. Extract the raw task description in 'taskText'.
2. "REPLAN" - User wants to reschedule, replan, optimize, or adjust workload.
3. "RESCUE" - User wants help rescuing a task or has an emergency situation.
4. "CHAT_COACH" - User is asking a question or seeking general productivity advice. Extract 'messageText'.

Return a valid JSON object matching:
{
  "type": "ADD_TASK" | "REPLAN" | "RESCUE" | "CHAT_COACH",
  "taskText": "string description if ADD_TASK, otherwise null",
  "messageText": "string question if CHAT_COACH, otherwise null",
  "reply": "Empathetic, clear, and action-oriented spoken response summarizing what the AI is doing in 15 words"
}`;

    const response = await generateAI(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["type", "reply"],
        properties: {
          type: { type: Type.STRING },
          taskText: { type: Type.STRING },
          messageText: { type: Type.STRING },
          reply: { type: Type.STRING }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (error: any) {
    return res.json({
      type: "CHAT_COACH",
      messageText: commandText,
      reply: "Routed message to your strategic coach."
    });
  }
});

// Mount Vite middleware for development or serve build folder in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeadlinePilot server running on http://localhost:${PORT}`);
  });
}

startServer();
