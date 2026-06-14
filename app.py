"""
app.py
------
Flask backend for the AI Meeting Summarizer.

Full user workflow:
    1. POST /upload          → User drops an MP4, pipeline runs in background
    2. GET  /status/<job_id> → Frontend polls until status = "done"
    3. GET  /summary/<job_id>→ Returns MOM + transcript once done (auto-generated)
    4. GET  /download/<job_id>→ User downloads the MOM as a .txt file
    5. POST /ask             → User chats, asks questions about the meeting
    6. GET  /health          → Health check + Ollama connectivity
"""

import os
import uuid
import json
import threading
import traceback

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from pipeline import run_full_pipeline, answer_question_endpoint, generate_mom_endpoint


# ---------------------------------------------------------------------------
# App & folder setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # Allow frontend (React/HTML) to call this API from any origin

UPLOAD_FOLDER      = "uploads"
AUDIO_FOLDER       = "audio"
MOM_FOLDER         = "mom_outputs"
ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "mp3", "wav"}

for folder in [UPLOAD_FOLDER, AUDIO_FOLDER, MOM_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# In-memory job store
# { job_id: { "status": queued|processing|done|failed, "result": {...}, "error": "..." } }
jobs = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def run_pipeline_task(job_id: str, video_path: str) -> None:
    """
    Runs in a background thread.
    Steps:
        1. Full pipeline  (video → audio → whisper → chunks → embeddings)
        2. Auto-generates MOM right after pipeline completes
    Both results are stored in the job store so /status and /summary can serve them.
    """
    jobs[job_id]["status"] = "processing"
    try:
        # ── Step 1: run the full ingestion pipeline ──────────────────────────
        result = run_full_pipeline(
            video_path=video_path,
            audio_path=os.path.join(AUDIO_FOLDER, f"{job_id}.mp3"),
            whisper_json_path=f"whisper_result_{job_id}.json",
            chunk_json_path=f"chunk_{job_id}.json",
        )

        # ── Step 2: auto-generate MOM so it's ready when user lands on results ─
        mom_path = os.path.join(MOM_FOLDER, f"MOM_{job_id}.txt")
        mom_text = generate_mom_endpoint(
            chunk_json_path=f"chunk_{job_id}.json",
            whisper_json_path=f"whisper_result_{job_id}.json",
            mom_output_path=mom_path,
        )

        jobs[job_id]["status"]   = "done"
        jobs[job_id]["result"]   = result
        jobs[job_id]["mom"]      = mom_text
        jobs[job_id]["mom_path"] = mom_path

        # Track the latest completed job (convenience for single-meeting UIs)
        app.config["LATEST_JOB_ID"] = job_id

    except Exception:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"]  = traceback.format_exc()


def get_job_or_latest(job_id_param: str | None) -> tuple[dict | None, str | None]:
    """
    Returns (job_dict, job_id) for the given job_id or the latest completed job.
    Returns (None, None) if nothing is found.
    """
    job_id = job_id_param or app.config.get("LATEST_JOB_ID")
    if not job_id:
        return None, None
    return jobs.get(job_id), job_id


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    """
    Health check. Also pings Ollama to confirm it's running.

    Response 200:
        { "status": "ok", "ollama": "reachable" | "unreachable" }
    """
    import requests as req
    ollama_status = "reachable"
    ollama_detail = None
    try:
        r = req.get("http://localhost:11434", timeout=3)
        if r.status_code != 200:
            ollama_status = "unreachable"
            ollama_detail = f"HTTP {r.status_code}"
    except Exception as e:
        ollama_status = "unreachable"
        ollama_detail = str(e)

    body = {"status": "ok", "ollama": ollama_status}
    if ollama_detail:
        body["detail"] = ollama_detail
    return jsonify(body), 200


# ── 1. UPLOAD ────────────────────────────────────────────────────────────────

@app.route("/upload", methods=["POST"])
def upload():
    """
    User drops an MP4 (or other video) file.
    Saves it to disk and immediately starts the pipeline in a background thread.

    Request:
        multipart/form-data   field name: "file"

    Response 202:
        { "job_id": "<uuid>", "message": "Processing started..." }

    Response 400:
        { "error": "..." }
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Send a multipart/form-data field named 'file'."}), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({"error": "Filename is empty."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"File type not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        }), 400

    job_id     = str(uuid.uuid4())
    ext        = file.filename.rsplit(".", 1)[1].lower()
    video_path = os.path.join(UPLOAD_FOLDER, f"{job_id}.{ext}")
    file.save(video_path)

    jobs[job_id] = {
        "status":   "queued",
        "result":   None,
        "mom":      None,
        "mom_path": None,
        "error":    None,
    }

    thread = threading.Thread(
        target=run_pipeline_task,
        args=(job_id, video_path),
        daemon=True
    )
    thread.start()

    return jsonify({
        "job_id":  job_id,
        "message": "Processing started. Poll GET /status/<job_id> until status is 'done'."
    }), 202


# ── 2. STATUS (frontend polls this) ─────────────────────────────────────────

@app.route("/status/<job_id>", methods=["GET"])
def status(job_id: str):
    """
    Frontend polls this endpoint after upload until it gets status = "done".

    Response 200 — still running:
        { "job_id": "...", "status": "queued" | "processing" }

    Response 200 — finished:
        { "job_id": "...", "status": "done" }

    Response 200 — failed:
        { "job_id": "...", "status": "failed", "error": "..." }

    Response 404:
        { "error": "Job not found" }
    """
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    body = {"job_id": job_id, "status": job["status"]}

    if job["status"] == "failed":
        body["error"] = job["error"]

    return jsonify(body), 200


# ── 3. SUMMARY (shown on results screen after pipeline completes) ────────────

@app.route("/summary/<job_id>", methods=["GET"])
def summary(job_id: str):
    """
    Returns the full MOM text + full transcript for the results screen.
    Call this once /status returns "done".

    Response 200:
        {
            "job_id":     "...",
            "mom":        "## Minutes of Meeting ...",
            "transcript": "Good morning everyone ...",
            "num_chunks": 44
        }

    Response 202 — still processing:
        { "job_id": "...", "status": "processing", "message": "Still processing..." }

    Response 404 / 500:
        { "error": "..." }
    """
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    if job["status"] in ("queued", "processing"):
        return jsonify({
            "job_id":  job_id,
            "status":  job["status"],
            "message": "Meeting is still being processed. Try again shortly."
        }), 202

    if job["status"] == "failed":
        return jsonify({"error": "Pipeline failed.", "detail": job["error"]}), 500

    # Load transcript from whisper json
    try:
        with open(f"whisper_result_{job_id}.json", "r", encoding="utf-8") as f:
            whisper_data = json.load(f)
        transcript_text = whisper_data["text"]
    except Exception as e:
        transcript_text = f"[Could not load transcript: {e}]"

    return jsonify({
        "job_id":     job_id,
        "mom":        job["mom"],
        "transcript": transcript_text,
        "num_chunks": job["result"]["num_chunks"],
    }), 200


# ── 4. DOWNLOAD MOM ──────────────────────────────────────────────────────────

@app.route("/download/<job_id>", methods=["GET"])
def download(job_id: str):
    """
    User clicks "Download MOM" — returns the MOM as a .txt file attachment.

    Response 200:
        File download: MOM_<job_id>.txt

    Response 404 / 422:
        { "error": "..." }
    """
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    if job["status"] != "done":
        return jsonify({"error": f"Job is not done yet (status: {job['status']})."}), 422

    mom_path = job.get("mom_path")
    if not mom_path or not os.path.exists(mom_path):
        return jsonify({"error": "MOM file not found on disk."}), 500

    return send_file(
        mom_path,
        mimetype="text/plain",
        as_attachment=True,
        download_name=f"MOM_{job_id}.txt"
    )


# ── 5. CHAT / ASK ────────────────────────────────────────────────────────────

@app.route("/ask", methods=["POST"])
def ask():
    """
    User types a question in the chat UI about the meeting.
    Uses RAG (cosine similarity over embedded chunks) to find relevant
    transcript sections and answers using the local LLM.

    Request JSON:
        { "question": "What was the project deadline?" }

        Optionally target a specific meeting:
        { "question": "...", "job_id": "<uuid>" }

    Response 200:
        { "question": "...", "answer": "..." }

    Response 400 / 422 / 404 / 500:
        { "error": "..." }
    """
    body     = request.get_json(silent=True) or {}
    question = body.get("question", "").strip()

    if not question:
        return jsonify({"error": "Missing or empty 'question' field."}), 400

    # Resolve which job to use
    job_id = body.get("job_id") or app.config.get("LATEST_JOB_ID")
    if not job_id:
        return jsonify({"error": "No processed meeting found. Please upload a video first."}), 422

    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Job '{job_id}' not found."}), 404

    if job["status"] != "done":
        return jsonify({"error": f"Meeting is still being processed (status: {job['status']})."}), 422

    try:
        answer = answer_question_endpoint(
            question=question,
            chunk_json_path=f"chunk_{job_id}.json"
        )
        return jsonify({"question": question, "answer": answer}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
#hackathon