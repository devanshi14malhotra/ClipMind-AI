"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VideoSummaryPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [videoRes, transcriptRes, summaryRes] = await Promise.all([
          fetch(`http://localhost:8000/api/video/${params.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`http://localhost:8000/api/insights/transcript/${params.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`http://localhost:8000/api/insights/summary/${params.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);

        if (videoRes.ok) setVideo(await videoRes.json());
        if (transcriptRes.ok) setTranscript(await transcriptRes.json());
        if (summaryRes.ok) setSummary(await summaryRes.json());
      } catch (e) {
        console.error("Error fetching video data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video) return <div className="p-8 text-white">Video not found.</div>;

  const isProcessing = video.status !== "completed";

  return (
    <div className="space-y-lg py-xl">
      {/* Video Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Video Player */}
        <div className="lg:col-span-8 space-y-md">
          <div className="relative aspect-video bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant group">
            {isProcessing && <div className="pulse-processing absolute top-0 left-0 z-10 w-full h-1 bg-gradient-to-r from-primary to-tertiary"></div>}
            
            <div className="w-full h-full bg-surface-container flex items-center justify-center">
               <span className="material-symbols-outlined text-white/20 text-[64px]">movie</span>
            </div>
            
            {/* Player Controls */}
            <div className="absolute bottom-4 left-4 right-4 h-12 bg-surface/80 backdrop-blur-md rounded-lg flex items-center px-md gap-md z-30 border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface cursor-pointer hover:text-primary">play_arrow</span>
              <div className="flex-1 h-1.5 bg-outline-variant/30 rounded-full relative">
                <div className="absolute inset-y-0 left-0 w-0 bg-primary rounded-full"></div>
              </div>
              <span className="text-label-md font-mono-code text-on-surface">00:00 / 00:00</span>
            </div>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{video.filename}</h1>
              <p className="text-on-surface-variant flex items-center gap-xs mt-1 capitalize">
                Status: {video.status}
              </p>
            </div>
          </div>
        </div>

        {/* Transcript / Key Moments Timeline */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col h-full max-h-[480px]">
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Transcript</h3>
              <span className="px-xs py-1 bg-tertiary/10 text-tertiary text-label-md rounded border border-tertiary/20">AI Identified</span>
            </div>
            <div className="flex-1 overflow-y-auto p-md space-y-md">
              {isProcessing ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-outline-variant/30 rounded w-3/4"></div>
                  <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
                  <div className="h-4 bg-outline-variant/30 rounded w-5/6"></div>
                </div>
              ) : transcript?.segments?.length > 0 ? (
                transcript.segments.map((seg: any, idx: number) => (
                  <div key={idx} className="flex gap-md group cursor-pointer hover:bg-surface-container-high p-sm rounded-lg transition-all border border-transparent hover:border-outline-variant">
                    <span className="font-mono-code text-primary bg-primary/10 px-sm py-xs rounded h-fit">
                      {new Date(seg.start * 1000).toISOString().substring(14, 19)}
                    </span>
                    <div className="space-y-xs text-body-sm text-on-surface-variant">
                      {seg.text}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-on-surface-variant text-sm">No transcript available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 gap-lg">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:border-outline transition-all">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[64px]">bolt</span>
          </div>
          <h4 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            AI Summary
          </h4>
          
          {isProcessing ? (
             <div className="animate-pulse space-y-2">
                <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-3/4"></div>
             </div>
          ) : (
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              {summary?.summary || "No summary available yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
