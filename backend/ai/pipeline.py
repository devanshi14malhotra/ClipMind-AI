import os
import subprocess
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
    short_summary_text = ""
    key_moments = []
    keywords = []
    
    # 2. Transcription
    file_size = os.path.getsize(audio_output_path)
    chunk_files = []
    
    # Groq API has a 25MB limit. Splitting if > 20MB.
    if file_size > 20 * 1024 * 1024:
        chunk_pattern = audio_output_path.replace(".mp3", "_chunk_%03d.mp3")
        # Split into 15-minute segments (900 seconds)
        subprocess.run([
            "ffmpeg", "-y", "-i", audio_output_path, 
            "-f", "segment", "-segment_time", "900", 
            "-c", "copy", chunk_pattern
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        base_dir = os.path.dirname(audio_output_path)
        base_name = os.path.basename(audio_output_path).replace(".mp3", "_chunk_")
        chunk_files = sorted([os.path.join(base_dir, f) for f in os.listdir(base_dir) if f.startswith(base_name) and f.endswith(".mp3")])
    else:
        chunk_files = [audio_output_path]
        
    timestamped_text = ""
    
    for i, chunk_path in enumerate(chunk_files):
        # ffmpeg segment_time uses approximate slicing, but assuming exactly 900s for offset is usually close enough for LLM timestamps.
        chunk_offset = i * 900.0 if len(chunk_files) > 1 else 0.0
        
        transcription = groq_transcribe(chunk_path)
        chunk_text = transcription.text
        full_text += chunk_text + " "
        
        if hasattr(transcription, "segments") and transcription.segments:
            for segment in transcription.segments:
                start = segment["start"] if isinstance(segment, dict) else segment.start
                end = segment["end"] if isinstance(segment, dict) else segment.end
                text = segment["text"].strip() if isinstance(segment, dict) else segment.text.strip()
                
                # Add offset
                start += chunk_offset
                end += chunk_offset
                
                transcript_segments.append({
                    "start": start,
                    "end": end,
                    "text": text
                })
                
                minutes = int(start // 60)
                seconds = int(start % 60)
                timestamped_text += f"[{minutes:02d}:{seconds:02d}] {text}\n"
        else:
            transcript_segments.append({"start": chunk_offset, "end": chunk_offset, "text": chunk_text})
            timestamped_text += f"[{int(chunk_offset//60):02d}:{int(chunk_offset%60):02d}] {chunk_text}\n"

    full_text = full_text.strip()
            
    # 3. Summarization & Key Moments (Groq LLaMA)
    if generate_summary or generate_key_moments:
        ai_results = groq_summarize(timestamped_text)
        if generate_summary:
            summary_text = ai_results.get("summary", "No summary generated.")
            short_summary_text = ai_results.get("short_summary", "")
        if generate_key_moments:
            key_moments = ai_results.get("key_moments", [])
        if generate_summary or generate_key_moments:
            keywords = ai_results.get("keywords", [])
    
    # Cleanup
    if os.path.exists(audio_output_path):
        os.remove(audio_output_path)
    for cf in chunk_files:
        if cf != audio_output_path and os.path.exists(cf):
            os.remove(cf)
        
    return transcript_segments, full_text, summary_text, short_summary_text, key_moments, keywords
