"""
transcriber.py
--------------
Transcribes an audio file using OpenAI Whisper and saves the result as JSON.
Wraps: chunk_creation (1).ipynb
"""

import whisper
import json


def transcribe_audio(audio_path: str, output_path: str = "whisper_result.json") -> dict:
    """
    Transcribes an audio file using the Whisper 'small' model.

    Args:
        audio_path:  Path to the .mp3 / .wav audio file.
        output_path: Where to save the raw Whisper JSON result.

    Returns:
        The full Whisper result dict (keys: 'text', 'segments', 'language').
    """
    model = whisper.load_model("small")
    result = model.transcribe(audio=audio_path, language="en", task="transcribe")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

    return result
