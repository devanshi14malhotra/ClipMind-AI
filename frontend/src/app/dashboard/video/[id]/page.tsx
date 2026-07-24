"use client";
import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function VideoSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [video, setVideo] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://127.0.0.1:8000/api/video/${resolvedParams.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      router.push("/dashboard");
    } catch (e) {
      console.error("Delete failed", e);
      setIsDeleting(false);
    }
  };

  const handleProcess = async () => {
    setIsProcessingLocal(true);
    setProcessStep(1); // Extracting Audio
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://127.0.0.1:8000/api/video/${resolvedParams.id}/process`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      // Simulate chain of thought progress
      setTimeout(() => setProcessStep(2), 3000); // Transcribing
      setTimeout(() => setProcessStep(3), 8000); // Summarizing
      setTimeout(() => {
        setVideo({...video, status: "completed"});
        window.location.reload(); // Refresh to fetch insights
      }, 14000);
      
    } catch (e) {
      console.error("Process failed", e);
      setIsProcessingLocal(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [videoRes, transcriptRes, summaryRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/video/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`http://127.0.0.1:8000/api/insights/transcript/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`http://127.0.0.1:8000/api/insights/summary/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${token}` } }),
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
  }, [resolvedParams.id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video) return <div className="p-8 text-white">Video not found.</div>;

  const isProcessing = video.status === "processing" || isProcessingLocal;
  const isUploaded = video.status === "uploaded" && !isProcessingLocal;

  const processStatusText = 
    processStep === 1 ? "Extracting Audio & Frames..." : 
    processStep === 2 ? "Transcribing with Whisper AI..." : 
    processStep === 3 ? "Generating Multi-Paragraph Summary..." : "Analyzing Video...";

  return (
    <div className="space-y-lg py-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
           <h1 className="font-headline-lg text-headline-lg text-white">{video.title || video.filename}</h1>
           <p className="text-text-secondary mt-1">{video.description}</p>
           {video.tags && (
             <div className="flex gap-2 mt-2">
               {video.tags.split(",").map((t: string) => (
                 <span key={t} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-text-tertiary">#{t.trim()}</span>
               ))}
             </div>
           )}
        </div>
        <button onClick={handleDelete} disabled={isDeleting} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-all">
          {isDeleting ? "Deleting..." : "Delete Video"}
        </button>
      </div>

      {/* Video Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Video Player */}
        <div className="lg:col-span-8 space-y-md">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-outline-variant shadow-2xl">
            <video 
              controls 
              className="w-full h-full object-contain"
              src={`http://127.0.0.1:8000/api/video/stream/${video.id}`}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="flex justify-between items-start bg-surface-container p-4 rounded-xl border border-white/5">
            <div>
              <p className="text-white font-bold flex items-center gap-2 capitalize">
                Status: <span className={video.status === 'completed' ? 'text-green-400' : 'text-accent animate-pulse'}>{isProcessingLocal ? 'Processing' : video.status}</span>
              </p>
            </div>
            {isUploaded && (
              <button onClick={handleProcess} className="ai-gradient-bg px-6 py-2 rounded-lg text-white font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-accent/20">
                <span className="material-symbols-outlined">auto_awesome</span> Generate AI Insights
              </button>
            )}
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
                  <p className="text-accent text-sm font-bold mb-4">{processStatusText}</p>
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
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:border-outline transition-all min-h-[300px]">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[64px]">bolt</span>
          </div>
          <h4 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            AI Detailed Summary
          </h4>
          
          {isProcessing ? (
             <div className="animate-pulse space-y-4 mt-8">
                <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-3/4"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-11/12 mt-6"></div>
                <div className="h-4 bg-outline-variant/30 rounded w-full"></div>
             </div>
          ) : isUploaded ? (
            <div className="text-center py-12">
               <span className="material-symbols-outlined text-6xl text-white/10 mb-4">analytics</span>
               <p className="text-text-secondary">Summary has not been generated yet.</p>
            </div>
          ) : (
            <div className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap max-w-4xl">
              {summary?.summary || "No summary available."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
