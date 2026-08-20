"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function LearnerClassroomDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: classroomId } = use(params);
  const [classroom, setClassroom] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return router.push("/login");
    setToken(storedToken);

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/classroom/${classroomId}/videos/learner`, {
          headers: { "Authorization": `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setClassroom(data.classroom);
          setVideos(data.videos);
        } else if (res.status === 403) {
          router.push("/dashboard/learner/classrooms");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [classroomId, router]);

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/dashboard/learner/classrooms"
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm font-medium w-fit"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Classrooms
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/80 to-purple-600/80 flex items-center justify-center shadow-lg border border-white/20">
                <span className="material-symbols-outlined text-white">school</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">{classroom?.name}</h1>
                <p className="text-text-secondary text-sm mt-1">By {classroom?.educator_name} • {videos.length} video{videos.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>
          </div>

          {/* Videos */}
          {videos.length === 0 ? (
            <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-5xl text-accent">movie</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No videos yet</h3>
              <p className="text-text-secondary max-w-md">Your educator hasn't uploaded any processed videos to this classroom yet. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {videos.map((video) => (
                <Link href={`/dashboard/video/${video.id}`} key={video.id} className="group cursor-pointer">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-3 bg-black shadow-lg flex items-center justify-center">
                    <video
                      src={token ? `${API_URL}/api/video/stream/${video.id}?token=${token}#t=0.1` : ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-100"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-accent/80 flex items-center justify-center backdrop-blur shadow-[0_0_15px_rgba(139,92,246,0.5)] transform group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-2xl">play_arrow</span>
                      </div>
                    </div>
                    {/* AI badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-accent border border-accent/30 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">auto_awesome</span> AI Summary
                    </div>
                  </div>
                  <h4 className="font-bold text-white truncate group-hover:text-accent transition-colors">{video.title || video.filename}</h4>
                  {video.ai_keywords && video.ai_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {video.ai_keywords.slice(0, 3).map((kw: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20">{kw}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
