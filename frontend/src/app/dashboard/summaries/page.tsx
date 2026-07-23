"use client";
import React from "react";
import Link from "next/link";

export default function SummariesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Summaries</h1>
        <p className="text-text-secondary font-light">Review AI-generated executive summaries and action items.</p>
      </div>

      <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center glow-effect mt-8">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
          <span className="material-symbols-outlined text-5xl text-accent">auto_awesome</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-4">Coming in Milestone 2</h3>
        <p className="text-text-secondary mb-10 max-w-lg text-lg">We are building an NLP pipeline using Hugging Face transformers to generate concise summaries from your video transcripts.</p>
        <Link href="/dashboard" className="glass-panel border border-white/10 text-white font-bold py-4 px-10 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 text-lg">
          <span className="material-symbols-outlined">arrow_back</span> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
