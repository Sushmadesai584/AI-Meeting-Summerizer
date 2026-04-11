"""
qa_engine.py
------------
Retrieves relevant transcript chunks via cosine similarity and calls Ollama
for question-answering and Minutes-of-Meeting (MOM) generation.
Wraps: LLM (1).ipynb
"""

import re
import json
import requests
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from chunk_embedder import create_embedding


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def inference(
    prompt: str,
    model: str = "llama3.2",
    ollama_url: str = "http://localhost:11434"
) -> str:
    """
    Sends a prompt to the local Ollama generate endpoint.

    Args:
        prompt:     The full prompt string.
        model:      Ollama model name to use.
        ollama_url: Base URL of the Ollama server.

    Returns:
        The model's response text.
    """
    r = requests.post(
        f"{ollama_url}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "temperature": 0.2,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "stream": False
        }
    )
    data = r.json()
    return data["response"]


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

def retrieve_chunks(
    query_embedding: list,
    chunks: list,
    chunk_embeddings: np.ndarray,
    top_k: int = 15
) -> np.ndarray:
    """
    Returns the top-k most similar chunks to the given query embedding.

    Args:
        query_embedding:  The embedding vector for the query.
        chunks:           List of chunk dicts.
        chunk_embeddings: Pre-stacked numpy array of all chunk embeddings.
        top_k:            Number of top chunks to return.

    Returns:
        Numpy array of the top-k chunk dicts.
    """
    question_vector = np.array(query_embedding).reshape(1, -1)
    similarities = cosine_similarity(chunk_embeddings, question_vector)
    top_indexes = np.argsort(similarities.flatten())[::-1][:top_k]
    chunks_array = np.array(chunks)
    return chunks_array[top_indexes]


def format_chunks_as_transcript(top_chunks: np.ndarray) -> str:
    """
    Formats retrieved chunks into the transcript block used in the prompt.

    Args:
        top_chunks: Numpy array of chunk dicts.

    Returns:
        A multi-line string with Start/End/Text per chunk.
    """
    clean_text = ""
    for chunk in top_chunks:
        clean_text += (
            f"Start: {chunk['start']} sec\n"
            f"End: {chunk['end']} sec\n"
            f"Text: {chunk['text']}\n\n"
        )
    return clean_text


# ---------------------------------------------------------------------------
# Q&A
# ---------------------------------------------------------------------------

def answer_question(
    question: str,
    chunks: list,
    chunk_embeddings: np.ndarray,
    ollama_url: str = "http://localhost:11434"
) -> str:
    """
    Answers a meeting-related question using RAG over transcript chunks.

    Args:
        question:         The user's question string.
        chunks:           List of embedded chunk dicts.
        chunk_embeddings: Pre-stacked numpy array of all chunk embeddings.
        ollama_url:       Base URL of the Ollama server.

    Returns:
        The model's answer string.
    """
    question_embed = create_embedding(question, ollama_url=ollama_url)
    top_chunks = retrieve_chunks(question_embed, chunks, chunk_embeddings)
    clean_text = format_chunks_as_transcript(top_chunks)

    prompt = f"""
You are an AI assistant specialized in meeting analysis.

Your task:
1. Read the meeting transcript.
2. Provide a detailed summary (4-5 concise lines).
3. Answer the given question.
4. Include start time and end time if available in the transcript.
5. If the question is unrelated to the meeting, respond:
   "I can only answer questions related to the provided meeting transcript."

STRICT RULES:
- Use ONLY the transcript below.
- Do NOT use external knowledge.
- Do NOT guess missing information.
- Keep response short and focused on key discussion points.

------------------------
MEETING TRANSCRIPT:
{clean_text}
------------------------

QUESTION:
{question}

FINAL RESPONSE:
"""
    return inference(prompt, ollama_url=ollama_url)


# ---------------------------------------------------------------------------
# Minutes of Meeting (MOM)
# ---------------------------------------------------------------------------

def extract_attendees(text: str) -> list:
    """
    Heuristically extracts attendee names from the full transcript text.

    Args:
        text: The full plain-text meeting transcript.

    Returns:
        Sorted list of unique candidate name strings.
    """
    words = re.findall(r'\b[A-Z][a-z]{2,}\b', text)

    stop_words = {
        "The", "This", "That", "Good", "Thank", "Thanks", "Now", "Next", "However",
        "Overall", "Excellent", "Meeting", "Project", "Team", "Department",
        "January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December",
        "Today", "Yesterday", "Tomorrow", "Yes", "No", "We", "I", "You", "He", "She",
        "Marketing", "Finance", "Technical", "Training", "Employee", "Social",
        "Additionally", "Although", "Understood", "Note", "Just", "Any", "Are",
        "Does", "What", "Over", "Cross"
    }

    names = [word for word in words if word not in stop_words]
    return sorted(list(set(names)))


def generate_mom(
    full_transcript_text: str,
    chunks: list,
    chunk_embeddings: np.ndarray,
    ollama_url: str = "http://localhost:11434",
    output_path: str = "MOM.txt"
) -> str:
    """
    Generates a structured Minutes of Meeting document and saves it to a file.

    Args:
        full_transcript_text: The complete plain-text transcript (for name extraction).
        chunks:               List of embedded chunk dicts.
        chunk_embeddings:     Pre-stacked numpy array of all chunk embeddings.
        ollama_url:           Base URL of the Ollama server.
        output_path:          Where to write the MOM text file.

    Returns:
        The generated MOM string.
    """
    # Build query embeddings for each MOM component
    MOM_Components_1 = "meeting agenda topics discussed"
    MOM_Components_2 = "decisions made conclusions agreed during the meeting"
    MOM_Components_3 = "action items tasks responsibilities deadlines recommendations plans"
    MOM_Components_4 = "overall meeting discussion summary"
    MOM_Components_5 = "names of people present in the meeting or participants"

    c1 = create_embedding(MOM_Components_1, ollama_url=ollama_url)
    c2 = create_embedding(MOM_Components_2, ollama_url=ollama_url)
    c3 = create_embedding(MOM_Components_3, ollama_url=ollama_url)
    c4 = create_embedding(MOM_Components_4, ollama_url=ollama_url)
    c5 = create_embedding(MOM_Components_5, ollama_url=ollama_url)

    top_chunks1 = retrieve_chunks(c1, chunks, chunk_embeddings, top_k=20)
    top_chunks2 = retrieve_chunks(c2, chunks, chunk_embeddings, top_k=20)
    top_chunks3 = retrieve_chunks(c3, chunks, chunk_embeddings, top_k=20)
    top_chunks4 = retrieve_chunks(c4, chunks, chunk_embeddings, top_k=20)
    top_chunks5 = retrieve_chunks(c5, chunks, chunk_embeddings, top_k=20)

    agenda_text   = " ".join([chunk["text"] for chunk in top_chunks1])
    decision_text = " ".join([chunk["text"] for chunk in top_chunks2])
    task_text     = " ".join([chunk["text"] for chunk in top_chunks3])
    summary_text  = " ".join([chunk["text"] for chunk in top_chunks4])
    name          = " ".join([chunk["text"] for chunk in top_chunks5])

    attendees = extract_attendees(full_transcript_text)

    prompt1 = f"""
You are an AI assistant specialized in meeting analysis.

Generate detailed Minutes of Meeting (MOM).

Extract the following information:

1. Date, Time, Venue
2. Names of attendees
3. Agenda
4. Decisions taken
5. Action items (task, responsible person, deadline)
6. Next meeting date
7. Meeting summary (4–5 lines)
give atleast 3-4 lines from the given below text which seems to be more approprite 
Meeting Context:

Candidate names detected:
{attendees}

Agenda Discussion:
{agenda_text}

Decision Discussion:
{decision_text}

Task Discussion:
{task_text}

General Discussion:
{summary_text}

Rules:
- Use ONLY information present in the transcript
- Do NOT invent information
- If information is missing write "NOT AVAILABLE"
- Extract multiple bullet points where possible

Return structured MOM.
"""

    result = inference(prompt1, ollama_url=ollama_url)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(result)

    return result
