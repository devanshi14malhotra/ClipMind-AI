"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys">("profile");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      try {
        const res = await fetch("\${API_URL}/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setEditName(data.name);
        } else {
          router.push("/login");
        }
      } catch (e) { console.error(e); }
    };
    fetchUser();
    const storedKey = localStorage.getItem("custom_groq_api_key");
    if (storedKey) setGroqApiKey(storedKey);
  }, [router]);

  const getRoleDisplay = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setSaveMsg({ type: "error", text: "Name cannot be empty" }); return; }
    if (!currentPassword) { setSaveMsg({ type: "error", text: "Current password is required to save changes" }); return; }
    if (newPassword && newPassword !== confirmPassword) { setSaveMsg({ type: "error", text: "New passwords do not match" }); return; }

    setIsSaving(true);
    setSaveMsg(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("\${API_URL}/api/auth/me", {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), current_password: currentPassword, new_password: newPassword })
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSaveMsg({ type: "success", text: "Profile updated successfully!" });
      } else {
        const data = await res.json();
        setSaveMsg({ type: "error", text: data.detail || "Failed to update profile" });
      }
    } catch (e) {
      setSaveMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
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
            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-3 ${activeTab === "profile" ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">manage_accounts</span>
            Profile Settings
          </button>
          {user?.role !== "administrator" && (
            <button
              onClick={() => setActiveTab("apikeys")}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-3 ${activeTab === "apikeys" ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
            >
              <span className="material-symbols-outlined text-sm">key</span>
              API Keys
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="md:col-span-2 space-y-6">

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="glass-panel rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full ai-gradient-bg flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  {(editName || user?.name)?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{user?.name || "Loading..."}</h3>
                  <p className="text-accent uppercase tracking-widest text-xs font-bold mt-1">{getRoleDisplay(user?.role)}</p>
                  <p className="text-text-tertiary text-sm mt-1">{user?.email}</p>
                </div>
              </div>

              <hr className="border-white/10" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Full Name</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all hover:border-white/20"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    type="text"
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Email Address</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-tertiary outline-none cursor-not-allowed"
                    defaultValue={user?.email || ""}
                    type="email"
                    readOnly
                  />
                  <p className="text-xs text-text-tertiary">Email cannot be changed</p>
                </div>
              </div>

              <hr className="border-white/10" />

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Change Password</h4>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Current Password <span className="text-accent">*</span></label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    type="password"
                    placeholder="Required to save any changes"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">New Password</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      type="password"
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Confirm Password</label>
                    <input
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:ring-1 focus:border-accent text-white outline-none transition-all ${newPassword && newPassword !== confirmPassword ? 'border-red-500/50 focus:ring-red-500' : 'border-white/10 focus:ring-accent'}`}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      type="password"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              {saveMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${saveMsg.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  <span className="material-symbols-outlined text-sm">{saveMsg.type === "success" ? "check_circle" : "error"}</span>
                  {saveMsg.text}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="ai-gradient-bg text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  : <><span className="material-symbols-outlined text-sm">save</span> Save Changes</>
                }
              </button>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "apikeys" && user?.role !== "administrator" && (
            <div className="glass-panel rounded-2xl p-8 space-y-6">
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
        </div>
      </div>
    </div>
  );
}

