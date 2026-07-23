import ffmpeg
import os

def extract_audio(video_path: str, output_path: str):
    """
    Extracts a lightweight mp3 audio track from a video file.
    """
    try:
        (
            ffmpeg
            .input(video_path)
            .output(output_path, acodec="libmp3lame", q="2", ac=1, ar=16000)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        raise
