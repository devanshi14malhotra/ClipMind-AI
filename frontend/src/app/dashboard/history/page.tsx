"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function UploadHistoryPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return router.push("/login");
      setToken(storedToken);
      try {
        const res = await fetch(`\${API_URL}/api/video/?t=${Date.now()}`, {
          headers: { "Authorization": `Bearer ${storedToken}` },
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          // Sort by newest first (already server-sorted, but let's ensure)
          setVideos(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchHistory();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "processing": return "bg-accent/10 text-accent border-accent/20";
      case "uploaded": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-red-500/10 text-red-400 border-red-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "check_circle";
      case "processing": return "sync";
      case "uploaded": return "upload_file";
      default: return "error";
    }
  };

  return (
    <div>
      <div className="mb-10 mt-4">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Upload History</h1>
        <p className="text-text-secondary font-light">All videos you have ever uploaded — including their processing status.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-accent">video_library</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No uploads yet</h3>
          <p className="text-text-secondary mb-8 max-w-md">Start uploading videos to see your full history here.</p>
          <Link href="/dashboard/upload" className="ai-gradient-bg text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform flex items-center gap-2">
            <span className="material-symbols-outlined">upload</span> Upload Your First Video
          </Link>
        </div>
      ) : (
        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="col-span-5 text-xs font-bold text-text-tertiary uppercase tracking-widest">Video</div>
            <div className="col-span-2 text-xs font-bold text-text-tertiary uppercase tracking-widest">Status</div>
            <div className="col-span-2 text-xs font-bold text-text-tertiary uppercase tracking-widest">Tags</div>
            <div className="col-span-2 text-xs font-bold text-text-tertiary uppercase tracking-widest">Uploaded</div>
            <div className="col-span-1 text-xs font-bold text-text-tertiary uppercase tracking-widest">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {videos.map((video) => (
              <div key={video.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors items-center group">
                {/* Title */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-accent text-sm">movie</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-accent transition-colors">{video.title || video.filename}</p>
                    {video.description && (
                      <p className="text-xs text-text-tertiary truncate mt-0.5">{video.description}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(video.status)}`}>
                    <span className={`material-symbols-outlined text-[12px] ${video.status === 'processing' ? 'animate-spin' : ''}`}>{getStatusIcon(video.status)}</span>
                    {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                  </span>
                </div>

                {/* Tags */}
                <div className="col-span-2 flex flex-wrap gap-1">
                  {video.tags
                    ? video.tags.split(",").slice(0, 2).map((t: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20">#{t.trim()}</span>
                      ))
                    : <span className="text-text-tertiary text-xs">—</span>
                  }
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <p className="text-sm text-text-secondary">
                    {video.created_at ? new Date(video.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {video.created_at ? new Date(video.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <Link
                    href={`/dashboard/video/${video.id}`}
                    className="text-text-secondary hover:text-accent transition-colors p-2 hover:bg-white/5 rounded-lg"
                    title="View Video"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs text-text-tertiary">{videos.length} total upload{videos.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-text-tertiary">
              {videos.filter(v => v.status === "completed").length} processed · {videos.filter(v => v.status === "processing").length} processing · {videos.filter(v => v.status === "uploaded").length} pending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

