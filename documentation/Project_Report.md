# Project Report: ClipMind AI
### Video Summarization & Key Moments Detection Platform

**Prepared By:** Devanshi Malhotra  
**Role:** AI & Full-Stack Engineering Intern  
**Date:** August 2026  

---

## Abstract
With the exponential growth of video content in educational and professional spheres, extracting actionable insights from long-form video has become increasingly difficult. **ClipMind AI** is an intelligent video summarization platform designed to automatically transcribe, summarize, and extract key moments from videos. Leveraging state-of-the-art NLP models (Whisper, LLaMA 3 via Groq) and a robust Next.js/FastAPI full-stack architecture, the platform serves diverse users—including Educators, Learners, Content Creators, and Administrators—with tailored dashboards, automated study materials, and deep analytics.

---

## 1. Introduction
### 1.1 Problem Statement
The digital learning landscape relies heavily on long-form video content. However, users frequently struggle to find specific information within a one-hour lecture or meeting, leading to wasted time. Furthermore, educators lack automated tools to generate supplementary study materials from their video lessons.

### 1.2 Proposed Solution
ClipMind AI solves this by introducing a highly automated, AI-driven pipeline that ingests videos, processes the audio natively, and outputs accurate transcripts, tiered summaries, and interactive timestamps.

---

## 2. Objectives & Scope
1. **Intelligent Video Processing:** Seamlessly extract audio from local `.mp4` uploads and YouTube URLs using `yt-dlp` and `FFmpeg`.
2. **AI Integration:** Utilize Groq's high-speed inference API for Speech-to-Text (Whisper) and Text-to-Text summarization (LLaMA).
3. **Role-Based Access Control (RBAC):** Deliver distinct capabilities for four primary user profiles.
4. **Cloud Scalability:** Containerize the solution utilizing Docker for scalable cloud deployments.

---

## 3. Architecture & Tech Stack

*(Insert Figure 1: System Architecture Diagram here from `extra/imgs/`)*

### 3.1 Frontend (Client-Side)
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Features:** Responsive Design, Real-time status polling, Interactive video players, Recharts for Data Visualization.

### 3.2 Backend (Server-Side)
- **Framework:** FastAPI (Python)
- **Concurrency:** `asyncio` and `BackgroundTasks` to ensure non-blocking AI execution.
- **Dependencies:** `yt-dlp` for YouTube integration, `ffmpeg-python` for native audio extraction.

### 3.3 Database Layer (Dual-Database Approach)
- **PostgreSQL (Relational):** Handles structured data—Users, Roles, Classrooms, and Video Metadata.
- **MongoDB (NoSQL):** Handles unstructured, heavy JSON payloads—Transcripts, Summaries, Study Guides, and Key Moments.

---

## 4. Key Features & Modules

### 4.1 Role-Based Access Control
- **Administrator:** Complete platform moderation, user management, and system-wide analytics.
- **Educator:** Classroom management, automated generation of study guides and quizzes from lecture videos.
- **Learner:** Video watch history tracking, interactive study guides, and bookmarking.
- **Content Creator:** Personal video library management and trending keyword analysis.

### 4.2 AI Generation Pipeline
1. **Audio Extraction:** Video is stripped down to lightweight MP3 using FFmpeg.
2. **Transcription:** Sent to Whisper-Large-V3 for highly accurate speech-to-text with precise timestamps.
3. **Summarization:** Sent to LLaMA-3 (via Groq) to generate a brief TL;DR, a comprehensive summary, and specific key moments.

### 4.3 Interactive Key Moments
The frontend video player dynamically links to the AI-generated timestamps, allowing users to click a "Key Moment" (e.g., `[03:45]`) and instantly jump to that exact segment of the video.

---

## 5. Milestone-Wise Execution

*(Insert Figure 2: UI Screenshots from `extra/milestone2_images/`)*

- **Milestone 1 (Core Setup):** Designed the PostgreSQL/MongoDB split architecture, initialized the Next.js and FastAPI environments, and implemented secure JWT-based RBAC.
- **Milestone 2 (AI Integration):** Integrated the Groq LPU API, established the FFmpeg audio extraction pipeline, and finalized the background task processing for transcript and summary generation.
- **Milestone 3 (Analytics & Interactivity):** Built the Key Moments extraction prompt, linked the frontend video player to timestamps, and built the Administrator Analytics Dashboard using Recharts to display trending keywords.
- **Milestone 4 (Production Readiness):** Optimized the codebase, built a Pytest suite, benchmarked AI latency in Jupyter Notebooks, containerized the app via Docker, and successfully deployed to the Render Cloud Platform.

---

## 6. Testing, Evaluation, and Constraints

### 6.1 AI Evaluation
A Jupyter Notebook was developed to benchmark the accuracy and latency of the Groq API. The pipeline consistently achieved sub-10 second processing times for 5+ minute videos, massively outperforming local inference.

### 6.2 Deployment Constraints
While deployed successfully to Render, the free-tier cloud environment presented three key constraints:
1. **Ephemeral Storage:** Render's free tier wipes local files on restart, causing processed video files to disappear.
2. **YouTube IP Blocking:** Cloud datacenter IPs are frequently blocked by YouTube, failing the `yt-dlp` import.
3. **Cold Starts:** Free instances spin down after inactivity, causing initial API timeouts.
*Solution:* The architecture was validated on the cloud, but live demonstrations are optimally run locally to bypass these artificial hardware constraints.

---

## 7. Conclusion & Future Scope
ClipMind AI successfully meets all project requirements, delivering a fast, accurate, and highly scalable video summarization platform. 

**Future Enhancements:**
- Integration of AWS S3 for persistent cloud video storage.
- Adding Multi-Language translation support for transcripts.
- Implementing RAG (Retrieval-Augmented Generation) to allow users to "chat" directly with their video content.

---
*End of Report*
