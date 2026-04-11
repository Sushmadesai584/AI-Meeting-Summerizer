"""
video_to_audio.py
-----------------
Converts video files to MP3 using ffmpeg.
Wraps: convert_to_mp3 (1).ipynb
"""

import os
import subprocess


def convert_videos_to_mp3(video_dir: str = "video", audio_dir: str = "audio") -> list:
    """
    Converts all video files in video_dir to MP3 files in audio_dir.

    Args:
        video_dir: Directory containing the input video files.
        audio_dir: Directory where MP3 output files will be saved.

    Returns:
        List of output MP3 file paths.
    """
    os.makedirs(audio_dir, exist_ok=True)

    video_files = os.listdir(video_dir)
    output_paths = []

    for i in video_files:
        output_path = f"{audio_dir}/{i}.mp3"
        subprocess.run(["ffmpeg", "-i", f"{video_dir}/{i}", output_path])
        output_paths.append(output_path)

    return output_paths


def convert_single_video(video_path: str, output_path: str) -> str:
    """
    Converts a single video file to MP3.

    Args:
        video_path:  Path to the input video file.
        output_path: Path for the output MP3 file.

    Returns:
        The output_path on success.
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    subprocess.run(["ffmpeg", "-i", video_path, output_path])
    return output_path
