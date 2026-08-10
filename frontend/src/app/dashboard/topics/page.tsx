"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<{keyword: string, videos: any[]}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/api/video/", {
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
            .sort((a, b) => b.videos.length - a.videos.length);
            
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
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Topics Library</h1>
        <p className="text-text-secondary font-light">Explore your AI-generated topics and themes.</p>
      </div>

      {topics.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center glow-effect mt-8">
          <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <span className="material-symbols-outlined text-5xl text-accent">library_books</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">No topics yet</h3>
          <p className="text-text-secondary mb-10 max-w-lg text-lg">Generate AI summaries on your videos to start building your topics library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {topics.map((topic, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl hover:border-accent/50 transition-all cursor-pointer group">
               <div className="flex justify-between items-start mb-4">
                 <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                   <span className="material-symbols-outlined text-accent">tag</span>
                 </div>
                 <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-text-secondary">
                   {topic.videos.length} videos
                 </span>
               </div>
               <h3 className="text-xl font-bold text-white mb-2 capitalize">{topic.keyword}</h3>
               <div className="flex -space-x-2 overflow-hidden mt-4">
                 {topic.videos.slice(0, 3).map((v, j) => (
                    <div key={j} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-white/10 flex items-center justify-center text-[10px] font-bold overflow-hidden" title={v.title}>
                       {v.title ? v.title.charAt(0).toUpperCase() : 'V'}
                    </div>
                 ))}
                 {topic.videos.length > 3 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-accent flex items-center justify-center text-[10px] font-bold text-white">
                      +{topic.videos.length - 3}
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
