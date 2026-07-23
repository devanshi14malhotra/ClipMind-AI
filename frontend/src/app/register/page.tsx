"use client";
import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("content_creator");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password strength logic
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (strengthScore < 3) {
      setError("Please choose a stronger password");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to register");
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

  const getStrengthColor = () => {
    if (password.length === 0) return "bg-white/10";
    if (strengthScore <= 1) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (strengthScore === 2) return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
    if (strengthScore === 3) return "bg-accent shadow-[0_0_10px_rgba(157,124,255,0.5)]";
    return "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"; // Very strong
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary font-sans selection:bg-primary/30 selection:text-white relative overflow-hidden">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-[#8b5cf6]/15 blur-[100px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#c026d3]/10 blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>
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
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Create an account</h2>
              <p className="text-sm text-text-secondary">
                Already have an account? <Link href="/login" className="text-accent hover:text-white font-medium transition-colors">Sign in</Link>
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0f0c1b] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
                  placeholder="Enter your full name"
                />
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
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f0c1b] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
                  placeholder="Create a strong password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Select Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#0f0c1b] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all appearance-none"
                >
                  <option value="content_creator">Content Creator</option>
                  <option value="learner">Learner</option>
                  <option value="educator">Educator</option>
                </select>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="pt-1 space-y-3">
                  <div className="flex gap-2 h-1.5">
                    <div className={`flex-1 rounded-full ${strengthScore >= 1 ? getStrengthColor() : 'bg-white/10'} transition-all duration-300`}></div>
                    <div className={`flex-1 rounded-full ${strengthScore >= 2 ? getStrengthColor() : 'bg-white/10'} transition-all duration-300`}></div>
                    <div className={`flex-1 rounded-full ${strengthScore >= 3 ? getStrengthColor() : 'bg-white/10'} transition-all duration-300`}></div>
                    <div className={`flex-1 rounded-full ${strengthScore >= 4 ? getStrengthColor() : 'bg-white/10'} transition-all duration-300`}></div>
                  </div>
                  <div className="text-[11px] text-text-secondary grid grid-cols-2 gap-2 pt-1 font-medium">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-accent' : ''}`}>
                       <CheckCircle2 className={`w-3 h-3 ${hasMinLength ? 'text-accent' : 'opacity-30'}`} /> 8+ characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-accent' : ''}`}>
                       <CheckCircle2 className={`w-3 h-3 ${hasUppercase ? 'text-accent' : 'opacity-30'}`} /> Uppercase
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-accent' : ''}`}>
                       <CheckCircle2 className={`w-3 h-3 ${hasNumber ? 'text-accent' : 'opacity-30'}`} /> Number
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-accent' : ''}`}>
                       <CheckCircle2 className={`w-3 h-3 ${hasSpecial ? 'text-accent' : 'opacity-30'}`} /> Special char
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl text-center mt-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={strengthScore < 3 || isLoading}
                className="w-full ai-gradient-bg text-white font-bold py-3.5 rounded-xl mt-6 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(139,92,246,0.4)]"
              >
                {isLoading ? "Creating account..." : "Start Free Trial"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
