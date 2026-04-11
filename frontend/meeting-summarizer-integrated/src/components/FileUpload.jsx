// ============================================================
// components/FileUpload.jsx — Upload Screen
// ============================================================
// PROPS:
//   onUploadComplete — function() called after upload starts
//   isDark           — boolean: true = dark theme
//   toggleTheme      — function() to flip dark/light
// ============================================================

import { useState, useRef } from "react";

const formatSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Animated waveform decoration
function WaveformDecor({ active = false, color = "#6366f1" }) {
  const heights = [8, 16, 24, 14, 32, 20, 12, 28, 18, 10, 26, 16, 22];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", color }}>
      {heights.map((h, i) => (
        <span key={i} className="wave-bar" style={{
          height: `${h}px`,
          animationDelay: `${i * 0.09}s`,
          animationPlayState: active ? "running" : "paused",
          opacity: active ? 1 : 0.4,
        }}/>
      ))}
    </div>
  );
}

// The same sun/moon toggle used on the Dashboard
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
        border: isDark
          ? "1px solid rgba(99,102,241,0.4)"
          : "1px solid rgba(251,191,36,0.5)",
        boxShadow: isDark
          ? "0 0 12px rgba(99,102,241,0.25)"
          : "0 0 12px rgba(251,191,36,0.3)",
      }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300"
        style={{
          transform: isDark ? "translateX(0)" : "translateX(28px)",
          background: isDark ? "#6366f1" : "#f59e0b",
          boxShadow: isDark
            ? "0 0 8px rgba(99,102,241,0.7)"
            : "0 0 8px rgba(245,158,11,0.7)",
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

export default function FileUpload({ onUploadComplete, isDark = true, toggleTheme }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);
  const [error,        setError]        = useState("");
  const [isUploading,  setIsUploading]  = useState(false);
  const fileInputRef = useRef(null);

  const validateAndSet = (file) => {
    setError("");
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      setError("Please upload an audio or video file (MP3, WAV, MP4, etc.)");
      return;
    }
    setSelectedFile(file);
  };

  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = ()  => setIsDragging(false);
  const onDrop      = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) validateAndSet(e.dataTransfer.files[0]);
  };
  const onFileChange = (e) => { if (e.target.files[0]) validateAndSet(e.target.files[0]); };

  const handleSubmit = async () => {
    if (!selectedFile) { setError("Please select a file first."); return; }
    setIsUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);                          // ← field name must be "file"
      const res = await fetch("http://localhost:5000/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed."); setIsUploading(false); return; }
      onUploadComplete(data.job_id);                                  // ← pass job_id up to App.jsx
    } catch (err) {
      setError("Could not reach server. Is Flask running?");
      setIsUploading(false);
    }
  };

  // ── Light mode colours ──────────────────────────────────────
  // In light mode we switch the orb/grid dark-bg to a clean
  // warm-white gradient, and adjust all text/border colours.
  const pageBg = isDark
    ? "#04060f"
    : "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f5f3ff 100%)";

  const headingColor   = isDark ? "#ffffff"              : "#1e1b4b";
  const subColor       = isDark ? "rgba(255,255,255,0.4)": "rgba(30,27,75,0.5)";
  const pillBg         = isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.08)";
  const pillBorder     = isDark ? "rgba(99,102,241,0.25)": "rgba(99,102,241,0.2)";
  const pillColor      = isDark ? "#a5b4fc"              : "#4f46e5";
  const cardBg         = isDark ? "rgba(255,255,255,0.03)": "rgba(255,255,255,0.85)";
  const cardBorder     = isDark ? "rgba(255,255,255,0.08)": "rgba(99,102,241,0.15)";
  const dropDefault    = isDark
    ? { background:"rgba(255,255,255,0.015)", borderColor:"rgba(255,255,255,0.1)" }
    : { background:"rgba(99,102,241,0.03)",   borderColor:"rgba(99,102,241,0.2)"  };
  const dropFilePicked = isDark
    ? { background:"rgba(52,211,153,0.05)", borderColor:"rgba(52,211,153,0.3)" }
    : { background:"rgba(52,211,153,0.06)", borderColor:"rgba(52,211,153,0.4)" };
  const dropActive     = { background:"rgba(99,102,241,0.08)", borderColor:"rgba(99,102,241,0.6)" };
  const fileNameColor  = isDark ? "#ffffff"              : "#1e1b4b";
  const fileSizeColor  = isDark ? "rgba(255,255,255,0.35)":"rgba(30,27,75,0.45)";
  const uploadIconBg   = isDark ? "rgba(255,255,255,0.04)":"rgba(99,102,241,0.07)";
  const uploadIconBord = isDark ? "rgba(255,255,255,0.08)":"rgba(99,102,241,0.15)";
  const uploadIconCol  = isDark ? "rgba(255,255,255,0.3)" :"rgba(99,102,241,0.5)";
  const dropTextCol    = isDark ? "#ffffff"              : "#3730a3";
  const dropSubCol     = isDark ? "rgba(255,255,255,0.28)":"rgba(55,48,163,0.5)";
  const btnDisabledBg  = isDark ? "rgba(255,255,255,0.04)":"rgba(99,102,241,0.06)";
  const btnDisabledCol = isDark ? "rgba(255,255,255,0.2)" :"rgba(99,102,241,0.3)";
  const featureBg      = isDark ? "rgba(255,255,255,0.02)":"rgba(255,255,255,0.7)";
  const featureBorder  = isDark ? "rgba(255,255,255,0.05)":"rgba(99,102,241,0.12)";
  const featureLabel   = isDark ? "rgba(255,255,255,0.3)" :"rgba(55,48,163,0.6)";
  const gridLine       = isDark ? "rgba(99,102,241,0.04)" :"rgba(99,102,241,0.06)";
  const waveColor      = isDark ? "rgba(99,102,241,0.5)"  :"rgba(99,102,241,0.35)";

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden transition-all duration-500"
      style={{ background: pageBg }}>

      {/* ── Dark mode: animated orbs + grain ── */}
      {isDark && (
        <>
          <div className="orb-bg grain">
            <div className="orb orb-1"/>
            <div className="orb orb-2"/>
            <div className="orb orb-3"/>
          </div>
        </>
      )}

      {/* ── Light mode: soft radial glow ── */}
      {!isDark && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}/>
      )}

      {/* Grid pattern (both modes, different opacity) */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px),
                          linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }}/>

      {/* ── Top-right toggle ── */}
      <div className="relative z-20 flex justify-end p-5 fade-up-1">
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme}/>
      </div>

      {/* ── Main content, centred ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-10">
        <div className="w-full max-w-lg">

          {/* Status badge */}
          <div className="flex justify-center mb-8 fade-up-1">
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background: pillBg, border:`1px solid ${pillBorder}`,
              color: pillColor, fontSize:11, fontWeight:500,
              padding:"4px 12px", borderRadius:999, letterSpacing:"0.04em",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399",
                display:"inline-block", boxShadow:"0 0 6px #34d399" }}/>
              AI-Powered · Real-Time Transcription
            </div>
          </div>

          {/* Hero heading */}
          <div className="text-center mb-10 fade-up-2">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl" style={{
                  background: "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
                  filter: "blur(24px)",
                }}/>
                <div className="relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5" style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
                  border: "1px solid rgba(99,102,241,0.4)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}>
                  <WaveformDecor active={true} color="#818cf8"/>
                </div>
              </div>
            </div>

            <h1 style={{
              fontSize:"3rem", fontWeight:800, letterSpacing:"-0.03em",
              fontFamily:"'Syne', sans-serif", color: headingColor,
              lineHeight:1.1, marginBottom:"0.75rem",
            }}>
              Meeting<br/>
              <span style={{
                background:"linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #67e8f9 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>
                Summarizer
              </span>
            </h1>
            <p style={{ color: subColor, fontWeight:300, fontSize:"1rem" }}>
              Upload any recording. Get instant minutes, decisions &amp; Q&amp;A.
            </p>
          </div>

          {/* Upload card */}
          <div className="rounded-3xl p-6 fade-up-3 transition-all duration-300" style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            boxShadow: isDark
              ? "0 25px 50px rgba(0,0,0,0.4)"
              : "0 8px 40px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.06)",
          }}>

            {/* Drop zone */}
            <div
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              onClick={() => fileInputRef.current.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-10 cursor-pointer
                transition-all duration-300 border-2 border-dashed
                ${isDragging ? "drop-active" : ""}`}
              style={ isDragging ? dropActive : selectedFile ? dropFilePicked : dropDefault }
            >
              <input ref={fileInputRef} type="file" accept="audio/*,video/*"
                onChange={onFileChange} className="hidden"/>

              {selectedFile ? (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
                    background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.3)"}}>
                    <svg className="w-7 h-7" style={{color:"#34d399"}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm" style={{color: fileNameColor}}>{selectedFile.name}</p>
                    <p className="text-xs mt-1" style={{color: fileSizeColor}}>
                      {formatSize(selectedFile.size)} · Click to change
                    </p>
                  </div>
                  <WaveformDecor active={true} color="#34d399"/>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
                    background: uploadIconBg, border:`1px solid ${uploadIconBord}`}}>
                    <svg className="w-6 h-6" style={{color: uploadIconCol}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm" style={{color: dropTextCol}}>Drop your recording here</p>
                    <p className="text-xs mt-1" style={{color: dropSubCol}}>
                      or click to browse · MP3 · WAV · MP4 · M4A
                    </p>
                  </div>
                  <WaveformDecor active={false} color={waveColor}/>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm rounded-xl px-4 py-2.5"
                style={{color:"#fca5a5", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)"}}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button onClick={handleSubmit} disabled={!selectedFile || isUploading}
              className="btn-shimmer mt-4 w-full py-3.5 rounded-2xl text-sm font-semibold
                transition-all duration-300 flex items-center justify-center gap-2"
              style={selectedFile && !isUploading ? {
                background:"linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                color:"#fff", fontFamily:"'Syne', sans-serif", fontWeight:600, letterSpacing:"0.01em",
                boxShadow:"0 0 40px rgba(99,102,241,0.35), 0 4px 20px rgba(0,0,0,0.2)",
              } : {
                background: btnDisabledBg, color: btnDisabledCol,
                cursor:"not-allowed", fontFamily:"'Syne', sans-serif",
              }}>
              {isUploading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Uploading...</>
                : <>Summarize Meeting &nbsp;→</>
              }
            </button>
          </div>

          {/* Feature pills row */}
          <div className="grid grid-cols-3 gap-3 mt-4 fade-up-4">
            {[
              { icon:"🎙️", label:"Transcription" },
              { icon:"📋", label:"Minutes" },
              { icon:"💬", label:"Q&A Chat" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl p-3 text-center transition-all duration-300" style={{
                background: featureBg, border:`1px solid ${featureBorder}`}}>
                <div className="text-xl mb-1">{f.icon}</div>
                <p className="text-xs transition-colors duration-300"
                  style={{color: featureLabel, fontWeight:500}}>{f.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
