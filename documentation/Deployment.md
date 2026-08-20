# ClipMind AI — Deployment Guide

The ClipMind AI platform has been fully deployed to the cloud using Docker containerization.

## Live Application Links
- **Frontend (Web App):** [https://clipmind-ai-frontend.onrender.com/](https://clipmind-ai-frontend.onrender.com/)
- **Backend (API):** [https://clipmind-ai-8hkx.onrender.com/](https://clipmind-ai-8hkx.onrender.com/)

---

## Infrastructure Architecture

### 1. Frontend Deployment (Render)
- **Framework:** Next.js
- **Containerization:** The frontend is packaged using a multi-stage Dockerfile (`frontend/Dockerfile`). It uses Next.js `standalone` mode to drastically reduce the image size, resulting in a tiny Alpine Linux runner image.
- **Networking:** Listens on `0.0.0.0:3000` inside the container.
- **Environment:** Connected directly to the backend via the `NEXT_PUBLIC_API_URL` environment variable.

### 2. Backend Deployment (Render)
- **Framework:** FastAPI (Python)
- **Containerization:** The backend is packaged using `backend/Dockerfile`. The image (`python:3.11-slim`) includes system-level dependencies such as `ffmpeg` which are required for audio extraction before passing data to the Groq APIs.
- **Networking:** Exposes port `8000`. 
- **Concurrency:** Uses FastAPI `BackgroundTasks` so AI summarization runs asynchronously, preventing HTTP timeouts on Render's infrastructure.

### 3. Databases (Managed Cloud)
We utilize DBaaS (Database as a Service) to ensure our data is persistent and scalable:
- **PostgreSQL:** Hosted on Render (Internal networking linked to the backend). Stores users, roles, classrooms, and video metadata.
- **MongoDB:** Hosted on MongoDB Atlas (M0 Cluster in Asia region). Stores the large JSON payloads for transcripts, study guides, and summaries.

---

## How to Run Locally

If you need to run the Dockerized stack on your local machine for development:

1. Clone the repository.
2. Ensure Docker Desktop is running.
3. Provide `.env` variables in the `backend/` folder.
4. Run Docker Compose:
   ```bash
   docker-compose up --build
   ```
5. The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`.
