"""
chunk_embedder.py
-----------------
Parses Whisper JSON segments into chunks and generates embeddings via Ollama.
Wraps: Untitled (3).ipynb
"""

import json
import time
import requests


def create_embedding(text: str, model: str = "bge-m3", ollama_url: str = "http://localhost:11434") -> list:
    """
    Calls the local Ollama embed endpoint and returns the embedding vector.

    Args:
        text:       The text to embed.
        model:      Ollama model name to use for embedding.
        ollama_url: Base URL of the Ollama server.

    Returns:
        A list of floats representing the embedding.
    """
    r = requests.post(
        f"{ollama_url}/api/embed",
        json={
            "model": model,
            "input": text
        }
    )
    r.raise_for_status()
    data = r.json()
    return data["embeddings"][0]


def build_chunks(whisper_result: dict) -> list:
    """
    Extracts id, start, end, text from each Whisper segment.

    Args:
        whisper_result: The dict returned by Whisper (must have 'segments' key).

    Returns:
        A list of dicts with keys: id, start, end, text.
    """
    segments = whisper_result["segments"]
    l = []
    for i in segments:
        l.append({
            "id": i["id"],
            "start": i["start"],
            "end": i["end"],
            "text": i["text"]
        })
    return l


def embed_chunks(
    chunks: list,
    model: str = "bge-m3",
    ollama_url: str = "http://localhost:11434",
    sleep: float = 0.2
) -> list:
    """
    Adds an 'embedding' field to every chunk by calling Ollama.

    Args:
        chunks:     List of chunk dicts (output of build_chunks).
        model:      Ollama model name to use for embedding.
        ollama_url: Base URL of the Ollama server.
        sleep:      Seconds to wait between requests (rate-limit guard).

    Returns:
        The same list of chunks, each now containing an 'embedding' key.
    """
    embedded = []
    for item in chunks:
        text = item["text"].strip()
        embedding = create_embedding(text, model=model, ollama_url=ollama_url)
        chunk = {
            "id": item["id"],
            "start": item["start"],
            "end": item["end"],
            "text": text,
            "embedding": embedding
        }
        embedded.append(chunk)
        time.sleep(sleep)
    return embedded


def save_chunks(chunks: list, output_path: str = "chunk.json") -> None:
    """
    Persists embedded chunks to a JSON file.

    Args:
        chunks:      List of embedded chunk dicts.
        output_path: Destination file path.
    """
    with open(output_path, "w") as f:
        json.dump(chunks, f, indent=4)


def load_chunks(chunk_path: str = "chunk.json") -> list:
    """
    Loads embedded chunks from a previously saved JSON file.

    Args:
        chunk_path: Path to the chunk JSON file.

    Returns:
        List of chunk dicts with embeddings.
    """
    with open(chunk_path, "r") as f:
        return json.load(f)
#hackathon