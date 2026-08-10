"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys" | "billing">("profile");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setUser(await res.json());
        } else {
          router.push("/login");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
    
    // Load API Key from local storage if exists
    const storedKey = localStorage.getItem("custom_groq_api_key");
    if (storedKey) setGroqApiKey(storedKey);
  }, [router]);

  const getRoleDisplay = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("custom_groq_api_key", groqApiKey);
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-text-secondary font-light">Manage your profile, preferences, and API keys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1 space-y-4">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "profile" ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
          >
            Profile Settings
          </button>
          <button 
            onClick={() => setActiveTab("apikeys")}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "apikeys" ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
          >
            API Keys
          </button>
          <button 
            onClick={() => setActiveTab("billing")}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "billing" ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
          >
            Billing
          </button>
        </div>

        {/* Tab Content */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="glass-panel rounded-2xl p-8 space-y-8 animate-in fade-in duration-300">
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
                Save Changes (Demo Mode)
              </button>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "apikeys" && (
            <div className="glass-panel rounded-2xl p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-4 mb-2">
                <span className="material-symbols-outlined text-3xl text-accent">key</span>
                <h2 className="text-2xl font-bold text-white">Custom API Keys</h2>
              </div>
              <p className="text-text-secondary">
                To prevent exhausting the platform's shared API limits, you can provide your own API keys. These keys are securely stored locally on your device and are never saved to our database.
              </p>
              
              <hr className="border-white/10" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center justify-between">
                    <span>Groq API Key</span>
                    <span className="text-[10px] text-accent font-bold px-2 py-0.5 bg-accent/10 rounded-full">Used for AI Processing</span>
                  </label>
                  <input 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all placeholder:text-white/20 font-mono text-sm" 
                    placeholder="gsk_..." 
                    type="password" 
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                  />
                  <p className="text-xs text-text-tertiary mt-1">Get your free key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.groq.com</a></p>
                </div>
              </div>

              <button 
                onClick={handleSaveApiKey}
                className="ai-gradient-bg text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
              >
                {savedKey ? <><span className="material-symbols-outlined text-sm">check</span> Saved Locally</> : 'Save API Key'}
              </button>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="glass-panel border border-white/5 rounded-2xl p-16 text-center flex flex-col items-center justify-center glow-effect animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                <span className="material-symbols-outlined text-5xl text-accent">credit_card</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
              <p className="text-text-secondary mb-8 max-w-sm text-lg">Billing and subscription management is slated for a future update. For now, you are on the free early-access tier!</p>
              <div className="px-6 py-2 rounded-full border border-accent/30 bg-accent/5 text-accent font-bold text-sm tracking-widest uppercase">
                Free Tier Active
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
