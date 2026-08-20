# ClipMind AI — API Documentation

The backend is built with FastAPI. FastAPI automatically generates interactive API documentation which can be accessed live when the backend is running at:
- **Swagger UI:** `/docs` (e.g., `https://clipmind-ai-8hkx.onrender.com/docs`)
- **ReDoc:** `/redoc`

Below is an overview of the core endpoints.

## Authentication Endpoints (`/api/auth`)

### `POST /register`
Registers a new user on the platform.
- **Payload:** `{ "name": "string", "email": "string", "password": "string", "role": "string" }`
- **Response:** `{ "access_token": "string", "token_type": "bearer" }`

### `POST /login`
Authenticates a user and returns a JWT token.
- **Payload (Form Data):** `username`, `password`
- **Response:** `{ "access_token": "string", "token_type": "bearer" }`

---

## Video Management Endpoints (`/api/video`)

All endpoints below require a valid `Bearer` token in the `Authorization` header.

### `POST /upload`
Uploads a local video file to the server.
- **Payload (Multipart Form):** `file`, `title`, `description`, `tags`, `classroom_id` (optional)
- **Response:** `{ "status": "uploaded", "video_id": "int" }`

### `POST /youtube`
Submits a YouTube URL for processing.
- **Payload:** `{ "url": "string", "title": "string", "description": "string", "tags": "string", "classroom_id": "int" }`
- **Response:** `{ "status": "uploaded", "video_id": "int" }`

### `GET /{video_id}`
Retrieves metadata for a specific video.
- **Response:** `{ "id": "int", "title": "string", "url": "string", ... }`

### `GET /list`
Retrieves a list of videos belonging to the authenticated user.
- **Response:** `[ { "id": "int", "title": "string", ... } ]`

---

## AI Processing Endpoints (`/api/video`)

### `POST /{video_id}/process`
Triggers the AI processing pipeline for a specific video. This task runs asynchronously in the background.
- **Payload:** `{ "generate_transcript": bool, "generate_summary": bool, "generate_key_moments": bool }`
- **Response:** `{ "status": "processing", "message": "Video processing started in background" }`

### `GET /{video_id}/ai_results`
Fetches the completed AI analysis results from MongoDB.
- **Response:** 
  ```json
  {
    "transcript": [ { "timestamp": "string", "text": "string" } ],
    "brief_overview": "string",
    "detailed_summary": "string",
    "key_moments": [ { "timestamp": "string", "description": "string" } ],
    "study_guide": "string",
    "quiz": [ { "question": "string", "options": [], "answer": "string" } ]
  }
  ```

### `POST /{video_id}/generate_specific`
Forces regeneration of a specific AI component if the user desires a new output or previously skipped it.
- **Payload:** `{ "type": "string (e.g. summary, key_moments)" }`

---

## Classroom Endpoints (`/api/classroom` & `/api/educator` & `/api/learner`)

Provide complete CRUD operations for educators to create classrooms, upload content to them, and for learners to enroll in classrooms to view educational videos.

---

## Analytics Endpoints (`/api/analytics`)

### `GET /metrics`
Returns aggregate statistics for the entire platform or specific user.
- **Response:** `{ "total_videos": int, "total_users": int, "total_storage_mb": float }`

### `GET /keywords`
Returns the top trending keywords extracted from all processed transcripts.
- **Response:** `{ "top_keywords": [ { "keyword": "string", "count": int } ] }`
