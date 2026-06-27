import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Bot, 
  Sliders, 
  HelpCircle, 
  BookOpen, 
  DollarSign, 
  Briefcase, 
  User, 
  Activity,
  ChevronDown,
  ChevronUp,
  Flame,
  FileText,
  Sparkles,
  Info
} from "lucide-react";
import { Task, SubTask, DaySchedule, UserProfile } from "../types";

interface TaskPilotProps {
  tasks: Task[];
  profile: UserProfile;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  hasApiKey: boolean;
}

export default function TaskPilot({ tasks, profile, onAddTask, onUpdateTask, onDeleteTask, hasApiKey }: TaskPilotProps) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Custom manual task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File Upload State (for syllabus / bill screenshot)
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Simulation state
  const [isSimulatingWhatIf, setIsSimulatingWhatIf] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState<any | null>(null);
  const [postponeDays, setPostponeDays] = useState(1);

  // Negotiation state
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState<any | null>(null);
  const [negotiationReason, setNegotiationReason] = useState("");

  const categories = ["All", "Study", "Work", "Health", "Bills", "Career", "Personal"];

  // Handle task analysis via API or fallback
  const handleAnalyzeTask = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: textToAnalyze,
          userContext: { 
            timestamp: new Date().toISOString(),
            profile: {
              name: profile.name,
              energyLevel: profile.energyLevel,
              mood: profile.mood,
              sleepHours: profile.sleepHours,
              workloadLimit: profile.workloadLimit,
              totalFocusMins: profile.totalFocusMins,
              dailyStreak: profile.dailyStreak,
              memory: profile.memory || {
                preferredWorkHours: "7 PM to 9 PM",
                focusPatterns: "Evenings are most productive",
                habitHistory: ["Completed math exercises", "Completed chemistry reading"],
                completedTasksCount: tasks.filter(t => t.status === "Completed").length,
                skippedTasksCount: 0,
                studyPreferences: "Enjoys deep focus with Lo-Fi ambient sounds",
                energyLevels: {},
                mostProductiveTime: "19:00 - 21:00",
                longTermGoals: ["Learn Advanced Physics", "Finish Software Engineering Bootcamp"]
              }
            }
          }
        })
      });
      const parsed = await response.json();
      
      const newId = `task-${Date.now()}`;
      const builtTask: Task = {
        id: newId,
        title: parsed.title || "Analyze Task",
        deadline: parsed.deadline || new Date().toISOString().split("T")[0],
        priority: parsed.priority || "Medium",
        estimatedTime: parsed.estimatedTime || 5,
        actualTimeSpent: 0,
        difficulty: parsed.difficulty || 3,
        dependencies: parsed.dependencies || [],
        category: parsed.category || "Study",
        urgency: parsed.urgency || "Normal",
        riskScore: parsed.riskScore || 50,
        stressLevel: parsed.stressLevel || "Medium",
        probabilityOfMissing: parsed.probabilityOfMissing || 40,
        confidenceScore: parsed.confidenceScore || 80,
        motivatingPhrase: parsed.motivatingPhrase || "Let's accomplish this!",
        goalBreakdown: (parsed.goalBreakdown || []).map((b: any) => ({ ...b, completed: false })),
        suggestedSchedule: parsed.suggestedSchedule || [],
        status: "Pending",
        agentAssessments: parsed.agentAssessments
      };

      onAddTask(builtTask);
      setInputText("");
      setShowAddForm(false);
      setSelectedTask(builtTask);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Real upload parser triggering live Gemini Vision OCR Task capture
  const handleFileUploadReal = async (file: File) => {
    setUploadedFile(file.name);
    setIsAnalyzing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const response = await fetch("/api/analyze-vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data,
              mimeType: file.type || "image/png",
              filename: file.name
            })
          });
          const parsed = await response.json();
          
          const newId = `task-${Date.now()}`;
          const builtTask: Task = {
            id: newId,
            title: parsed.title || "Extracted Task",
            deadline: parsed.deadline || new Date().toISOString().split("T")[0],
            priority: parsed.priority || "Medium",
            estimatedTime: parsed.estimatedTime || 5,
            actualTimeSpent: 0,
            difficulty: parsed.difficulty || 3,
            dependencies: parsed.dependencies || [],
            category: parsed.category || "Study",
            urgency: parsed.urgency || "Normal",
            riskScore: parsed.riskScore || 50,
            stressLevel: parsed.stressLevel || "Medium",
            probabilityOfMissing: parsed.probabilityOfMissing || 40,
            confidenceScore: parsed.confidenceScore || 80,
            motivatingPhrase: parsed.motivatingPhrase || "Let's accomplish this!",
            goalBreakdown: (parsed.goalBreakdown || []).map((b: any) => ({ ...b, completed: false })),
            suggestedSchedule: parsed.suggestedSchedule || [],
            status: "Pending"
          };

          onAddTask(builtTask);
          setSelectedTask(builtTask);
          setShowAddForm(false);
          setInputText("");
        } catch (error) {
          console.error("Failed to parse vision result:", error);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("File Reader Error:", e);
      setIsAnalyzing(false);
    }
  };

  const handleFileUploadSimulated = (fileName: string) => {
    setUploadedFile(fileName);
    let samplePrompt = "";
    if (fileName.toLowerCase().includes("syllabus") || fileName.toLowerCase().includes("pdf")) {
      samplePrompt = "AI Syllabus Extraction: Complete Chemistry Lab Report & Project due in 4 days. Difficulty: Hard.";
    } else if (fileName.toLowerCase().includes("bill") || fileName.toLowerCase().includes("jpg")) {
      samplePrompt = "Electricity Utility Bill Payment due on Tuesday. Amount: $142. Priority: High.";
    } else {
      samplePrompt = `Extracted Task from ${fileName}: Review milestones and schedule deep work by next Wednesday.`;
    }
    handleAnalyzeTask(samplePrompt);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUploadReal(e.dataTransfer.files[0]);
    }
  };

  // Procrastination What-If Simulator
  const handleSimulateWhatIf = async () => {
    if (!selectedTask) return;
    setIsSimulatingWhatIf(true);
    try {
      const response = await fetch("/api/simulate-whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: selectedTask, postponeDays })
      });
      const data = await response.json();
      setSimulatedResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingWhatIf(false);
    }
  };

  // Negotiation Draft Assistant
  const handleNegotiateExtension = async () => {
    if (!selectedTask) return;
    setIsNegotiating(true);
    try {
      const response = await fetch("/api/negotiate-extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: selectedTask, reason: negotiationReason })
      });
      const data = await response.json();
      setNegotiationResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsNegotiating(false);
    }
  };

  // Subtask completed toggle
  const toggleSubtask = (task: Task, index: number) => {
    const updatedSub = [...task.goalBreakdown];
    updatedSub[index].completed = !updatedSub[index].completed;
    
    // Recalculate status and risk
    const completedCount = updatedSub.filter(s => s.completed).length;
    const progressPercent = Math.round((completedCount / updatedSub.length) * 100);
    const newRisk = Math.max(10, Math.min(98, task.riskScore - (progressPercent * 0.3)));

    const updatedTask: Task = {
      ...task,
      goalBreakdown: updatedSub,
      riskScore: Math.round(newRisk)
    };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  // Duplication operation
  const handleDuplicateTask = (task: Task) => {
    const newId = `task-dup-${Date.now()}`;
    const dup: Task = {
      ...task,
      id: newId,
      title: `${task.title} (Copy)`,
      status: "Pending",
      riskScore: Math.round(task.riskScore * 0.9),
      isRecurring: task.isRecurring || false,
      recurringInterval: task.recurringInterval || "None"
    };
    onAddTask(dup);
    setSelectedTask(dup);
  };

  // Toggle recurring status
  const toggleRecurring = (task: Task, interval: "Daily" | "Weekly" | "Monthly" | "None") => {
    const updatedTask: Task = {
      ...task,
      isRecurring: interval !== "None",
      recurringInterval: interval
    };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  // Comment management
  const [commentInput, setCommentInput] = useState("");
  const handleAddComment = (task: Task) => {
    if (!commentInput.trim()) return;
    const cleanComments = task.comments || [];
    const newComment = {
      id: `comment-${Date.now()}`,
      author: "Karan",
      text: commentInput,
      date: new Date().toLocaleDateString()
    };
    const updatedTask: Task = {
      ...task,
      comments: [...cleanComments, newComment]
    };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
    setCommentInput("");
  };

  // Attachment management
  const [attachmentName, setAttachmentName] = useState("");
  const handleAddAttachment = (task: Task) => {
    if (!attachmentName.trim()) return;
    const cleanAttachments = task.attachments || [];
    const updatedTask: Task = {
      ...task,
      attachments: [...cleanAttachments, attachmentName]
    };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
    setAttachmentName("");
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesCategory = filterCategory === "All" || t.category === filterCategory;
    const matchesPriority = filterPriority === "All" || t.priority === filterPriority;
    return matchesCategory && matchesPriority;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
      
      {/* Left Columns: Task Catalog */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Filter controls & Add Task */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider pl-1">Filters:</span>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium px-3 py-1.5 focus:outline-none focus:border-teal-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium px-3 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            id="add-task-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs tracking-wide transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            <span>Capture New Deadline</span>
          </button>
        </div>

        {/* Task Capture Modal/Panel */}
        {showAddForm && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-lg space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-sm text-teal-400 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span>AI Automated Extraction & Effort Calibration</span>
              </h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wide">Enter Syllabus, Instructions, Email text, or Prompt:</label>
                <textarea
                  id="task-capture-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g. History essay due by Tuesday midnight, syllabus suggests referencing 4 sources. Estimated 6 pages."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Drag & Drop OCR Simulation Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-picker-input")?.click()}
                className={`p-6 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer hover:bg-slate-900/40 relative group ${
                  dragOver ? "border-teal-400 bg-teal-500/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                }`}
              >
                <input 
                  type="file" 
                  id="file-picker-input" 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUploadReal(e.target.files[0]);
                    }
                  }}
                />
                <FileText className="w-8 h-8 mx-auto text-slate-500 mb-2 group-hover:text-teal-400 transition-colors animate-pulse" />
                <span className="text-xs text-slate-300 block font-medium group-hover:text-teal-300 transition-colors">
                  Drag syllabus PDF, screenshot, or click to upload
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Processes live Gemini Vision optical extraction and calendar allocation
                </span>
                
                <div className="flex justify-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleFileUploadSimulated("Syllabus_Physics_202.pdf")}
                    className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg"
                  >
                    📄 Sample Syllabus PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFileUploadSimulated("Utility_Bill_Invoice.png")}
                    className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg"
                  >
                    🖼️ Sample Bill PNG
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  id="cancel-capture-btn"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  id="submit-capture-btn"
                  onClick={() => handleAnalyzeTask(inputText)}
                  disabled={isAnalyzing || !inputText.trim()}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-40 flex items-center gap-1"
                >
                  {isAnalyzing ? "Calibrating..." : "Calibrate Timeline"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Cards list */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/10 rounded-3xl border border-slate-800/80">
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <span className="text-slate-400 font-medium block">No matching deadlines found.</span>
            <span className="text-slate-500 text-xs mt-1 block">Switch your filters or tap "Capture New Deadline" to begin.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((t) => {
              const isSelected = selectedTask?.id === t.id;
              const daysLeft = Math.ceil((new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setSimulatedResult(null);
                    setNegotiationResult(null);
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? "border-teal-500 bg-slate-900/60 shadow-lg shadow-teal-500/5" 
                      : "border-slate-800 bg-slate-900/20 hover:border-slate-700/80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold font-mono tracking-wider px-2 py-0.5 rounded uppercase bg-slate-950 border border-slate-800 text-teal-400">
                          {t.category}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          t.priority === "High" ? "bg-red-500/15 text-red-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {t.priority} Priority
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-white leading-snug">{t.title}</h4>
                      
                      {/* Coach quick tip */}
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        "{t.motivatingPhrase}"
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 justify-between shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Deadline Risk</span>
                        <span className={`text-base font-bold font-mono ${
                          t.riskScore > 65 ? "text-red-400" : t.riskScore > 40 ? "text-amber-400" : "text-teal-400"
                        }`}>
                          {t.riskScore}% {t.riskScore > 65 ? "Danger" : "Stable"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800/80 rounded-lg px-2 py-1 text-xs text-slate-400 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{daysLeft <= 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subtask micro status bar */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">Milestones: {t.goalBreakdown.filter(g => g.completed).length}/{t.goalBreakdown.length} done</span>
                    <span className="font-mono">Workload: {t.estimatedTime} Hours</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: AI Interactive Playbook (Details, Simulation, Negotiation) */}
      <div className="space-y-6">
        {selectedTask ? (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
              <span className="text-xs font-bold font-mono uppercase text-teal-400 flex items-center gap-2">
                <span>AI Task Intelligence</span>
                {selectedTask.isRecurring && (
                  <span className="bg-teal-500/10 text-teal-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase">
                    🔄 {selectedTask.recurringInterval}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="duplicate-task-btn"
                  onClick={() => handleDuplicateTask(selectedTask)}
                  className="text-slate-400 hover:text-teal-400 transition-all text-[10px] font-mono font-bold flex items-center gap-1 border border-slate-850 bg-slate-950 hover:bg-slate-900 px-2 py-1 rounded-lg"
                  title="Duplicate Task"
                >
                  Duplicate
                </button>
                <select
                  value={selectedTask.recurringInterval || "None"}
                  onChange={(e) => toggleRecurring(selectedTask, e.target.value as any)}
                  className="bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-800 rounded-lg text-[10px] font-mono p-1 focus:outline-none cursor-pointer"
                >
                  <option value="None">Single Run</option>
                  <option value="Daily">Daily Run</option>
                  <option value="Weekly">Weekly Run</option>
                  <option value="Monthly">Monthly Run</option>
                </select>
                <button 
                  id="delete-task-btn"
                  onClick={() => {
                    onDeleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="text-slate-500 hover:text-red-450 transition-colors p-1"
                  title="Delete this task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task core stats */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-white">{selectedTask.title}</h3>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <div>
                  <span>Urgency: </span>
                  <span className="text-slate-200 font-bold">{selectedTask.urgency}</span>
                </div>
                <div>
                  <span>Stress level: </span>
                  <span className={`font-bold ${
                    selectedTask.stressLevel === "Extreme" ? "text-red-400 animate-pulse" : selectedTask.stressLevel === "High" ? "text-orange-400" : "text-teal-400"
                  }`}>{selectedTask.stressLevel}</span>
                </div>
              </div>
            </div>

            {/* Coach Voice Motivation Card */}
            <div className="p-4 bg-teal-500/5 rounded-xl border border-teal-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wide">
                <Bot className="w-4 h-4" />
                <span>Coach Strategy Recommendation</span>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "{selectedTask.motivatingPhrase}"
              </p>
            </div>

            {/* Milestone Breakdown / Progress Tracker */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold font-mono uppercase text-slate-400">Chronological Milestones</span>
                <span className="text-xs text-slate-500 font-mono">Tap to tick</span>
              </div>
              <div className="space-y-2.5">
                {selectedTask.goalBreakdown.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => toggleSubtask(selectedTask, idx)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      item.completed 
                        ? "bg-teal-500/5 border-teal-500/20 text-slate-500" 
                        : "bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        item.completed ? "border-teal-500 bg-teal-500 text-slate-950" : "border-slate-700 bg-transparent"
                      }`}>
                        {item.completed && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-xs font-medium leading-tight">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono shrink-0 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">{item.hours} hrs</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggested Study Roadmap */}
            <div className="space-y-3">
              <span className="text-xs font-bold font-mono uppercase text-slate-400">Scheduled Hourly Blocks</span>
              <div className="space-y-2">
                {selectedTask.suggestedSchedule.map((sch, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col gap-2 text-xs">
                    <div className="flex gap-3">
                      <span className="font-bold text-teal-400 font-mono uppercase shrink-0 min-w-[50px]">{sch.day}</span>
                      <div>
                        <span className="text-slate-200 font-bold block mb-0.5">{sch.block}</span>
                        <span className="text-slate-400 leading-snug block">{sch.action}</span>
                      </div>
                    </div>
                    {sch.explanation && (
                      <div className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 px-2.5 py-1.5 rounded border border-indigo-500/10 mt-1">
                        🎯 <span className="font-bold text-indigo-300">AI Logic:</span> {sch.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* What-If Procrastination Simulator Dashboard */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase text-orange-400 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Procrastination Simulation</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">What-If Simulator</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                What if you defer starting this task? recrudesces risk levels and displays the future schedule congestion impact.
              </p>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Postpone by:</label>
                <select
                  value={postponeDays}
                  onChange={(e) => setPostponeDays(Number(e.target.value))}
                  className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono p-1 focus:outline-none focus:border-orange-500"
                >
                  <option value={1}>1 Day</option>
                  <option value={2}>2 Days</option>
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days</option>
                </select>
                <button
                  id="simulate-what-if-btn"
                  onClick={handleSimulateWhatIf}
                  disabled={isSimulatingWhatIf}
                  className="ml-auto px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-bold transition-all duration-200"
                >
                  {isSimulatingWhatIf ? "Running..." : "Simulate Postpone"}
                </button>
              </div>

              {simulatedResult && (
                <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-lg space-y-2 animate-fadeIn text-xs">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Risk Margin Shift:</span>
                    <span className="text-orange-400 font-bold">{simulatedResult.originalRisk}% → {simulatedResult.simulatedRisk}%</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Stress Overload:</span>
                    <span className="text-red-400 font-bold">{simulatedResult.originalStress} → {simulatedResult.simulatedStress}</span>
                  </div>
                  <p className="text-slate-300 italic text-[11px] leading-relaxed border-t border-slate-800/80 pt-1.5">
                    "{simulatedResult.warningMessage}"
                  </p>
                  <p className="text-[10px] text-teal-400 leading-relaxed font-medium bg-teal-500/5 p-2 rounded border border-teal-500/10 mt-1">
                    🛡️ <span className="font-bold">Recovery Plan:</span> {simulatedResult.mitigationPlan}
                  </p>
                </div>
              )}
            </div>

            {/* AI Extension Negotiation Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-4">
              <span className="text-xs font-bold font-mono uppercase text-indigo-400 block">
                📧 AI Negotiation Assistant
              </span>
              <p className="text-[11px] text-slate-400 leading-normal">
                Facing a severe schedule bottleneck? Our AI negotiator will draft a professional timeline extension proposal.
              </p>
              
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={negotiationReason}
                  onChange={(e) => setNegotiationReason(e.target.value)}
                  placeholder="e.g., unexpected illness, urgent work launch..."
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                />
                <button
                  id="negotiate-draft-btn"
                  onClick={handleNegotiateExtension}
                  disabled={isNegotiating || !negotiationReason.trim()}
                  className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold transition-all duration-200"
                >
                  {isNegotiating ? "Negotiating..." : "Draft Extension Proposal"}
                </button>
              </div>

              {negotiationResult && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="relative">
                    <textarea
                      readOnly
                      value={negotiationResult.emailDraft}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono focus:outline-none"
                    />
                    <button 
                      onClick={() => navigator.clipboard.writeText(negotiationResult.emailDraft)}
                      className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] text-indigo-400 font-bold hover:bg-slate-700"
                    >
                      Copy Draft
                    </button>
                  </div>
                  <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[10px] text-indigo-300 leading-relaxed font-mono">
                    💡 <span className="font-bold">Tactical Advice:</span> {negotiationResult.strategyAdvice}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold font-mono uppercase text-teal-400 block">
                📎 Task Attachments ({selectedTask.attachments?.length || 0})
              </span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Attach syllabus documents, lecture notes, or project specifications.
              </p>
              
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div className="space-y-1.5">
                  {selectedTask.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-850 text-xs text-slate-300">
                      <span>📄</span>
                      <span className="truncate flex-1 font-mono text-[11px]">{file}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. syllabus.pdf, lecture_slides.ppt"
                  className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                />
                <button
                  onClick={() => handleAddAttachment(selectedTask)}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold"
                >
                  Attach
                </button>
              </div>
            </div>

            {/* Comments & Activity Log Section */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-4">
              <span className="text-xs font-bold font-mono uppercase text-indigo-400 block">
                💬 Comments & Progress Logs ({selectedTask.comments?.length || 0})
              </span>
              
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {selectedTask.comments.map((comment) => (
                    <div key={comment.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span className="font-bold text-teal-400">{comment.author}</span>
                        <span>{comment.date}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-normal">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Log your progress or add notes..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                />
                <button
                  onClick={() => handleAddComment(selectedTask)}
                  disabled={!commentInput.trim()}
                  className="w-full py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  Post Log Entry
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/10">
            <Info className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h4 className="font-display font-semibold text-sm text-slate-300">No Task Selected</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Tap any deadline on the left side to engage simulation metrics, study roadmaps, or AI negotiator utilities.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
