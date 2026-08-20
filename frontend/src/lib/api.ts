/**
 * Central API URL configuration.
 * In production (Render), set NEXT_PUBLIC_API_URL env var to your backend URL.
 * e.g. https://clipmind-backend.onrender.com
 * Locally it defaults to http://127.0.0.1:8000
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
