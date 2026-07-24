"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  const getRoleDisplay = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-text-secondary font-light">Manage your profile, preferences, and API keys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-1 space-y-4">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-white/10 text-white font-bold border border-white/10">Profile Settings</button>
          <button className="w-full text-left px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors">API Keys</button>
          <button className="w-full text-left px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors">Billing</button>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="glass-panel rounded-2xl p-8 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full ai-gradient-bg flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{user?.name || "Loading..."}</h3>
                <p className="text-accent uppercase tracking-widest text-xs font-bold mt-1">{getRoleDisplay(user?.role)}</p>
              </div>
            </div>

            <hr className="border-white/10" />

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Full Name</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all" defaultValue={user?.name || ""} type="text" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Email Address</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-tertiary outline-none cursor-not-allowed" defaultValue={user?.email || ""} type="email" readOnly />
              </div>
            </div>

            <button className="ai-gradient-bg text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:brightness-110 transition-all opacity-50 cursor-not-allowed">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
