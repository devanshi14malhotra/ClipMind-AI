"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { API_URL } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      try {
        const res = await fetch(`${API_URL}/api/admin/system-stats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setStats(await res.json());
        else console.error("Failed to fetch admin stats. Ensure backend is running and user has admin privileges.");
      } catch (e) { console.error(e); } 
      finally { setIsLoading(false); }
    };
    fetchStats();
  }, [router]);

  const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b'];

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">System Analytics</h1>
          <p className="text-text-secondary">Platform-wide overview and resource utilization.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="no-print glass-panel border border-white/10 px-6 py-3 rounded-xl text-white font-bold transition-all hover:bg-white/10 shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined">picture_as_pdf</span> Download PDF Report
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl">group</span></div>
               <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Total Users</p>
               <p className="text-5xl font-bold text-white">{stats?.total_users || 0}</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl">movie</span></div>
               <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Total Videos</p>
               <p className="text-5xl font-bold text-white">{stats?.total_videos || 0}</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl">storage</span></div>
               <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Storage Utilized</p>
               <p className="text-5xl font-bold text-white">{stats?.storage_utilized_mb || 0} MB</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-6xl">sync</span></div>
               <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Active Jobs</p>
               <p className="text-5xl font-bold text-white">{stats?.active_processing_jobs || 0}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Activity Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 lg:col-span-2">
              <h3 className="text-white font-bold mb-6">Platform Engagement (Last 7 Days)</h3>
              <div className="w-full" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.activity_data || []}>
                    <defs>
                      <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWatched" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#000000dd', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#fff' }}/>
                    <Area type="monotone" name="Videos Uploaded" dataKey="uploaded" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVideos)" />
                    <Area type="monotone" name="Videos Watched" dataKey="watched" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWatched)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Status Pie Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-white font-bold mb-6">Video Processing Status</h3>
              <div className="w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.video_status_distribution || []}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {(stats?.video_status_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.name.toLowerCase() === 'completed' ? '#10b981' :
                          entry.name.toLowerCase() === 'processing' ? '#f59e0b' :
                          entry.name.toLowerCase() === 'failed' ? '#f43f5e' : '#8b5cf6'
                        } />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#000000dd', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role Distribution Bar Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-white font-bold mb-6">User Role Distribution</h3>
              <div className="w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.role_distribution || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#000000dd', border: '1px solid #ffffff20', borderRadius: '8px' }} cursor={{fill: '#ffffff05'}} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {(stats?.role_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

