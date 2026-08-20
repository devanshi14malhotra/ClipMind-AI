"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function LearnerClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch("\${API_URL}/api/classroom/learner", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClassrooms(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setErrorMsg("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("\${API_URL}/api/classroom/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: joinCode.trim() })
      });
      
      if (res.ok) {
        setJoinCode("");
        fetchClassrooms();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "Failed to join classroom");
      }
    } catch (e) {
      setErrorMsg("Connection error");
    }
  };

  if (isLoading) return <div className="p-8">Loading your classrooms...</div>;

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-4xl font-bold text-white tracking-tight">My Classrooms</h1>
      
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group max-w-2xl">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-3xl"></div>
        <h3 className="text-xl font-bold text-white mb-2 relative z-10">Join a Classroom</h3>
        <p className="text-text-secondary mb-6 relative z-10">Enter the unique code provided by your educator to unlock videos and study materials.</p>
        
        <div className="flex gap-4 relative z-10">
          <input 
            type="text" 
            className="flex-1 bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono tracking-widest uppercase focus:outline-none focus:border-accent"
            placeholder="ENTER 6-DIGIT CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={6}
          />
          <button onClick={handleJoin} className="ai-gradient-bg px-8 py-3 rounded-xl font-bold text-white hover:brightness-110 shadow-lg">
            Join
          </button>
        </div>
        {errorMsg && <p className="text-red-400 mt-4 font-bold text-sm bg-red-500/10 py-2 px-4 rounded-lg border border-red-500/20 inline-block">{errorMsg}</p>}
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Enrolled Classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map(cls => (
          <Link href={`/dashboard/learner/classrooms/${cls.id}`} key={cls.id} className="block group">
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative h-full transition-all duration-300 hover:border-white/20 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(139,92,246,0.2)]">
              <div className="w-12 h-12 rounded-xl ai-gradient-bg flex items-center justify-center mb-6 shadow-lg">
                <span className="material-symbols-outlined text-white">school</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-accent transition-colors">{cls.name}</h3>
              <p className="text-text-secondary flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-sm">person</span>
                Educator: {cls.educator_name}
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 mt-auto flex items-center justify-between">
                <div>
                  <div className="text-text-tertiary text-xs uppercase tracking-wider mb-1">Available Content</div>
                  <div className="text-white font-bold">{cls.video_count} Videos & Materials</div>
                </div>
                <span className="material-symbols-outlined text-accent group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>
        ))}
        {classrooms.length === 0 && (
          <div className="col-span-full py-16 text-center glass-panel border border-dashed border-white/10 rounded-3xl text-text-tertiary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">auto_stories</span>
            <p>You haven't joined any classrooms yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

