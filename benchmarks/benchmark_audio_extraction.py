"""
ClipMind AI — Audio Extraction Payload Benchmark
==================================================
Measures the REAL file-size reduction from stripping audio out of video
files, using the exact same ffmpeg settings as ai/audio.py (mono, 16kHz, mp3).

USAGE
-----
1. Drop this file into backend/ai/benchmarks/ (create the folder).
2. Put a handful of real lecture/video files (the more varied in length and
   original format, the more representative the result) into a folder, e.g.
   backend/ai/benchmarks/test_videos/
3. Run:  python benchmark_audio_extraction.py --videos test_videos/
4. It prints a summary AND writes a timestamped markdown report to
   ../../documentation/benchmarks/audio_extraction_benchmark.md
   which you can commit to your repo as evidence.

This does NOT call any Groq API — it only measures local ffmpeg extraction,
so it costs nothing and needs no API key.
"""
import argparse
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

def extract_audio(video_path: str, output_path: str):
    """Identical settings to backend/ai/audio.py's extract_audio()."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-acodec", "libmp3lame", "-q:a", "2",
            "-ac", "1", "-ar", "16000",
            output_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def human_mb(num_bytes: int) -> float:
    return round(num_bytes / (1024 * 1024), 2)

def main():
    parser = argparse.ArgumentParser(description="Benchmark audio extraction payload reduction")
    parser.add_argument("--videos", required=True, help="Folder containing test video files")
    parser.add_argument("--out", default="../../documentation/benchmarks/audio_extraction_benchmark.md",
                         help="Where to write the markdown report")
    args = parser.parse_args()

    video_exts = (".mp4", ".mov", ".mkv", ".avi", ".webm")
    videos = sorted(
        os.path.join(args.videos, f)
        for f in os.listdir(args.videos)
        if f.lower().endswith(video_exts)
    )

    if not videos:
        print(f"No video files found in {args.videos}. Add some real videos and re-run.")
        sys.exit(1)

    results = []
    tmp_audio = "_bench_tmp_audio.mp3"

    for video_path in videos:
        video_size = os.path.getsize(video_path)
        t0 = time.time()
        try:
            extract_audio(video_path, tmp_audio)
        except subprocess.CalledProcessError as e:
            print(f"  FAILED to extract audio from {video_path}: {e}")
            continue
        elapsed = time.time() - t0
        audio_size = os.path.getsize(tmp_audio)
        os.remove(tmp_audio)

        reduction_pct = round((1 - audio_size / video_size) * 100, 1)
        results.append({
            "file": os.path.basename(video_path),
            "video_mb": human_mb(video_size),
            "audio_mb": human_mb(audio_size),
            "reduction_pct": reduction_pct,
            "extract_seconds": round(elapsed, 2),
        })
        print(f"  {os.path.basename(video_path)}: {human_mb(video_size)}MB -> "
              f"{human_mb(audio_size)}MB ({reduction_pct}% smaller)")

    if not results:
        print("No videos processed successfully. Nothing to report.")
        sys.exit(1)

    avg_reduction = round(sum(r["reduction_pct"] for r in results) / len(results), 1)
    min_reduction = min(r["reduction_pct"] for r in results)
    max_reduction = max(r["reduction_pct"] for r in results)

    # Write markdown report
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        f.write("# Audio Extraction Payload Benchmark\n\n")
        f.write(f"Generated: {datetime.now(timezone.utc).isoformat()}Z\n\n")
        f.write(f"Method: `ai/audio.py`'s exact ffmpeg settings (mono, 16kHz, mp3, libmp3lame q=2), "
                f"measured against {len(results)} local video file(s).\n\n")
        f.write("| File | Video Size (MB) | Audio Size (MB) | Reduction | Extraction Time (s) |\n")
        f.write("|---|---|---|---|---|\n")
        for r in results:
            f.write(f"| {r['file']} | {r['video_mb']} | {r['audio_mb']} | "
                     f"{r['reduction_pct']}% | {r['extract_seconds']} |\n")
        f.write(f"\n**Average reduction: {avg_reduction}%** (range: {min_reduction}%–{max_reduction}%, "
                f"n={len(results)})\n")

    print(f"\nAverage payload reduction: {avg_reduction}% across {len(results)} file(s)")
    print(f"Report written to {args.out} — commit this file as evidence.")

if __name__ == "__main__":
    main()
