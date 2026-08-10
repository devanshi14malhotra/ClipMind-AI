import os
from ai.audio import extract_audio
from ai.api_client import groq_transcribe, groq_summarize

def run_ai_pipeline(video_path: str, audio_output_path: str, generate_transcript: bool = True, generate_summary: bool = True, generate_key_moments: bool = True):
    """
    Runs the AI pipeline on a video file using Groq APIs based on requested options.
    """
    # 1. Extract Audio
    extract_audio(video_path, audio_output_path)
    
    transcript_segments = []
    full_text = ""
    summary_text = "No summary generated."
    key_moments = []
    keywords = []
    
    # 2. Transcription (Always required to get text for summary, but we might only want summary)
    transcription = groq_transcribe(audio_output_path)
    full_text = transcription.text
    
    timestamped_text = ""
    
    if hasattr(transcription, "segments") and transcription.segments:
        for segment in transcription.segments:
            start = segment["start"] if isinstance(segment, dict) else segment.start
            end = segment["end"] if isinstance(segment, dict) else segment.end
            text = segment["text"].strip() if isinstance(segment, dict) else segment.text.strip()
            
            transcript_segments.append({
                "start": start,
                "end": end,
                "text": text
            })
            
            # Format start time as MM:SS for the LLM context
            minutes = int(start // 60)
            seconds = int(start % 60)
            timestamped_text += f"[{minutes:02d}:{seconds:02d}] {text}\n"
    else:
        transcript_segments.append({"start": 0.0, "end": 0.0, "text": full_text})
        timestamped_text = full_text
            
    # 3. Summarization & Key Moments (Groq LLaMA)
    if generate_summary or generate_key_moments:
        ai_results = groq_summarize(timestamped_text)
        if generate_summary:
            summary_text = ai_results.get("summary", "No summary generated.")
        if generate_key_moments:
            key_moments = ai_results.get("key_moments", [])
        if generate_summary or generate_key_moments:
            keywords = ai_results.get("keywords", [])
    
    # Cleanup
    if os.path.exists(audio_output_path):
        os.remove(audio_output_path)
        
    return transcript_segments, full_text, summary_text, key_moments, keywords
