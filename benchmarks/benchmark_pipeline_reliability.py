"""
ClipMind AI — Pipeline Reliability Benchmark
==============================================
Runs the REAL AI pipeline (backend/ai/pipeline.py -> run_ai_pipeline) against
a folder of test videos and records success/failure per file, to produce an
honest, evidence-backed success rate.

This calls the actual Groq API (transcription + summarization), so:
  - It costs real API usage against your GROQ_API_KEYS quota.
  - It needs network access and a valid backend/.env with GROQ_API_KEYS set.
  - Include at least one video whose extracted audio exceeds 20MB (a
    ~20+ minute lecture at typical bitrate usually does it) so the chunking
    path actually gets exercised, not just the simple path.

USAGE
-----
1. Drop this file into backend/ai/benchmarks/ (same folder as the audio
   extraction benchmark).
2. Put real test videos (aim for at least one that's long enough to trigger
   chunking) into backend/ai/benchmarks/test_videos/
3. From inside backend/, with your virtualenv active and .env configured:
     python ai/benchmarks/benchmark_pipeline_reliability.py --videos ai/benchmarks/test_videos
4. It writes a timestamped markdown report to
   ../../documentation/benchmarks/pipeline_reliability_benchmark.md
   which you can commit to your repo as evidence.

Do NOT hardcode or guess a success rate — only report the number this
script actually produces from your own runs.
"""
import argparse
import os
import sys
import time
import traceback
from datetime import datetime, timezone

# Make sure we can import from backend/ when run from anywhere inside it
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ai.pipeline import run_ai_pipeline  # noqa: E402

def human_mb(num_bytes: int) -> float:
    return round(num_bytes / (1024 * 1024), 2)

def main():
    parser = argparse.ArgumentParser(description="Benchmark AI pipeline reliability on real videos")
    parser.add_argument("--videos", required=True, help="Folder containing test video files")
    parser.add_argument("--out", default="../../documentation/benchmarks/pipeline_reliability_benchmark.md",
                         help="Where to write the markdown report")
    args = parser.parse_args()

    video_exts = (".mp4", ".mov", ".mkv", ".avi", ".webm")
    videos = sorted(
        os.path.join(args.videos, f)
        for f in os.listdir(args.videos)
        if f.lower().endswith(video_exts)
    )

    if not videos:
        print(f"No video files found in {args.videos}. Add real test videos and re-run.")
        sys.exit(1)

    results = []

    for video_path in videos:
        name = os.path.basename(video_path)
        video_size_mb = human_mb(os.path.getsize(video_path))
        audio_tmp = f"_bench_{name}.mp3"
        print(f"Processing {name} ({video_size_mb} MB)...")

        t0 = time.time()
        try:
            segments, full_text, summary, short_summary, key_moments, keywords = run_ai_pipeline(
                video_path, audio_tmp,
                generate_transcript=True,
                generate_summary=True,
                generate_key_moments=True,
            )
            elapsed = round(time.time() - t0, 2)
            ok = bool(full_text.strip()) and bool(summary.strip())
            results.append({
                "file": name,
                "video_mb": video_size_mb,
                "status": "SUCCESS" if ok else "EMPTY_OUTPUT",
                "seconds": elapsed,
                "transcript_chars": len(full_text),
                "key_moments_count": len(key_moments),
                "error": "",
            })
            print(f"  -> {'SUCCESS' if ok else 'EMPTY_OUTPUT'} in {elapsed}s "
                  f"({len(full_text)} transcript chars, {len(key_moments)} key moments)")
        except Exception as e:
            elapsed = round(time.time() - t0, 2)
            results.append({
                "file": name,
                "video_mb": video_size_mb,
                "status": "FAILED",
                "seconds": elapsed,
                "transcript_chars": 0,
                "key_moments_count": 0,
                "error": f"{type(e).__name__}: {e}",
            })
            print(f"  -> FAILED after {elapsed}s: {e}")
            traceback.print_exc()
        finally:
            if os.path.exists(audio_tmp):
                os.remove(audio_tmp)

    total = len(results)
    successes = sum(1 for r in results if r["status"] == "SUCCESS")
    success_rate = round(successes / total * 100, 1) if total else 0.0

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        f.write("# Pipeline Reliability Benchmark\n\n")
        f.write(f"Generated: {datetime.now(timezone.utc).isoformat()}Z\n\n")
        f.write(f"Ran the real `run_ai_pipeline` (Groq Whisper + gpt-oss-20b) against "
                f"{total} local video file(s).\n\n")
        f.write("| File | Size (MB) | Status | Time (s) | Transcript Chars | Key Moments | Error |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for r in results:
            f.write(f"| {r['file']} | {r['video_mb']} | {r['status']} | {r['seconds']} | "
                     f"{r['transcript_chars']} | {r['key_moments_count']} | {r['error']} |\n")
        f.write(f"\n**Success rate: {success_rate}% ({successes}/{total})**\n")

    print(f"\nSuccess rate: {success_rate}% ({successes}/{total})")
    print(f"Report written to {args.out} — commit this file as evidence.")

if __name__ == "__main__":
    main()

