"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function Dashboard() {
  const [videos, setVideos] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchVideos = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/login");
        return;
      }
      setToken(storedToken);
      try {
        const userRes = await fetch(`${API_URL}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${storedToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.role === "learner") {
            router.push("/dashboard/learner/classrooms");
            return;
          } else if (userData.role === "administrator") {
            router.push("/dashboard/admin");
            return;
          }
        }
        
        const [videoRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/api/video/?t=${Date.now()}`, {
            headers: { "Authorization": `Bearer ${storedToken}` },
            cache: "no-store"
          }),
          fetch(`${API_URL}/api/analytics/`, {
            headers: { "Authorization": `Bearer ${storedToken}` },
            cache: "no-store"
          })
        ]);

        if (videoRes.ok) {
          const data = await videoRes.json();
          setVideos(data.filter((v: any) => v.status !== "failed"));
        }
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } catch (e) {
        console.error("Failed to fetch videos", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, [router]);

  const completedCount = videos.filter(v => v.status === "completed").length;
  // Calculate exact time saved based on transcript durations
  const totalDurationMinutes = analytics?.total_duration_minutes || 0;
  
  let watchTimeSavedDisplay = "0m";
  if (totalDurationMinutes >= 60) {
    const hours = Math.floor(totalDurationMinutes / 60);
    const mins = Math.round(totalDurationMinutes % 60);
    watchTimeSavedDisplay = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else if (totalDurationMinutes > 0) {
    watchTimeSavedDisplay = `${Math.round(totalDurationMinutes)}m`;
  } else if (completedCount > 0) {
    // Fallback if transcripts are still processing but marked completed
    watchTimeSavedDisplay = `${Math.round(completedCount * 15)}m`;
  }

  const quickStats = [
    { title: "Total Videos", value: videos.length.toString(), icon: "video_library", increase: "Your library size" },
    { title: "Summaries Generated", value: (analytics?.summaries_generated ?? 0).toString(), icon: "auto_awesome", increase: "AI Insights Ready" },
    { title: "Watch Time Saved", value: watchTimeSavedDisplay, icon: "timer", increase: "Time Reclaimed" },
  ];

  const uniqueTags = Array.from(
    new Set(
      videos.flatMap((v) => {
        return v.tags ? v.tags.split(",").map((t: string) => t.trim().toLowerCase()) : [];
      })
    )
  ).filter(Boolean);

  const filteredVideos = videos.filter((v) => {
    let matchTag = true;
    if (selectedTag) {
      const userTags = v.tags ? v.tags.split(",").map((t: string) => t.trim().toLowerCase()) : [];
      matchTag = userTags.includes(selectedTag.toLowerCase());
    }
    
    let matchSearch = true;
    if (searchTerm) {
      const title = (v.title || v.filename || "").toLowerCase();
      matchSearch = title.includes(searchTerm.toLowerCase());
    }
    
    return matchTag && matchSearch;
  });

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-4 flex-wrap">
        <div className="mb-4 md:mb-0">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Dashboard</h1>
          <p className="text-text-secondary font-light">Welcome back. Your AI insights are ready.</p>
        </div>
        <div className="flex flex-wrap gap-4 shrink-0 relative">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm pointer-events-none">search</span>
            <input 
              type="text" 
              placeholder="Search videos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-panel border border-white/10 text-white pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent transition-all w-48 focus:w-64 placeholder-text-tertiary"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsDateOpen(false); }}
              className={`glass-panel border ${selectedTag ? 'border-accent text-accent' : 'border-white/10 text-white'} px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-3`}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span> {selectedTag ? `#${selectedTag}` : 'Filter'}
              {selectedTag && (
                <span 
                  className="material-symbols-outlined text-sm ml-2 hover:text-white" 
                  onClick={(e) => { e.stopPropagation(); setSelectedTag(null); }}
                >
                  close
                </span>
              )}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-panel border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-1">
                  <p className="px-3 py-1.5 text-xs font-bold text-text-tertiary uppercase tracking-wider">By Tag</p>
                  {uniqueTags.length > 0 ? uniqueTags.map((tag, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setSelectedTag(tag); setIsFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${selectedTag === tag ? 'bg-accent/20 text-accent font-bold' : 'text-white hover:bg-white/10'}`}
                    >
                      #{tag} 
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-sm text-text-tertiary">No tags found</p>
                  )}
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
          <h2 className="text-2xl font-bold text-white tracking-tight">{selectedTag ? `Videos tagged #${selectedTag}` : 'Recent Videos'}</h2>
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
        ) : filteredVideos.length === 0 ? (
          <div className="glass-panel border border-white/5 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center glow-effect">
            <span className="material-symbols-outlined text-4xl text-accent mb-4">filter_list_off</span>
            <h3 className="text-xl font-bold text-white mb-2">No videos match this filter</h3>
            <p className="text-text-secondary">Try selecting a different tag.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <Link href={`/dashboard/video/${video.id}`} key={video.id} className="group cursor-pointer">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-3 bg-black shadow-lg flex items-center justify-center">
                  <video 
                    src={token ? `${API_URL}/api/video/stream/${video.id}?token=${token}#t=0.1` : ''} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-100" 
                    preload="metadata"
                  />
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white">{video.duration}</div>
                  )}
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-accent/80 flex items-center justify-center backdrop-blur shadow-[0_0_15px_rgba(139,92,246,0.5)] transform group-hover:scale-110 transition-transform">
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

