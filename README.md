# 🎙️ AI Meeting Summarizer

An end-to-end AI pipeline that takes a meeting video recording and produces:
- A full transcript (via OpenAI Whisper)
- Answers to natural language questions about the meeting (via RAG + Ollama)
- Structured Minutes of Meeting / MOM document (via Ollama)

---

## 🏗️ Project Structure

```
.
├── video_to_audio.py     # Step 1 — Convert video files to MP3 using ffmpeg
├── transcriber.py        # Step 2 — Transcribe MP3 to text using Whisper
├── chunk_embedder.py     # Step 3 — Segment transcript and generate embeddings via Ollama
├── qa_engine.py          # Step 4 — RAG-based Q&A and MOM generation via Ollama LLM
├── pipeline.py           # Orchestrator — ties all steps together, import this in your routes
├── requirements.txt      # Python dependencies
│
├── video/                # Place input video files here
├── audio/                # MP3 files are saved here (auto-created)
├── whisper_result.json   # Whisper output (auto-generated)
├── chunk.json            # Embedded transcript chunks (auto-generated)
├── MOM.txt               # Generated Minutes of Meeting (auto-generated)
└── prompt.txt            # Last used LLM prompt (auto-generated)
```

---

## ⚙️ Prerequisites

### 1. System Dependencies

**ffmpeg** — required for video-to-audio conversion.

```bash
# Ubuntu / Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html and add to PATH
```

**Ollama** — required for embeddings and LLM inference. Download from [https://ollama.com](https://ollama.com).

After installing Ollama, pull the required models:

```bash
ollama pull bge-m3       # embedding model
ollama pull llama3.2     # LLM for Q&A and MOM
```

Make sure Ollama is running before starting the backend:

```bash
ollama serve
```

---

### 2. Python Dependencies

Python **3.9+** is recommended.

```bash
pip install -r requirements.txt
```

> **Note:** Whisper is installed directly from GitHub as shown in `requirements.txt`. This matches how it was used in the original notebooks.

---

## 🚀 Usage

### Option A — Full Pipeline (new video upload)

```python
from pipeline import run_full_pipeline

result = run_full_pipeline(
    video_path="video/meeting.mp4",
    audio_path="audio/meeting.mp3",
    whisper_json_path="whisper_result.json",
    chunk_json_path="chunk.json",
    ollama_url="http://localhost:11434"
)

print(result["transcript_text"])
print(f"Chunks created: {result['num_chunks']}")
```

### Option B — Ask a Question

```python
from pipeline import answer_question_endpoint

answer = answer_question_endpoint(
    question="What is the project deadline?",
    chunk_json_path="chunk.json"
)
print(answer)
```

### Option C — Generate Minutes of Meeting

```python
from pipeline import generate_mom_endpoint

mom = generate_mom_endpoint(
    chunk_json_path="chunk.json",
    whisper_json_path="whisper_result.json",
    mom_output_path="MOM.txt"
)
print(mom)
```

---

## 🔌 Flask Backend

The project ships with a ready-to-run Flask backend (`app.py`).

### Start the server

```bash
python app.py
```

Server starts on `http://0.0.0.0:5000`.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Health check + Ollama connectivity |
| `POST` | `/upload` | Upload a meeting video, starts pipeline |
| `GET`  | `/status/<job_id>` | Poll pipeline job status |
| `POST` | `/ask` | Ask a question about the meeting |
| `GET`  | `/transcript` | Get full transcript text |
| `GET`  | `/mom` | Generate Minutes of Meeting |

### Example cURL calls

```bash
# 1. Upload a video
curl -X POST http://localhost:5000/upload \
  -F "file=@/path/to/meeting.mp4"
# returns: { "job_id": "abc-123", "message": "Processing started..." }

# 2. Poll until status is "done"
curl http://localhost:5000/status/abc-123

# 3. Ask a question
curl -X POST http://localhost:5000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the project deadline?"}'

# 4. Get the full transcript
curl http://localhost:5000/transcript

# 5. Generate Minutes of Meeting
curl http://localhost:5000/mom
```

All `/ask`, `/transcript`, and `/mom` endpoints automatically use the most recently processed meeting. To target a specific job, pass `"job_id"` in the request body (for `/ask`) or as a query param `?job_id=abc-123` (for `/transcript` and `/mom`).

---

## 🔄 Pipeline Flow

```
Video File
    │
    ▼
video_to_audio.py  ──► MP3 File
    │
    ▼
transcriber.py  ──► whisper_result.json  (full transcript + segments)
    │
    ▼
chunk_embedder.py  ──► chunk.json  (segments + bge-m3 embeddings)
    │
    ├──► qa_engine.answer_question()   ──► Q&A response
    │         (cosine similarity retrieval + llama3.2)
    │
    └──► qa_engine.generate_mom()      ──► MOM.txt
              (multi-query retrieval + llama3.2)
```

---

## 🛠️ Configuration

All functions accept an `ollama_url` parameter (default: `http://localhost:11434`). If Ollama is running on a different host or port, pass it explicitly:

```python
answer_question_endpoint(question="...", ollama_url="http://192.168.1.10:11434")
```

To swap Ollama models, change the `model` parameter in `chunk_embedder.create_embedding()` and `qa_engine.inference()`.

---

## ⚠️ Important Notes

- **Run `run_full_pipeline` as a background task** in production. Whisper transcription and chunk embedding are slow — they will time out a synchronous HTTP request.
- Whisper runs on **CPU by default**. For faster transcription, a CUDA-capable GPU is recommended. Whisper will use it automatically if available.
- The pipeline is **stateless between requests** — `chunk.json` and `whisper_result.json` are read from disk on every Q&A or MOM call. For multi-meeting support, use separate file paths per session/meeting ID.

---

## 📦 Key Dependencies

| Library | Purpose |
|---|---|
| `openai-whisper` | Speech-to-text transcription |
| `torch` | Required by Whisper |
| `requests` | Ollama API calls (embed + generate) |
| `numpy` | Vector math for cosine similarity |
| `scikit-learn` | `cosine_similarity` for chunk retrieval |
| `nltk` | Tokenization utilities |
| `ffmpeg` (system) | Video to audio conversion |
| `ollama` (system) | Local LLM + embedding server |
