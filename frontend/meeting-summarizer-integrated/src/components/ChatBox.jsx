// ============================================================
// components/ChatBox.jsx — Meeting Q&A Chat Interface
// ============================================================
// Lets the user ask follow-up questions about the meeting.
// Sends: { question, meetingContext } to the backend.
// Displays a scrollable history of user + AI messages.
//
// KEY HOOKS USED:
//   useState  — message history, input text, loading flag
//   useRef    — scroll to bottom of chat automatically
//   useEffect — triggers scroll whenever messages change
//
// PROPS:
//   momData — passed along with every question so the AI
//             always has the full meeting context
// ============================================================

import { useState, useRef, useEffect } from "react";

// ── Sub-component: a single chat bubble ─────────────────────
function ChatBubble({ msg, isDark }) {
  const isUser = msg.role === "user";
  const aiBubble = isDark
    ? "bg-slate-800 text-slate-200 border border-slate-700"
    : "bg-slate-100 text-slate-700 border border-slate-200";
  const aiAvatar = isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-1
        ${isUser ? "bg-indigo-600 text-white" : aiAvatar}`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
        ${isUser ? "bg-indigo-600 text-white rounded-tr-none" : `${aiBubble} rounded-tl-none`}`}>
        {msg.text}
      </div>
    </div>
  );
}

// ── Sub-component: animated "AI is typing" dots ─────────────
function TypingDots({ isDark }) {
  return (
    <div className="flex gap-2 items-start">
      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
        ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"}`}>
        AI
      </div>
      <div className={`rounded-2xl rounded-tl-none px-4 py-3 border
        ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full animate-bounce
              ${isDark ? "bg-slate-500" : "bg-slate-400"}`}
              style={{ animationDelay: `${i * 0.15}s` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// Suggested question shortcuts shown before first message
const SUGGESTIONS = [
  "What are the action items?",
  "What were the key decisions?",
  "Who attended the meeting?",
  "What is the earliest deadline?",
];

// ── Mock answer generator (replace with real API call) ───────
function mockAnswer(q, data) {
  const lower = q.toLowerCase();
  if (lower.includes("action") || lower.includes("task"))
    return `There are ${data?.actionItems?.length} action items: ${data?.actionItems?.map(i => i.task).join("; ")}.`;
  if (lower.includes("decision"))
    return `Key decisions: ${data?.keyDecisions?.join("; ")}.`;
  if (lower.includes("attend") || lower.includes("who"))
    return `Attendees: ${data?.attendees?.join(", ")}.`;
  if (lower.includes("deadline") || lower.includes("due") || lower.includes("when"))
    return `Earliest deadline: "${data?.actionItems?.[0]?.task}" — due ${data?.actionItems?.[0]?.due} (${data?.actionItems?.[0]?.owner}).`;
  return `Based on the summary: "${data?.summary}". Try asking about action items, decisions, or attendees.`;
}

// ── Main component ───────────────────────────────────────────
export default function ChatBox({ momData, jobId, isDark = true }) {
  // messages: array of { role: "user"|"assistant", text: string }
  const [messages,   setMessages]   = useState([
    { role: "assistant", text: "Hi! I've read the meeting summary. Ask me anything about the discussion, decisions, or action items." }
  ]);
  const [inputText,  setInputText]  = useState("");
  const [isLoading,  setIsLoading]  = useState(false);

  // scrollRef points to an invisible div at the bottom of the chat.
  // Calling scrollIntoView() on it scrolls the chat down automatically.
  const scrollRef = useRef(null);

  // Auto-scroll whenever messages or loading state changes.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const q = text.trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInputText("");
    setIsLoading(true);

    try {
      const res  = await fetch("http://localhost:5000/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, job_id: jobId }),
      });
      const data = await res.json();
      const reply = data.answer || data.error || "No response from server.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send on Enter key (Shift+Enter = newline, plain Enter = send)
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Chat Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>Ask About This Meeting</h3>
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Context-aware AI answers</p>
        </div>
      </div>

      {/* Message History (scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 chat-scroll min-h-0 mb-3">
        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} isDark={isDark} />)}
        {isLoading && <TypingDots isDark={isDark} />}
        <div ref={scrollRef}/>
      </div>

      {/* Suggestion Pills (only before first user message) */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {SUGGESTIONS.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all border
                ${isDark
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-indigo-500/50 text-slate-300"
                  : "bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-400/50 text-slate-600"}`}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 shrink-0 transition-colors border
        focus-within:border-indigo-500/50
        ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          onKeyDown={onKeyDown} disabled={isLoading}
          placeholder="Ask a question about the meeting..."
          className={`flex-1 bg-transparent text-sm outline-none disabled:opacity-50
            ${isDark ? "text-white placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}/>
        <button onClick={() => sendMessage(inputText)} disabled={!inputText.trim() || isLoading}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
            ${inputText.trim() && !isLoading
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
