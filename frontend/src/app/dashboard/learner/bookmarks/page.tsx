"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function Bookmarks() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBookmarks = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      try {
        const res = await fetch(`${API_URL}/api/learner/bookmarks`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setVideos(await res.json());
      } catch (e) { console.error(e); } 
      finally { setIsLoading(false); }
    };
    fetchBookmarks();
  }, [router]);

  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-2">Bookmarks</h1>
      <p className="text-text-secondary mb-10">Your saved insights and summaries.</p>
      
      {isLoading ? (
        <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
      ) : videos.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-[2rem]">
          <h3 className="text-2xl font-bold text-white">No bookmarks yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Link href={`/dashboard/video/${video.id}`} key={video.id} className="group cursor-pointer">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-3 bg-black shadow-lg">
                <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">play_circle</span>
                </div>
              </div>
              <h4 className="font-bold text-white truncate group-hover:text-accent transition-colors">{video.title || video.filename}</h4>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

