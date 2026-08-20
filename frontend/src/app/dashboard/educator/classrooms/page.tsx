"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function EducatorClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch(`${API_URL}/api/classroom/educator`, {
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

  const handleCreate = async () => {
    if (!newClassName.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/classroom/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newClassName })
      });
      if (res.ok) {
        setNewClassName("");
        fetchClassrooms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleEnrollment = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/classroom/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchClassrooms();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="p-8">Loading classrooms...</div>;

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-4xl font-bold text-white tracking-tight">Classrooms</h1>
      
      <div className="glass-panel p-6 rounded-2xl flex gap-4 items-center">
        <input 
          type="text" 
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
          placeholder="New Classroom Name (e.g. Data Structures 101)"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
        />
        <button onClick={handleCreate} className="ai-gradient-bg px-6 py-3 rounded-xl font-bold text-white hover:brightness-110 transition-all shadow-lg">
          Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classrooms.map(cls => (
          <div key={cls.id} className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-2xl font-bold text-white">{cls.name}</h3>
              <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <span className="font-mono text-accent font-bold tracking-widest">{cls.code}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-background/50 rounded-xl p-4 border border-white/5">
                <div className="text-text-tertiary text-sm mb-1 uppercase tracking-wider">Students</div>
                <div className="text-2xl font-bold text-white">{cls.student_count}</div>
              </div>
              <div className="bg-background/50 rounded-xl p-4 border border-white/5">
                <div className="text-text-tertiary text-sm mb-1 uppercase tracking-wider">Videos</div>
                <div className="text-2xl font-bold text-white">{cls.video_count}</div>
              </div>
            </div>
            
            <div className="flex gap-4 relative z-10">
              <button 
                onClick={() => toggleEnrollment(cls.id)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border ${cls.is_accepting_students ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
              >
                {cls.is_accepting_students ? 'Accepting Students' : 'Enrollment Closed'}
              </button>
              <button 
                onClick={() => router.push(`/dashboard/educator/classrooms/${cls.id}`)}
                className="flex-1 glass-panel border border-white/10 py-2 rounded-lg font-bold text-white text-sm hover:bg-white/10 transition-all"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
        {classrooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-tertiary border border-dashed border-white/10 rounded-3xl">
            You haven't created any classrooms yet.
          </div>
        )}
      </div>
    </div>
  );
}

