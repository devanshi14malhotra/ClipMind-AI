# ClipMind AI — Tech Stack

This document outlines the tools, libraries, and frameworks used to build the ClipMind AI platform.

## 1. Programming Languages & Frameworks
- **Backend:** Python 3.11 with FastAPI (for high-performance async APIs)
- **Frontend:** TypeScript, React.js, and Next.js 14 (App Router, Standalone mode for Docker)
- **Styling:** Tailwind CSS

## 2. Databases
- **PostgreSQL:** Primary relational database for user management, roles, classrooms, and video metadata. (Hosted on Render)
- **MongoDB:** NoSQL document database used for storing large, unstructured data such as generated transcripts, summaries, and key moments. (Hosted on MongoDB Atlas)

## 3. AI & Machine Learning
*Note: To achieve the sub-second processing speeds demonstrated in our evaluation (1.02s per summarization), we utilized the Groq LPU API.*
- **Speech-to-Text:** Whisper model architecture (via Groq for speed)
- **NLP Summarization & Intelligence:** Large Language Models (LLM) for generating concise summaries, study guides, and quizzes.
- **Computer Vision / Video Processing:** FFmpeg (for extracting audio tracks from video files prior to transcription).

## 4. Video Processing & Storage
- **Local / Ephemeral Storage:** File processing and uploads use the local filesystem during AI inference.
- **Tools:** `ffmpeg-python` for parsing video duration and extracting `.mp3` audio chunks.

## 5. UI / UX Libraries
- **Framer Motion:** For fluid, spring-based animations across the Next.js frontend.
- **Recharts:** For rendering analytics data and top keywords on the dashboard.
- **Lucide React:** Iconography.

## 6. DevOps & Deployment
- **Containerization:** Docker & Docker Compose (Multi-stage builds for both frontend and backend)
- **Cloud Hosting:** Render.com (Web Services & Managed Postgres)
- **Version Control:** Git & GitHub

## 7. Testing & Evaluation
- **Testing Framework:** `pytest` for backend API and pipeline testing.
- **Evaluation:** Jupyter Notebooks (`backend/ai/evaluation.ipynb`) for testing AI model latency and summarization quality.
