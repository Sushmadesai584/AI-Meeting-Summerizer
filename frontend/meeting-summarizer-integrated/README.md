# 🎙️ Meeting Summarizer — Frontend

React + Tailwind CSS. No complex UI libraries. Clean, modular, viva-ready.

---

## ✅ Setup (Run these commands EXACTLY, in order)

```bash
# Step 1 — go into the project folder
cd meeting-summarizer

# Step 2 — install all dependencies (this creates node_modules/)
npm install

# Step 3 — start the dev server
npm run dev
```

Then open your browser at → **http://localhost:5173**

---

## 📁 Folder Structure

```
meeting-summarizer/
├── index.html                        ← HTML shell; React mounts here
├── package.json                      ← Project dependencies & scripts
├── vite.config.js                    ← Build tool config
├── tailwind.config.js                ← Tailwind CSS config
├── postcss.config.js                 ← Required by Tailwind
│
└── src/
    ├── main.jsx                      ← Entry point; renders <App/>
    ├── App.jsx                       ← State machine; controls screens
    ├── index.css                     ← Tailwind + global styles
    │
    ├── components/
    │   ├── FileUpload.jsx            ← Screen 1: drag-and-drop uploader
    │   ├── ProcessingLoader.jsx      ← Screen 2: animated loader + polling
    │   ├── SuccessBanner.jsx         ← Screen 3: 2.5s "Done!" flash
    │   ├── MomDisplay.jsx            ← Results: formatted meeting minutes
    │   └── ChatBox.jsx               ← Results: Q&A chat interface
    │
    └── pages/
        └── Dashboard.jsx             ← Results page: MomDisplay + ChatBox
```

---

## 🔄 App State Machine (explain this in your viva!)

`App.jsx` has ONE state variable — `appState` — that controls everything:

```
"upload" ──► "processing" ──► "success" ──► "results"
```

| State        | Component Shown    | Moves to next when...              |
|--------------|--------------------|------------------------------------|
| `upload`     | FileUpload         | File is uploaded                   |
| `processing` | ProcessingLoader   | Backend polling returns "done"     |
| `success`    | SuccessBanner      | 2.5 second timer ends              |
| `results`    | Dashboard          | Stays here (final screen)          |

---

## ⚡ Polling Pattern (the key backend integration concept)

```
❌ BAD (causes timeout):
   fetch("/api/process-meeting") → wait 3 minutes → crash

✅ GOOD (polling — what we built):
   fetch("/api/upload")          → get jobId immediately
   every 5 seconds:
     fetch("/api/status?jobId=X") → { status: "processing" }
     fetch("/api/status?jobId=X") → { status: "processing" }
     fetch("/api/status?jobId=X") → { status: "done", result: {...} }
   → show results!
```

---

## 🔌 Where to Connect Your Backend

Search for the comment `── PRODUCTION` in each file:

| File                   | What to change                           |
|------------------------|------------------------------------------|
| `FileUpload.jsx`       | Uncomment real POST to `/api/upload`     |
| `ProcessingLoader.jsx` | Uncomment real GET to `/api/status`      |
| `ChatBox.jsx`          | Uncomment real POST to `/api/chat`       |

### Expected API shape:

```
POST /api/upload          → { jobId: "abc-123" }
GET  /api/status?jobId=X  → { status: "processing" | "done", result?: {...} }
POST /api/chat            → { answer: "string" }
  body: { question: "...", meetingContext: { ...momData } }
```
