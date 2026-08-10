"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAnalytics = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/analytics?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
        <p className="text-text-secondary font-light">Monitor engagement and AI intelligence across your video content.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Videos" 
          value={data?.total_videos || 0} 
          icon="video_library" 
          color="from-blue-500 to-cyan-400" 
        />
        <MetricCard 
          title="Analyzed Videos" 
          value={data?.processed_videos || 0} 
          icon="auto_awesome" 
          color="from-purple-500 to-pink-500" 
        />
        <MetricCard 
          title="Key Moments Found" 
          value={data?.total_key_moments || 0} 
          icon="movie_filter" 
          color="from-orange-500 to-amber-400" 
        />
        <MetricCard 
          title="Minutes Analyzed" 
          value={data?.total_duration_minutes || 0} 
          icon="schedule" 
          color="from-emerald-500 to-teal-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Keywords Chart */}
        <div className="glass-panel border border-white/5 rounded-3xl p-8 glow-effect">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent">local_fire_department</span>
            Top Trending Topics
          </h3>
          
          <div className="h-[300px] w-full">
            {data?.top_keywords?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_keywords} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} />
                  <YAxis type="category" dataKey="keyword" stroke="#ffffff50" width={100} tick={{ fill: '#ffffff90', fontSize: 12, textTransform: 'capitalize' }} />
                  <Tooltip 
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#0f0f15', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#ec4899', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                    {data.top_keywords.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGradient)`} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-text-tertiary h-full flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">bar_chart</span>
                No keywords generated yet. Process some videos!
              </div>
            )}
          </div>
        </div>

        {/* Content Insights */}
        <div className="glass-panel border border-white/5 rounded-3xl p-8 glow-effect flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent">lightbulb</span>
              Content Intelligence
            </h3>
            <p className="text-text-secondary leading-relaxed mb-6 text-lg">
              Your video library is heavily focused on <strong className="text-pink-400 capitalize">{data?.top_keywords?.[0]?.keyword || 'various topics'}</strong>. 
              The AI has extracted <strong className="text-white">{data?.total_key_moments || 0}</strong> crucial highlight segments across all your media, saving an estimated <strong>{Math.round((data?.total_duration_minutes || 0) * 1.5)} minutes</strong> of manual review time.
            </p>
          </div>
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6 relative overflow-hidden">
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] text-accent/10 transform -rotate-12">monitoring</span>
            <h4 className="text-accent font-bold mb-2">Pro Tip</h4>
            <p className="text-sm text-text-secondary relative z-10 leading-relaxed">
              Users viewing AI-generated highlight reports are 3x more likely to retain the core information. Try sharing your Key Moments timestamps with your audience to boost engagement!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
  return (
    <div className="glass-panel border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h4 className="text-text-tertiary font-medium text-sm tracking-wide uppercase">{title}</h4>
        <span className={`material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br ${color}`}>{icon}</span>
      </div>
      <div className="text-4xl font-bold text-white relative z-10 tracking-tight">
        {value}
      </div>
    </div>
  );
}
