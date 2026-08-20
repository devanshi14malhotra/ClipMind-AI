"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<{keyword: string, videos: any[]}[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/video/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const videos = await res.json();
          // Group videos by AI keyword
          const topicMap: Record<string, any[]> = {};
          videos.forEach((v: any) => {
             // For now, if AI keywords aren't fully merged, check if ai_keywords exists
             const keywords = v.ai_keywords || [];
             keywords.forEach((kw: string) => {
               const cleanKw = kw.trim().toLowerCase();
               if (!topicMap[cleanKw]) topicMap[cleanKw] = [];
               topicMap[cleanKw].push(v);
             });
          });
          
          const sortedTopics = Object.entries(topicMap)
            .map(([keyword, vids]) => ({ keyword, videos: vids }))
            .sort((a, b) => b.videos.length - a.videos.length)
            .slice(0, 12); // Only take top 12 most relevant topics
            
          setTopics(sortedTopics);
        }
      } catch (e) {
        console.error("Failed to fetch topics", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopics();
  }, [router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-10 px-4">
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">Topics Library</h1>
        <p className="text-text-secondary text-lg font-light">Explore your top AI-curated themes and concepts.</p>
      </div>

      {topics.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center mt-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none"></div>
          <div className="w-28 h-28 bg-gradient-to-tr from-accent/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(139,92,246,0.3)] backdrop-blur-xl border border-white/10">
            <span className="material-symbols-outlined text-6xl text-accent">library_books</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-4 relative z-10">No topics discovered yet</h3>
          <p className="text-text-secondary mb-10 max-w-lg text-lg relative z-10">Process videos with our AI to automatically extract and catalog key concepts.</p>
        </div>
      ) : selectedTopic ? (
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setSelectedTopic(null)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <h2 className="text-3xl font-bold text-white capitalize">{selectedTopic}</h2>
            <span className="text-xs font-bold bg-accent/20 border border-accent/30 text-accent px-3 py-1.5 rounded-full ml-2">
              {topics.find(t => t.keyword === selectedTopic)?.videos.length} Video(s)
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.find(t => t.keyword === selectedTopic)?.videos.map((video) => (
              <Link href={`/dashboard/video/${video.id}`} key={video.id} className="group cursor-pointer">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-3 bg-black shadow-lg flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img src={`${API_URL}/${video.thumbnail_url}`} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-100" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-white/20">movie</span>
                    </div>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12">
          {topics.map((topic, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedTopic(topic.keyword)}
              className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-accent/40 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer group hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.2)]"
            >
               <div className="flex justify-between items-start mb-6">
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/80 to-purple-600/80 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-white/20">
                   <span className="text-white text-2xl font-black">#</span>
                 </div>
                 <span className="text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-text-secondary group-hover:text-white transition-colors">
                   {topic.videos.length} Video{topic.videos.length !== 1 && 's'}
                 </span>
               </div>
               <h3 className="text-2xl font-bold text-white mb-2 capitalize tracking-tight group-hover:text-accent transition-colors">{topic.keyword}</h3>
               
               <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                 <div className="flex -space-x-3 overflow-hidden">
                   {topic.videos.slice(0, 4).map((v, j) => (
                      <div key={j} className="h-10 w-10 rounded-full ring-2 ring-[#0F0F13] bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-md" title={v.title}>
                         {v.thumbnail_url ? (
                           <img src={`${API_URL}/${v.thumbnail_url}`} alt={v.title} className="w-full h-full object-cover" />
                         ) : (
                           v.title ? v.title.charAt(0).toUpperCase() : 'V'
                         )}
                      </div>
                   ))}
                 </div>
                 {topic.videos.length > 4 && (
                    <div className="h-10 w-10 rounded-full ring-2 ring-[#0F0F13] bg-white/5 flex items-center justify-center text-xs font-bold text-text-secondary">
                      +{topic.videos.length - 4}
                    </div>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

