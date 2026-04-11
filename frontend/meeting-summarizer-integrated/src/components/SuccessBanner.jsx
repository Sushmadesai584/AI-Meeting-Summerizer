// ============================================================
// components/SuccessBanner.jsx — "Completed!" Flash Screen
// ============================================================
// Shows for 2.5 seconds, then calls onDone() to move forward.
// PROPS: onDone, isDark
// ============================================================
import { useEffect } from "react";

export default function SuccessBanner({ onDone, isDark = true }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: isDark ? "#04060f" : "#f8fafc" }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full
          bg-emerald-500/20 border-2 border-emerald-500/50 mb-6 animate-bounce">
          <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}
          style={{ fontFamily: "'Syne', sans-serif" }}>
          Processing Complete!
        </h2>
        <p className={`mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Loading your meeting summary...
        </p>
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
