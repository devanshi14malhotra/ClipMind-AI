"use client";
import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to login");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary font-sans selection:bg-primary/30 selection:text-white relative overflow-hidden">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-[#8b5cf6]/15 blur-[100px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-[#c026d3]/10 blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="p-6 lg:p-8 relative z-10 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md fade-in-up">
          <div className="glass-panel p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] glow-effect">
            <div className="mb-10 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl ai-gradient-bg flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] mb-6">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Welcome back</h2>
              <p className="text-sm text-text-secondary">
                Don't have an account? <Link href="/register" className="text-accent hover:text-white font-medium transition-colors">Sign up</Link>
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Demo Logins */}
              <div className="mb-6 hidden">
                <p className="text-xs text-text-secondary text-center mb-3 uppercase tracking-wider font-semibold">Demo Accounts</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => {setEmail('admin@clipmind.com'); setPassword('admin123');}} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg transition-colors">Admin</button>
                  <button type="button" onClick={() => {setEmail('creator@clipmind.com'); setPassword('creator123');}} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg transition-colors">Content Creator</button>
                  <button type="button" onClick={() => {setEmail('learner@clipmind.com'); setPassword('learner123');}} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg transition-colors">Learner</button>
                  <button type="button" onClick={() => {setEmail('educator@clipmind.com'); setPassword('educator123');}} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg transition-colors">Educator</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f0c1b] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Password</label>
                   <a href="#" className="text-xs text-accent hover:text-white transition-colors">Forgot password?</a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f0c1b] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full ai-gradient-bg text-white font-bold py-3.5 rounded-xl mt-4 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_4px_14px_rgba(139,92,246,0.4)]"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

