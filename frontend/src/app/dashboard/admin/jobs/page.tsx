"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminVideoDetailsModal from "@/components/AdminVideoDetailsModal";
import { API_URL } from "@/lib/api";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
    // Auto-refresh jobs every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch("\${API_URL}/api/admin/videos", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setJobs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">AI Processing Jobs</h1>
        <p className="text-text-secondary font-light">Monitor system-wide video summarization and transcription tasks.</p>
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Job ID</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">File Name</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Queued At</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Job Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && jobs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">Loading processing jobs...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No processing jobs found.</td></tr>
            ) : jobs.map((job, index) => (
              <tr 
                key={job.id} 
                className="hover:bg-white/10 transition-colors cursor-pointer group"
                onClick={() => setSelectedVideoId(job.id)}
              >
                <td className="px-6 py-4 text-text-secondary">#{jobs.length - index}</td>
                <td className="px-6 py-4 font-bold text-white group-hover:text-accent transition-colors">
                  <span className="material-symbols-outlined text-sm align-middle mr-2">play_circle</span>
                  {job.title || job.filename}
                </td>
                <td className="px-6 py-4 text-text-tertiary">{new Date(job.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-2">
                    {job.status === 'processing' && <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/20' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                      job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' :
                      'bg-white/10 text-white border-white/20'
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedVideoId && (
        <AdminVideoDetailsModal 
          videoId={selectedVideoId} 
          onClose={() => setSelectedVideoId(null)} 
        />
      )}
    </div>
  );
}

