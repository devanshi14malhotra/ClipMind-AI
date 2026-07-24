import os
from ai.audio import extract_audio
from ai.api_client import groq_transcribe, groq_summarize

def run_ai_pipeline(video_path: str, audio_output_path: str, generate_transcript: bool = True, generate_summary: bool = True):
    """
    Runs the AI pipeline on a video file using Groq APIs based on requested options.
    """
    # 1. Extract Audio
    extract_audio(video_path, audio_output_path)
    
    transcript_segments = []
    full_text = ""
    summary_text = "No summary generated."
    key_moments = []
    
    # 2. Transcription (Always required to get text for summary, but we might only want summary)
    transcription = groq_transcribe(audio_output_path)
    full_text = transcription.text
    
    if generate_transcript:
        if hasattr(transcription, "segments") and transcription.segments:
            for segment in transcription.segments:
                transcript_segments.append({
                    "start": segment["start"] if isinstance(segment, dict) else segment.start,
                    "end": segment["end"] if isinstance(segment, dict) else segment.end,
                    "text": segment["text"].strip() if isinstance(segment, dict) else segment.text.strip()
                })
        else:
            transcript_segments.append({"start": 0.0, "end": 0.0, "text": full_text})
            
    # 3. Summarization (Groq LLaMA)
    if generate_summary:
        ai_results = groq_summarize(full_text)
        summary_text = ai_results.get("summary", "No summary generated.")
        key_moments = ai_results.get("key_moments", [])
    
    # Cleanup
    if os.path.exists(audio_output_path):
        os.remove(audio_output_path)
        
    return transcript_segments, full_text, summary_text, key_moments
