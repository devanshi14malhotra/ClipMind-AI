"use client";
import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function EducatorClassroomDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: classroomId } = use(params);
  const [classroom, setClassroom] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, [classroomId]);

  const fetchDashboardData = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return router.push("/login");
    setToken(storedToken);

    try {
      const [clsRes, stuRes, vidRes, anaRes] = await Promise.all([
        fetch(`${API_URL}/api/classroom/${classroomId}`, { headers: { Authorization: `Bearer ${storedToken}` } }),
        fetch(`${API_URL}/api/classroom/${classroomId}/students`, { headers: { Authorization: `Bearer ${storedToken}` } }),
        fetch(`${API_URL}/api/classroom/${classroomId}/videos`, { headers: { Authorization: `Bearer ${storedToken}` } }),
        fetch(`${API_URL}/api/classroom/${classroomId}/analytics`, { headers: { Authorization: `Bearer ${storedToken}` } })
      ]);

      if (clsRes.ok) setClassroom(await clsRes.json());
      else if (clsRes.status === 404) return router.push("/dashboard/educator/classrooms");

      if (stuRes.ok) setStudents(await stuRes.json());
      if (vidRes.ok) setVideos(await vidRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const removeStudent = async (studentId: number) => {
    if (!confirm("Are you sure you want to remove this student from the classroom?")) return;
    const storedToken = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/classroom/${classroomId}/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (res.ok) {
        setStudents(students.filter(s => s.id !== studentId));
        const anaRes = await fetch(`${API_URL}/api/classroom/${classroomId}/analytics`, { headers: { Authorization: `Bearer ${storedToken}` } });
        if (anaRes.ok) setAnalytics(await anaRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleEnrollment = async () => {
    const storedToken = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/classroom/${classroomId}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassroom({ ...classroom, is_accepting_students: data.is_accepting_students });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading classroom dashboard...</div>;
  if (!classroom) return <div className="p-8 text-center text-red-400">Classroom not found</div>;

  return (
    <div className="space-y-8 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/dashboard/educator/classrooms" className="text-text-tertiary hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Classrooms
          </Link>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            {classroom.name}
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${classroom.is_accepting_students ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {classroom.is_accepting_students ? 'Accepting Students' : 'Enrollment Closed'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-xl">
          <div className="px-4 py-2 bg-black/40 rounded-lg">
            <span className="text-xs text-text-tertiary uppercase tracking-widest block mb-1">Class Code</span>
            <span className="font-mono text-xl font-bold text-accent tracking-[0.2em]">{classroom.code}</span>
          </div>
          <button 
            onClick={toggleEnrollment}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors border border-white/5"
            title="Toggle Enrollment"
          >
            <span className="material-symbols-outlined">{classroom.is_accepting_students ? 'lock_open' : 'lock'}</span>
          </button>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-accent flex items-center gap-4 group hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
              <span className="material-symbols-outlined">group</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{analytics.total_students}</div>
              <div className="text-sm text-text-secondary">Enrolled Students</div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-pink-500 flex items-center gap-4 group hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500">
              <span className="material-symbols-outlined">visibility</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{analytics.total_views}</div>
              <div className="text-sm text-text-secondary">Total Video Views</div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500 flex items-center gap-4 group hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{analytics.engagement_rate}%</div>
              <div className="text-sm text-text-secondary">Student Engagement</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Videos Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Classroom Videos</h2>
            <Link href="/dashboard/upload" className="ai-gradient-bg px-4 py-2 rounded-lg font-bold text-sm text-white shadow-lg hover:brightness-110 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">upload</span> Add Video
            </Link>
          </div>
          
          <div className="space-y-4">
            {videos.length === 0 ? (
              <div className="glass-panel p-8 text-center text-text-tertiary rounded-2xl border border-dashed border-white/20">
                No videos have been assigned to this classroom yet.
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="glass-panel p-4 rounded-xl flex gap-4 hover:bg-white/5 transition-colors border border-white/5 group items-center">
                  <div className="w-32 h-20 bg-black/40 rounded-lg flex items-center justify-center border border-white/10 shrink-0 overflow-hidden relative">
                    <span className="material-symbols-outlined text-white/20 text-3xl">play_circle</span>
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 rounded text-[10px] text-white">
                      {new Date(video.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{video.title || video.filename}</h3>
                    <p className="text-xs text-text-secondary line-clamp-1">{video.description || "No description provided."}</p>
                    <div className="flex gap-2 mt-2">
                      {video.ai_keywords?.slice(0, 3).map((kw: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white border border-white/10">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded text-center ${video.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {video.status.toUpperCase()}
                    </span>
                    <Link href={`/dashboard/video/${video.id}`} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded transition-colors text-center">
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Students Column */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-bold text-white">Enrolled Students ({students.length})</h2>
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            {students.length === 0 ? (
              <div className="p-8 text-center text-text-tertiary">
                No students enrolled yet.
                <p className="text-xs mt-2">Share the class code <b>{classroom.code}</b> to invite them.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {students.map(student => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{student.name}</div>
                        <div className="text-xs text-text-tertiary">{student.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeStudent(student.id)}
                      className="text-red-400 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-full transition-all"
                      title="Remove student"
                    >
                      <span className="material-symbols-outlined text-sm">person_remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
