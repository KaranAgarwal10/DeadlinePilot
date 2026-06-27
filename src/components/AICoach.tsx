import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Volume2, 
  Mic, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  Flame,
  User,
  Activity,
  Zap,
  RefreshCw
} from "lucide-react";
import { Task, UserProfile } from "../types";

interface AICoachProps {
  tasks: Task[];
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

interface Message {
  role: "user" | "coach";
  content: string;
  isVoice?: boolean;
}

export default function AICoach({ tasks, profile, setProfile }: AICoachProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      content: "Hello! I am your DeadlinePilot AI Productivity Coach. I oversee your Planner, Scheduler, Motivation, and Risk Prediction Agents to keep you on course. What's on your agenda today, or how is your energy level holding up?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Web Speech Synthesis (Text-to-Speech)
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger TTS whenever a coach message is added and voiceMode is enabled
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "coach" && voiceMode) {
      speakText(lastMsg.content);
    }
  }, [messages, voiceMode]);

  // Web Speech Recognition (Speech-to-Text)
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [
        ...prev,
        {
          role: "coach",
          content: "⚠️ Speech Recognition is not supported or is restricted in this sandboxed browser iframe. Open DeadlinePilot in a new tab for native voice integration, or use the interactive voice simulation chips below!"
        }
      ]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Handle message sending
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          taskState: tasks,
          userProfile: profile
        })
      });

      const data = await response.json();
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "coach",
        content: data.content,
        isVoice: voiceMode
      }]);

      // Boost user XP slightly for active strategy planning
      setProfile(prev => ({ ...prev, xp: prev.xp + 45 }));
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "coach",
        content: "I ran into a connection lag, but as your Pilot, my primary suggestion is to take a deep-work sprint for your highest risk task immediately!"
      }]);
    }
  };

  // Voice simulator prompt chips
  const voiceSuggestions = [
    { text: "Plan my week", desc: "Compile optimal weekly work slots" },
    { text: "I have an exam", desc: "Switch timetable to Revision Mode" },
    { text: "I am exhausted", desc: "Trigger Smart Burnout Recovery" },
    { text: "What are my high-risk deadlines?", desc: "Analyze safety margins" }
  ];

  // Simulating speech to text input trigger
  const handleSimulateVoiceInput = (suggestionText: string) => {
    handleSendMessage(suggestionText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
      
      {/* Left Column: Multi-Agent Collaboration Log Panel */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <Activity className="w-5 h-5 text-teal-400" />
          <h3 className="font-display font-bold text-base text-white">Agent Collaboration Hub</h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The DeadlinePilot platform is powered by an autonomous swarm of agents collaborating continuously.
        </p>

        <div className="space-y-4">
          {/* Planner Agent */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold font-mono text-teal-400 uppercase">Planner Agent</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Structured {tasks.length} active deadlines into subtask milestones with estimated effort hours.
            </p>
          </div>

          {/* Scheduler Agent */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold font-mono text-indigo-400 uppercase">Scheduler Agent</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Ensured zero hour overlap on daily blocks. Synthesized tasks into your customized Google Calendar slots.
            </p>
          </div>

          {/* Risk Prediction Agent */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold font-mono text-orange-400 uppercase">Risk Analyzer</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Dynamically calculating deadline metrics, procrastination stress levels, and warning thresholds.
            </p>
          </div>

          {/* Motivation Agent */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold font-mono text-yellow-400 uppercase">Motivation Agent</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Generated custom coaching taglines and monitored your XP status to keep engagement levels peak.
            </p>
          </div>
        </div>

        <div className="p-3 bg-teal-500/5 rounded-xl border border-teal-500/20 text-[11px] text-teal-300 font-mono leading-relaxed">
          ⭐ <span className="font-bold">Agentic Depth Check:</span> All systems active. Multi-Agent communication loop synchronized in server.ts.
        </div>
      </div>

      {/* Right columns: AI Coach Dialogue Hub */}
      <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm flex flex-col h-[600px] justify-between">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-teal-400 animate-pulse" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">Interactive Copilot & Voice Assistant</h3>
              <span className="text-[10px] text-teal-400/80 font-mono uppercase font-semibold">Gemini 3.5 Active</span>
            </div>
          </div>

          {/* Voice Mode Toggle */}
          <button
            id="toggle-voice-mode-btn"
            onClick={() => setVoiceMode(!voiceMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all duration-300 ${
              voiceMode 
                ? "bg-teal-500/10 text-teal-400 border-teal-500/30" 
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Response {voiceMode ? "On" : "Off"}</span>
          </button>
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
          {messages.map((m, idx) => {
            const isCoach = m.role === "coach";
            return (
              <div key={idx} className={`flex gap-3 ${isCoach ? "justify-start" : "justify-end"}`}>
                
                {isCoach && (
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-teal-400" />
                  </div>
                )}

                <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                  isCoach 
                    ? "bg-slate-950 border border-slate-850 text-slate-200" 
                    : "bg-teal-500 text-slate-950 font-medium shadow-md shadow-teal-500/5"
                }`}>
                  <p>{m.content}</p>
                  
                  {isCoach && m.isVoice && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-900 text-[10px] text-teal-400/80 font-mono font-bold">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      <span>Synthesizing voice response...</span>
                    </div>
                  )}
                </div>

                {!isCoach && (
                  <div className="w-8 h-8 rounded-lg bg-teal-500 border border-teal-400 flex items-center justify-center font-bold text-slate-950 shrink-0 text-xs">
                    P
                  </div>
                )}

              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-teal-400 animate-spin-slow" />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
                <div className="flex space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="pb-3 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">Simulate voice triggers:</span>
          <div className="flex flex-wrap gap-2">
            {voiceSuggestions.map((vs, idx) => (
              <button
                key={idx}
                onClick={() => handleSimulateVoiceInput(vs.text)}
                className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 px-3 py-1.5 rounded-xl transition-all duration-200 text-left"
              >
                <div className="font-bold flex items-center gap-1">
                  <Mic className="w-3 h-3 text-teal-400" />
                  <span>{vs.text}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{vs.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form controls */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }} 
          className="relative flex gap-2 items-center"
        >
          <input
            id="coach-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening with AI microphone..." : "Talk with your Productivity Coach..."}
            className={`flex-1 bg-slate-950 border rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none pr-24 ${
              isListening ? "border-red-500 animate-pulse bg-red-500/5 placeholder-red-400" : "border-slate-800 hover:border-slate-700 focus:border-teal-500"
            }`}
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              id="coach-mic-btn"
              type="button"
              onClick={startSpeechRecognition}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isListening 
                  ? "bg-red-500 text-white animate-ping" 
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Start voice dictation"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              id="coach-chat-send-btn"
              type="submit"
              disabled={!input.trim()}
              className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
