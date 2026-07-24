"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchVideos = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/api/video/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setVideos(data.filter((v: any) => v.status !== "failed"));
        }
      } catch (e) {
        console.error("Failed to fetch videos", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, [router]);

  const quickStats = [
    { title: "Total Videos", value: videos.length.toString(), icon: "video_library", increase: "Your library size" },
    { title: "Summaries Generated", value: videos.length > 0 ? "0" : "0", icon: "auto_awesome", increase: "Coming soon" },
    { title: "Watch Time Saved", value: "0h", icon: "timer", increase: "Milestone 2" },
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-4 flex-wrap">
        <div className="mb-4 md:mb-0">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Dashboard</h1>
          <p className="text-text-secondary font-light">Welcome back. Your AI insights are ready.</p>
        </div>
        <div className="flex flex-wrap gap-4 shrink-0 relative">
          <div className="relative">
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsDateOpen(false); }}
              className="glass-panel border border-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-panel border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl">
                <div className="p-2 space-y-1">
                  <p className="px-3 py-1.5 text-xs font-bold text-text-tertiary uppercase tracking-wider">By Tag</p>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors flex justify-between items-center">
                    #marketing <span className="w-2 h-2 rounded-full bg-accent"></span>
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors flex justify-between items-center">
                    #education <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors flex justify-between items-center">
                    #tutorial <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => { setIsDateOpen(!isDateOpen); setIsFilterOpen(false); }}
              className="glass-panel border border-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-sm">calendar_today</span> Last 30 Days
            </button>
            {isDateOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-panel border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl">
                <div className="p-2 space-y-1">
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors font-bold text-accent">Last 30 Days</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors">Last 7 Days</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors">This Year</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-colors">All Time</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {quickStats.map((stat, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-6 relative overflow-hidden group glass-panel-hover">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-accent">{stat.icon}</span>
              </div>
              <span className="text-accent text-xs font-bold px-2 py-1 bg-accent/10 rounded-full">{stat.increase}</span>
            </div>
            <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-2">{stat.title}</h3>
            <div className="flex items-baseline gap-sm">
              <span className="text-4xl font-bold text-white">{stat.value}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-xl relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Recent Videos</h2>
          {videos.length > 0 && <Link className="text-accent text-sm font-medium hover:underline" href="/dashboard">View all</Link>}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="glass-panel border border-white/5 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center glow-effect">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-accent">movie</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No videos yet</h3>
            <p className="text-text-secondary mb-8 max-w-md">You haven't uploaded any videos for analysis yet. Get started by uploading your first video to generate transcripts and AI summaries.</p>
            <Link href="/dashboard/upload" className="ai-gradient-bg text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform flex items-center gap-2">
              <span className="material-symbols-outlined">upload</span> Upload First Video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <Link href={`/dashboard/video/${video.id}`} key={video.id} className="group cursor-pointer">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-3 bg-surface-container shadow-lg">
                  {video.thumbnail_url ? (
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.filename} src={`http://127.0.0.1:8000${video.thumbnail_url}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container">
                      <span className="material-symbols-outlined text-white/20 text-5xl">movie</span>
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white">{video.duration}</div>
                  )}
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-accent/80 flex items-center justify-center backdrop-blur shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                      <span className="material-symbols-outlined text-white text-2xl">play_arrow</span>
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-white truncate group-hover:text-accent transition-colors">{video.title || video.filename}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${video.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                  <p className="text-xs text-text-secondary capitalize">{video.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
