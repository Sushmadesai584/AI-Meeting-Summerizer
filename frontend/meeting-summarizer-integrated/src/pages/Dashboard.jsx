// ============================================================
// pages/Dashboard.jsx — Results Page with Theme Toggle
// ============================================================
// LAYOUT ONLY — arranges MomDisplay (top) + ChatBox (bottom).
// Also renders the dark/light mode toggle in the header.
//
// PROPS:
//   momData     — meeting data from App.jsx
//   isDark      — boolean: true = dark theme
//   toggleTheme — function() to flip the theme
// ============================================================

import MomDisplay from "../components/MomDisplay";
import ChatBox    from "../components/ChatBox";

// ThemeToggle: The sun/moon switch button
function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1e1b4b, #312e81)"
          : "linear-gradient(135deg, #fef3c7, #fde68a)",
        border: isDark ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(251,191,36,0.5)",
        boxShadow: isDark ? "0 0 12px rgba(99,102,241,0.2)" : "0 0 12px rgba(251,191,36,0.3)",
      }}
    >
      {/* Sliding pill */}
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300"
        style={{
          transform: isDark ? "translateX(0)" : "translateX(28px)",
          background: isDark ? "#6366f1" : "#f59e0b",
          boxShadow: isDark ? "0 0 8px rgba(99,102,241,0.6)" : "0 0 8px rgba(245,158,11,0.6)",
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

export default function Dashboard({ momData, isDark, toggleTheme, jobId }) {
  // Shorthand: returns different values for dark vs light
  const t = (d, l) => isDark ? d : l;

  return (
    <div className="min-h-screen transition-colors duration-300"
      style={{ background: t("#04060f", "#f1f5f9") }}>

      {/* Subtle grid for dark mode; clean white for light */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}/>
      )}

      <div className="relative z-10 p-4 md:p-6 lg:p-8">

        {/* ── Header ── */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)" }}>
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/>
              </svg>
            </div>
            <span className={`font-semibold text-sm ${t("text-white", "text-slate-800")}`}
              style={{ fontFamily:"'Syne', sans-serif" }}>
              Meeting Summarizer
            </span>
          </div>

          {/* Right side: theme toggle + new meeting button */}
          <div className="flex items-center gap-3">
            {/* ── Dark/Light Mode Toggle ── */}
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/>

            {/* New Meeting button */}
            <button onClick={() => window.location.reload()}
              className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2
                ${t(
                  "text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700",
                  "text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm"
                )}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              New Meeting
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">

          {/* ══ TOP: Minutes of Meeting ══ */}
          <div className={`rounded-2xl p-6 shadow-xl transition-colors duration-300
            ${t(
              "bg-slate-900/80 border border-slate-800 backdrop-blur-sm",
              "bg-white border border-slate-200 shadow-sm"
            )}`}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"/>
              <h2 className={`font-bold ${t("text-white", "text-slate-900")}`}
                style={{ fontFamily:"'Syne', sans-serif" }}>
                Minutes of Meeting
              </h2>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full"
                style={{ background:"rgba(52,211,153,0.1)", color:"#34d399", border:"1px solid rgba(52,211,153,0.2)" }}>
                ✓ Generated
              </span>
            </div>
            {/* Pass isDark so MomDisplay can theme its own internals */}
            <MomDisplay momData={momData} isDark={isDark}/>
          </div>

          {/* ══ BOTTOM: Chat Box ══ */}
          <div className={`rounded-2xl p-6 shadow-xl transition-colors duration-300
            ${t(
              "bg-slate-900/80 border border-slate-800 backdrop-blur-sm",
              "bg-white border border-slate-200 shadow-sm"
            )}`}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-violet-500 rounded-full"/>
              <h2 className={`font-bold ${t("text-white", "text-slate-900")}`}
                style={{ fontFamily:"'Syne', sans-serif" }}>
                Ask About The Meeting
              </h2>
            </div>
            <div className="h-80 flex flex-col">
              <ChatBox momData={momData} jobId={jobId} isDark={isDark}/>
            </div>
          </div>

        </div>

        <p className={`text-center text-xs mt-8 ${t("text-slate-700", "text-slate-400")}`}>
          Meeting Summarizer · College Group Project
        </p>
      </div>
    </div>
  );
}
