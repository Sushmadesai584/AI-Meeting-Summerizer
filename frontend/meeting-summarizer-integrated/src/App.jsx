// ============================================================
// App.jsx — Root Component, State Machine & Theme Provider
// ============================================================
// Controls WHICH screen renders AND the global dark/light theme.
//
// STATE VARIABLES:
//   appState — "upload" | "processing" | "success" | "results"
//   isDark   — true = dark mode, false = light mode
//              Passed down to every screen as a prop so they
//              can style themselves accordingly.
// ============================================================

import { useState } from "react";
import FileUpload       from "./components/FileUpload";
import ProcessingLoader from "./components/ProcessingLoader";
import SuccessBanner    from "./components/SuccessBanner";
import Dashboard        from "./pages/Dashboard";

// ---------------------------------------------------------------------------
// parseMomText: converts the raw MOM text string from the backend into the
// structured object that MomDisplay.jsx expects.
// The backend returns plain text with numbered sections — we extract each one.
// ---------------------------------------------------------------------------
function parseMomText(raw = "", title = "Meeting Summary") {
  if (!raw || typeof raw !== "string") raw = "";
  const get = (label) => {
    try {
      const re = new RegExp(`${label}[:\\s]+([^\\n]+)`, "i");
      const m  = raw.match(re);
      return m ? m[1].trim() : "NOT AVAILABLE";
    } catch { return "NOT AVAILABLE"; }
  };

  const getList = (label) => {
    const re  = new RegExp(`${label}[^\\n]*\\n([\\s\\S]*?)(?=\\n\\d+\\.|$)`, "i");
    const m   = raw.match(re);
    if (!m) return [];
    return m[1]
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  };

  // Extract action items table rows  (task / owner / deadline)
  const actionRe = /action items[\s\S]*?\n([\s\S]*?)(?=\n\d+\.|next meeting|$)/i;
  const actionBlock = raw.match(actionRe)?.[1] || "";
  const actionItems = actionBlock
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const ownerMatch    = line.match(/responsible[^:]*:\s*([^,|]+)/i);
      const deadlineMatch = line.match(/deadline[^:]*:\s*([^,|]+)/i);
      const task = line
        .replace(/responsible[^:]*:[^,|]*/i, "")
        .replace(/deadline[^:]*:[^,|]*/i, "")
        .replace(/[|,]/g, "")
        .trim();
      return {
        task:     task || line,
        owner:    ownerMatch    ? ownerMatch[1].trim()    : "NOT AVAILABLE",
        deadline: deadlineMatch ? deadlineMatch[1].trim() : "NOT AVAILABLE",
      };
    });

  // Extract attendees from "Names of attendees" section
  const attendeeRe = /attendees[\s\S]*?\n([\s\S]*?)(?=\n\d+\.|agenda|$)/i;
  const attendeeBlock = raw.match(attendeeRe)?.[1] || "";
  const attendees = attendeeBlock
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l && l !== "NOT AVAILABLE");

  // Extract summary paragraph
  const summaryRe = /summary[^:\n]*[:\n]+([\s\S]*?)(?=\n\d+\.|rules used|$)/i;
  const summaryMatch = raw.match(summaryRe);
  const summary = summaryMatch
    ? summaryMatch[1].replace(/^[-•*]\s*/gm, "").trim()
    : "NOT AVAILABLE";

  return {
    title,
    dateTimeVenue: get("date[,\\s]*time[,\\s]*venue|date"),
    venue:         "NOT AVAILABLE",
    attendees,
    agenda:        getList("agenda"),
    summary,
    decisions:     getList("decisions taken"),
    actionItems:   actionItems.length ? actionItems : [],
    nextMeeting:   get("next meeting"),
  };
}

export default function App() {
  const [appState, setAppState] = useState("upload");
  const [momData,  setMomData]  = useState(null);
  const [jobId,    setJobId]    = useState(null);   // ← holds job_id from backend

  // isDark: Theme toggle. true = dark, false = light.
  // Starts in dark mode (matches the beautiful landing page).
  const [isDark, setIsDark] = useState(true);

  // toggleTheme: Flips between dark and light mode.
  const toggleTheme = () => setIsDark((prev) => !prev);

  // Called by FileUpload after successful POST /upload
  // Receives the job_id from the backend response
  const handleUploadComplete  = (id)   => { setJobId(id); setAppState("processing"); };

  // Called by ProcessingLoader when /status returns "done"
  // Receives the raw summary data, parses it into structured momData
  const handleProcessingDone  = (data) => {
    const structured = parseMomText(data.mom || data.transcript || "", "Project Progress & Strategy Review");
    setMomData(structured);
    setAppState("success");
  };

  const handleSuccessDone     = ()     => setAppState("results");

  return (
    // We pass `isDark` and `toggleTheme` as props to every screen.
    // This is called "prop drilling" — a clean pattern for small apps.
    <div>
      {appState === "upload"     && <FileUpload        isDark={isDark} toggleTheme={toggleTheme} onUploadComplete={handleUploadComplete} />}
      {appState === "processing" && <ProcessingLoader  isDark={isDark} jobId={jobId} onProcessingDone={handleProcessingDone} />}
      {appState === "success"    && <SuccessBanner     isDark={isDark} onDone={handleSuccessDone} />}
      {appState === "results"    && <Dashboard         isDark={isDark} toggleTheme={toggleTheme} momData={momData} jobId={jobId} />}
    </div>
  );
}
