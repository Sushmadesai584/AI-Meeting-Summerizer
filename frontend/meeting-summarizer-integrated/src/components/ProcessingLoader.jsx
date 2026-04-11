// ============================================================
// components/ProcessingLoader.jsx — Processing Screen
// ============================================================
// PROBLEM SOLVED: AI processing takes 1–3 minutes. A frozen
// screen looks like a crash. This component:
//   • Cycles through friendly status messages (useEffect #1)
//   • Animates a progress bar smoothly (useEffect #2)
//   • Polls the backend every 5s for completion (useEffect #3)
//
// WHY POLLING INSTEAD OF ONE LONG REQUEST?
//   A single fetch() that waits 3 minutes gets killed by:
//   - Browser timeout  - Nginx proxy (60s limit)
//   - AWS Lambda (30s limit)
//   Polling = many fast requests → no timeout risk.
//
// PROPS:
//   onProcessingDone — function(data) called with result data
// ============================================================

import { useState, useEffect, useRef } from "react";

// Status messages shown one-by-one to keep the user engaged.
// `duration` = how long each message stays visible (ms).
const STATUS_STEPS = [
  { message: "Uploading file to server...",      duration: 4000  },
  { message: "Transcribing audio with AI...",    duration: 20000 },
  { message: "Analysing speaker segments...",    duration: 15000 },
  { message: "Identifying key decisions...",     duration: 15000 },
  { message: "Generating meeting summary...",    duration: 20000 },
  { message: "Formatting minutes of meeting...", duration: 15000 },
  { message: "Almost there, finalising...",      duration: 999999 },
];

// ── MOCK_RESULT: mirrors the EXACT structure your ML model returns ──
// Field names match what MomDisplay.jsx expects.
// Replace this whole object with your real backend response.
//
// Your ML model returns 6 sections (images shared by user):
//   1. dateTimeVenue  — "NOT AVAILABLE" if missing
//   2. attendees[]    — empty array if missing
//   3. agenda[]       — list of agenda items
//   4. summary        — AI-generated (your model does produce this)
//   5. decisions[]    — decisions taken in the meeting
//   6. actionItems[]  — { task, owner, deadline } — owner/deadline may be "NOT AVAILABLE"
//   7. nextMeeting    — "NOT AVAILABLE" if missing
const MOCK_RESULT = {
  title:         "Project Progress & Strategy Review",
  dateTimeVenue: "NOT AVAILABLE",
  venue:         "NOT AVAILABLE",
  attendees:     [],   // Your model returned NOT AVAILABLE — empty array shows the badge
  agenda: [
    "Review project progress",
    "Analyse department performance",
    "Review financial status",
    "Discuss action plan for HR",
    "Plan strategy for the next quarter",
    "Focus on customer feedback analysis",
    "Improve conversion strategies",
    "Discuss deadline and task completion",
  ],
  summary:
    "The meeting covered a comprehensive review of ongoing project progress and departmental performance. Key discussions focused on financial status, HR workload management, and conversion strategy improvements. The team aligned on a deadline of 20th January for final phase completion and agreed on weekly sync meetings to improve coordination.",
  decisions: [
    "HR will organise training and workload management",
    "Technical team will focus on final testing",
    "Marketing will improve conversion strategies",
    "Finance will monitor expenses",
    "Introduce weekly team sync meetings and improve documentation practices",
    "Ensure proper work-life balance",
    "Deadline: 20th January for final phase completion",
  ],
  actionItems: [
    { task: "Organise training and workload management",           owner: "HR",             deadline: "NOT AVAILABLE" },
    { task: "Final testing",                                       owner: "Technical Team", deadline: "NOT AVAILABLE" },
    { task: "Improve conversion strategies",                       owner: "Marketing",      deadline: "NOT AVAILABLE" },
    { task: "Monitor expenses",                                    owner: "Finance",        deadline: "NOT AVAILABLE" },
    { task: "Improve documentation and ensure work-life balance",  owner: "Team",           deadline: "NOT AVAILABLE" },
    { task: "Complete assigned milestones",                        owner: "NOT AVAILABLE",  deadline: "20th January"  },
  ],
  nextMeeting: "NOT AVAILABLE",
};

export default function ProcessingLoader({ onProcessingDone, jobId, isDark = true }) {
  const [currentStep, setCurrentStep] = useState(0);  // Which STATUS_STEPS message to show
  const [progress,    setProgress]    = useState(0);   // Progress bar 0–100
  const [pollCount,   setPollCount]   = useState(0);   // How many times we've polled
  const [isDone,      setIsDone]      = useState(false);
  const timerRef = useRef(null);

  // ── EFFECT 1: Cycle status messages ────────────────────────
  // Sets a timer to advance to the next message after `duration` ms.
  // The cleanup `return () => clearTimeout(...)` stops the timer
  // if this component is removed from the screen (prevents memory leaks).
  useEffect(() => {
    if (isDone || currentStep >= STATUS_STEPS.length - 1) return;
    timerRef.current = setTimeout(
      () => setCurrentStep((s) => s + 1),
      STATUS_STEPS[currentStep].duration
    );
    return () => clearTimeout(timerRef.current);
  }, [currentStep, isDone]);

  // ── EFFECT 2: Animate progress bar ─────────────────────────
  // Increments progress every second. Caps at 90% intentionally —
  // the final 10% only fills when the backend actually confirms done.
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 90 / 90));
    }, 1000);
    return () => clearInterval(id);
  }, [isDone]);

  // ── EFFECT 3: Poll backend every 5 seconds ─────────────────
  // Calls GET /api/status/<jobId> until status === "done",
  // then fetches the full summary from GET /api/summary/<jobId>.
  useEffect(() => {
    if (!jobId) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/status/${jobId}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(id);
          // Fetch the full summary (MOM + transcript)
          const sumRes = await fetch(`http://localhost:5000/summary/${jobId}`);
          const sumData = await sumRes.json();
          setIsDone(true);
          setProgress(100);
          setTimeout(() => onProcessingDone(sumData), 700);
        }
        if (data.status === "failed") {
          clearInterval(id);
          console.error("Pipeline failed:", data.error);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [jobId, onProcessingDone]);

  const bg   = isDark ? "#04060f" : "#f8fafc";
  const card = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const h2   = isDark ? "text-white" : "text-slate-900";
  const sub  = isDark ? "text-slate-400" : "text-slate-500";
  const pct  = isDark ? "text-slate-500" : "text-slate-400";
  const bar  = isDark ? "bg-slate-800" : "bg-slate-200";
  const msg  = isDark ? "text-slate-300" : "text-slate-600";
  const dot  = isDark ? "bg-slate-700" : "bg-slate-300";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bg }}>
      <div className="w-full max-w-md text-center">

        {/* Spinner */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"/>
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
        </div>

        <h2 className={`text-2xl font-bold mb-2 ${h2}`} style={{ fontFamily:"'Syne', sans-serif" }}>
          Processing Your Meeting
        </h2>
        <p className={`text-sm mb-8 ${sub}`}>This usually takes 1–3 minutes. Keep this tab open.</p>

        {/* Progress Bar */}
        <div className={`rounded-full h-2 mb-2 overflow-hidden ${bar}`}>
          <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}/>
        </div>
        <div className={`flex justify-between text-xs mb-8 ${pct}`}>
          <span>0%</span><span>{Math.round(progress)}%</span><span>100%</span>
        </div>

        {/* Current Status Message */}
        <div className={`rounded-xl px-6 py-4 mb-6 border ${card}`}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"/>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"/>
            </span>
            <p className={`text-sm font-medium ${msg}`}>{STATUS_STEPS[currentStep]?.message}</p>
          </div>
        </div>

        {/* Step Dot Indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {STATUS_STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300
              ${i === currentStep ? "w-4 h-1.5 bg-indigo-500" :
                i < currentStep   ? "w-1.5 h-1.5 bg-indigo-500/40" :
                                    `w-1.5 h-1.5 ${dot}`}`}/>
          ))}
        </div>
      </div>
    </div>
  );
}
