"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminVideoDetailsModal from "@/components/AdminVideoDetailsModal";
import { API_URL } from "@/lib/api";

export default function AdminContentPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch(`${API_URL}/api/admin/videos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setVideos(await res.json());
      else console.error("Failed to load platform videos");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm("Are you sure you want to permanently delete this video? This action cannot be undone.")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/admin/videos/${videoId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchVideos();
      else alert("Failed to delete video");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Manage Content</h1>
        <p className="text-text-secondary font-light">Oversee all uploaded videos across the platform.</p>
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Video ID / Title</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Owner</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">Loading content...</td></tr>
            ) : videos.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No videos uploaded yet.</td></tr>
            ) : videos.map((video, index) => (
              <tr 
                key={video.id} 
                className="hover:bg-white/10 transition-colors cursor-pointer group"
                onClick={() => setSelectedVideoId(video.id)}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-white group-hover:text-accent transition-colors">
                      <span className="material-symbols-outlined text-sm align-middle mr-2">play_circle</span>
                      {video.title || video.filename}
                    </span>
                    <span className="text-xs text-text-tertiary">ID: #{videos.length - index} • {new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary font-medium">
                  {video.owner_name}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    video.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/20' :
                    video.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {video.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                    title="Delete Video"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
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

