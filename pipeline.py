"""
pipeline.py
-----------
Top-level orchestrator for the AI Meeting Summarizer backend.
The backend hits these functions when endpoints are called.

Pipeline order:
  1. video_to_audio   → convert uploaded video to MP3
  2. transcriber      → Whisper transcription → whisper_result.json
  3. chunk_embedder   → parse segments + embed → chunk.json
  4. qa_engine        → answer questions  /  generate MOM

Usage (from your FastAPI / Flask routes):
    from pipeline import run_full_pipeline, answer_question_endpoint, generate_mom_endpoint
"""

import numpy as np
import json

from video_to_audio import convert_single_video
from transcriber import transcribe_audio
from chunk_embedder import build_chunks, embed_chunks, save_chunks, load_chunks
from qa_engine import answer_question, generate_mom


# ---------------------------------------------------------------------------
# Full pipeline (used when a new video is uploaded)
# ---------------------------------------------------------------------------

def run_full_pipeline(
    video_path: str,
    audio_path: str = "audio/meeting.mp3",
    whisper_json_path: str = "whisper_result.json",
    chunk_json_path: str = "chunk.json",
    ollama_url: str = "http://localhost:11434"
) -> dict:
    """
    Runs the complete ingestion pipeline for a new meeting recording.

    Steps:
        1. Convert video → MP3
        2. Whisper transcription
        3. Build + embed chunks
        4. Persist chunks

    Args:
        video_path:       Path to the uploaded video file.
        audio_path:       Where to save the intermediate MP3.
        whisper_json_path: Where to save the Whisper JSON result.
        chunk_json_path:  Where to save the embedded chunks JSON.
        ollama_url:       Base URL of the Ollama server.

    Returns:
        A dict with keys: 'transcript_text', 'num_chunks', 'chunk_json_path'
    """
    # Step 1 – video → audio
    convert_single_video(video_path, audio_path)

    # Step 2 – audio → whisper result
    whisper_result = transcribe_audio(audio_path, output_path=whisper_json_path)

    # Step 3 – segments → plain chunks
    chunks = build_chunks(whisper_result)

    # Step 4 – embed chunks
    embedded_chunks = embed_chunks(chunks, ollama_url=ollama_url)

    # Step 5 – persist
    save_chunks(embedded_chunks, output_path=chunk_json_path)

    return {
        "transcript_text": whisper_result["text"],
        "num_chunks": len(embedded_chunks),
        "chunk_json_path": chunk_json_path
    }


# ---------------------------------------------------------------------------
# Question-answer endpoint helper
# ---------------------------------------------------------------------------

def answer_question_endpoint(
    question: str,
    chunk_json_path: str = "chunk.json",
    ollama_url: str = "http://localhost:11434"
) -> str:
    """
    Loads chunks from disk and returns an answer to the user's question.
    Call this from your /ask or /qa route.

    Args:
        question:       The user's question string.
        chunk_json_path: Path to the pre-built chunk JSON file.
        ollama_url:     Base URL of the Ollama server.

    Returns:
        Answer string from the LLM.
    """
    chunks = load_chunks(chunk_json_path)
    chunk_embeddings = np.vstack([c["embedding"] for c in chunks])
    return answer_question(question, chunks, chunk_embeddings, ollama_url=ollama_url)


# ---------------------------------------------------------------------------
# MOM endpoint helper
# ---------------------------------------------------------------------------

def generate_mom_endpoint(
    chunk_json_path: str = "chunk.json",
    whisper_json_path: str = "whisper_result.json",
    mom_output_path: str = "MOM.txt",
    ollama_url: str = "http://localhost:11434"
) -> str:
    """
    Loads chunks + transcript from disk and generates the Minutes of Meeting.
    Call this from your /mom or /minutes route.

    Args:
        chunk_json_path:  Path to the pre-built chunk JSON file.
        whisper_json_path: Path to the Whisper JSON (for full transcript text).
        mom_output_path:  Where to write the MOM text file.
        ollama_url:       Base URL of the Ollama server.

    Returns:
        MOM string from the LLM.
    """
    chunks = load_chunks(chunk_json_path)
    chunk_embeddings = np.vstack([c["embedding"] for c in chunks])

    with open(whisper_json_path, "r", encoding="utf-8") as f:
        whisper_result = json.load(f)
    full_text = whisper_result["text"]

    return generate_mom(
        full_text, chunks, chunk_embeddings,
        ollama_url=ollama_url,
        output_path=mom_output_path
    )
