"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Sparkles, Play, FileText, Zap, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeRole, setActiveRole] = useState("educator");
  const [activeStep, setActiveStep] = useState(1);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="bg-background text-text-primary min-h-screen font-sans selection:bg-primary/30 selection:text-white">
      {/* Dynamic Animated Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div style={{ y: y1 }} className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#8b5cf6]/20 blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></motion.div>
        <motion.div style={{ y: y2 }} className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#c026d3]/15 blur-[150px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></motion.div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-white/5 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight cursor-pointer flex items-center gap-2" onClick={() => scrollTo('top')}>
            <div className="w-8 h-8 rounded-lg ai-gradient-bg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            ClipMind AI
          </div>
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-text-secondary">
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors">How it Works</button>
            <button onClick={() => scrollTo('use-cases')} className="hover:text-white transition-colors">Use Cases</button>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hidden sm:block text-text-secondary font-medium hover:text-white transition-colors">Log In</Link>
            <Link href="/register" className="ai-gradient-bg text-white px-5 py-2.5 rounded-full font-bold hover:scale-105 transition-transform shadow-[0_4px_14px_rgba(139,92,246,0.4)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main id="top" className="relative z-10">
        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center min-h-screen justify-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full flex flex-col items-center"
          >
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-[80px] font-bold tracking-tight leading-[1.1] mb-8 text-white max-w-5xl mx-auto">
              Unlock the Intelligence <br className="hidden md:block" />
              <span className="ai-gradient-text">Within Your Videos</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-12 font-light">
              Transform long-form content into actionable insights with AI-powered summaries and key moment detection. Save hours of manual review.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
              <Link href="/register" className="w-full sm:w-auto ai-gradient-bg text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                Get Started for Free <ArrowRight className="w-5 h-5" />
              </Link>
              <button onClick={() => scrollTo('how-it-works')} className="w-full sm:w-auto glass-panel text-white px-8 py-4 rounded-xl font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2 group">
                <Play className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" /> Watch Demo
              </button>
            </motion.div>
          </motion.div>

          {/* AI Generated Mockup Image */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-24 w-full max-w-5xl mx-auto relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 top-1/2"></div>
            <div className="glass-panel p-2 md:p-3 rounded-2xl md:rounded-[2rem] shadow-[0_0_50px_rgba(139,92,246,0.15)] glow-effect relative z-0">
              <img
                src="/hero_dashboard.png"
                alt="ClipMind Dashboard Mockup"
                className="w-full h-auto rounded-xl md:rounded-[1.5rem] object-cover aspect-[16/9] border border-white/5 shadow-2xl"
              />
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20 max-w-2xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Powerful AI Capabilities</h2>
              <p className="text-lg text-text-secondary">Everything you need to digest hours of video in minutes.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <FileText className="w-7 h-7 text-accent" />, title: "Intelligent Summaries", desc: "Get concise, bulleted summaries of any video. Our AI identifies core themes, action items, and conclusions instantly." },
                { icon: <Zap className="w-7 h-7 text-accent" />, title: "Key Moment Detection", desc: "Automatically jump to the most important parts of a recording. No more scrubbing through timelines to find that one quote." },
                { icon: <Search className="w-7 h-7 text-accent" />, title: "Searchable Transcripts", desc: "Search your entire video library by keywords. Find exactly where a topic was discussed across multiple recordings." }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass-panel p-8 md:p-10 rounded-[2rem] glass-panel-hover group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-8 border border-accent/20 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed font-light">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="how-it-works" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="md:w-1/2"
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-12 text-white tracking-tight leading-tight">From Raw Video<br />to Insights in 3 Steps</h2>
                <div className="space-y-10">
                  {[
                    { step: 1, title: "Upload Video", desc: "Drag and drop any MP4, MOV, or link from YouTube/Zoom. We support all major formats and cloud sources." },
                    { step: 2, title: "AI Processing", desc: "Our proprietary ClipMind engine analyzes audio and visuals to generate transcription, summaries, and tags." },
                    { step: 3, title: "View Insights", desc: "Access your interactive dashboard. Export summaries to Slack, Notion, or Trello with a single click." }
                  ].map((item, idx) => {
                    const isActive = activeStep === item.step;
                    return (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.15 }}
                        className={`flex gap-6 group cursor-pointer transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setActiveStep(item.step)}
                      >
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all duration-500 ${isActive ? 'ai-gradient-bg text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'glass-panel text-white group-hover:bg-white/10'}`}>
                          {item.step}
                        </div>
                        <div>
                          <h4 className={`text-xl font-bold mb-2 transition-colors duration-500 ${isActive ? 'text-accent' : 'text-white'}`}>{item.title}</h4>
                          <p className="text-text-secondary leading-relaxed">{item.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, type: "spring" }}
                className="md:w-1/2 w-full"
              >
                <div className="glass-panel p-3 md:p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] glow-effect relative overflow-hidden group">
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]"></div>
                  <img
                    src="/workflow_workstation.png"
                    alt="ClipMind Workflow"
                    className="w-full h-auto aspect-square object-cover rounded-xl md:rounded-[1.5rem] border border-white/5 relative z-10"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Built for Everyone</h2>
              <p className="text-lg text-text-secondary">Tailored features depending on your role in the platform.</p>
            </motion.div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-6xl mx-auto py-10">
              {(() => {
                const roles = [
                  {
                    id: "content_creator",
                    title: "Content Creator",
                    desc: "For individuals and teams producing content.",
                    icon: "movie",
                    features: ["Upload & Manage Videos", "Auto-generate Summaries", "View Content Analytics", "Download AI Insights"]
                  },
                  {
                    id: "educator",
                    title: "Educator",
                    desc: "For teachers and institutions.",
                    icon: "school",
                    features: ["Edit Video Transcripts", "Generate Quizzes", "Create Study Guides", "Track Student Engagement"]
                  },
                  {
                    id: "learner",
                    title: "Learner",
                    desc: "For students consuming content.",
                    icon: "auto_stories",
                    features: ["Search Transcripts", "Jump to Key Moments", "Save Watch History", "Bookmark Highlights"]
                  }
                ];
                
                const activeIdx = roles.findIndex(r => r.id === activeRole);
                const leftIdx = (activeIdx - 1 + 3) % 3;
                const rightIdx = (activeIdx + 1) % 3;
                
                const orderedRoles = [roles[leftIdx], roles[activeIdx], roles[rightIdx]];

                return orderedRoles.map((role, idx) => {
                  const isCenter = idx === 1;

                  let positionClass = "";
                  if (isCenter) positionClass = "scale-[1.05] z-30 opacity-100 border-accent/40 shadow-[0_0_50px_rgba(139,92,246,0.3)] glow-effect bg-[#0f0f1a]";
                  else positionClass = "scale-90 z-10 opacity-60 hover:opacity-100 border-white/5 hover:border-white/20 bg-[#090710]";

                  return (
                    <motion.div
                      layout
                      key={role.id}
                      onClick={() => setActiveRole(role.id)}
                      className={`w-full max-w-sm glass-panel p-10 rounded-[2rem] flex flex-col h-[550px] cursor-pointer transition-all duration-500 ease-in-out relative ${positionClass}`}
                    >
                      {isCenter && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 ai-gradient-bg text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-[0_4px_10px_rgba(139,92,246,0.5)] whitespace-nowrap">
                          Recommended
                        </div>
                      )}
                      <h3 className="text-2xl font-bold mb-2 text-white">{role.title}</h3>
                      <p className="text-sm text-text-secondary mb-8">{role.desc}</p>
                      <div className="text-5xl font-bold text-white mb-10">
                        <span className={`material-symbols-outlined text-[60px] ${isCenter ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-accent"}`}>
                          {role.icon}
                        </span>
                      </div>
                      <ul className="space-y-5 mb-10 flex-1">
                        {role.features.map((feature, fIdx) => (
                          <li key={fIdx} className={`flex items-center gap-3 text-sm ${isCenter ? "text-white" : "text-text-secondary"}`}>
                            <CheckCircle2 className={`w-5 h-5 ${isCenter ? "text-accent drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" : "text-accent/50"}`} /> 
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                });
              })()}
            </div>

          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto px-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-10 text-white">Ready to Save Hours on Content Review?</h2>
            <Link href="/register" className="inline-flex ai-gradient-bg text-white px-10 py-5 rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-105 transition-transform">
              Join the Platform Today
            </Link>
            <p className="text-text-secondary mt-8 font-light">Join 5,000+ content creators and teams worldwide.</p>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#090710] py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-xl text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> ClipMind AI
          </div>
          <div className="flex gap-8 text-sm font-medium text-text-secondary">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-accent transition-colors">Contact Us</a>
          </div>
          <div className="text-sm text-text-tertiary">
            © 2026 ClipMind AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
