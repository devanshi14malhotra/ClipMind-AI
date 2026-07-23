"use client";
import React from "react";
import Link from "next/link";

export default function BookmarksPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Bookmarks</h1>
        <p className="text-text-secondary font-light">Your saved summaries and learning highlights.</p>
      </div>

      <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center glow-effect mt-8">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
          <span className="material-symbols-outlined text-5xl text-accent">bookmark</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-4">No bookmarks yet</h3>
        <p className="text-text-secondary mb-10 max-w-lg text-lg">When you bookmark key moments from summaries or transcripts, they will appear here for easy studying.</p>
        <Link href="/dashboard" className="ai-gradient-bg text-white font-bold py-4 px-10 rounded-xl shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform flex items-center gap-2 text-lg">
          <span className="material-symbols-outlined">feed</span> Browse Learning Feed
        </Link>
      </div>
    </div>
  );
}
