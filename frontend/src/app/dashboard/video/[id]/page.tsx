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
  const [currentTime, setCurrentTime] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
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

  const handleProcess = async (type: 'all' | 'summary' | 'transcript' = 'all') => {
    setIsProcessingLocal(true);
    setProcessStep(type === 'summary' ? 3 : (type === 'transcript' ? 2 : 1));
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://127.0.0.1:8000/api/video/${resolvedParams.id}/process`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          generate_transcript: type === 'all' || type === 'transcript',
          generate_summary: type === 'all' || type === 'summary'
        })
      });

      if (type === 'all') {
        setTimeout(() => setProcessStep(2), 3000);
        setTimeout(() => setProcessStep(3), 8000);
        setTimeout(() => {
          setVideo({ ...video, status: "completed" });
          window.location.reload();
        }, 14000);
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 8000);
      }

    } catch (e) {
      console.error("Process failed", e);
      setIsProcessingLocal(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const downloadTranscript = () => {
    if (!transcript?.segments) return;
    const text = transcript.segments.map((s: any) => `[${new Date(s.start * 1000).toISOString().substring(14, 19)}] ${s.text}`).join("\n");
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video?.title || 'transcript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSummary = () => {
    if (!summary?.summary) return;
    const blob = new Blob([summary.summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video?.title || 'summary'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/login");
        return;
      }
      setToken(storedToken);

      try {
        const [videoRes, transcriptRes, summaryRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/video/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${storedToken}` } }),
          fetch(`http://127.0.0.1:8000/api/insights/transcript/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${storedToken}` } }),
          fetch(`http://127.0.0.1:8000/api/insights/summary/${resolvedParams.id}`, { headers: { "Authorization": `Bearer ${storedToken}` } }),
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
    <div className="space-y-8 py-8 mt-4">
      <div className="flex justify-between items-center mb-8 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{video.title || video.filename}</h1>
          <p className="text-text-secondary mt-2 text-sm">{video.description}</p>
          {video.tags && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {video.tags.split(",").map((t: string) => (
                <span key={t} className="text-xs bg-accent/20 border border-accent/20 px-3 py-1.5 rounded-lg text-accent font-bold tracking-wide">#{t.trim()}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleDelete} disabled={isDeleting} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:scale-105 active:scale-95 flex items-center gap-2">
          <span className="material-symbols-outlined">delete</span>
          {isDeleting ? "Deleting..." : "Delete Video"}
        </button>
      </div>

      {/* Video Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-video bg-black/50 backdrop-blur-3xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(139,92,246,0.15)] glow-effect">
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              controls
              className="w-full h-full object-contain"
              src={token ? `http://127.0.0.1:8000/api/video/stream/${video.id}?token=${token}` : ''}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${video.status === 'completed' ? 'bg-green-400 text-green-400' : 'bg-accent text-accent animate-pulse'}`}></div>
              <p className="text-white font-bold tracking-wide capitalize flex items-center gap-2">
                Status: <span className={video.status === 'completed' ? 'text-green-400' : 'text-accent'}>{isProcessingLocal ? 'Processing' : video.status}</span>
              </p>
            </div>
            {isUploaded && (
              <button onClick={handleProcess} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl text-white font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(217,70,239,0.4)]">
                <span className="material-symbols-outlined text-xl">auto_awesome</span> Generate AI Insights
              </button>
            )}
          </div>
        </div>

        {/* Transcript / Key Moments Timeline */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-2xl flex flex-col h-full max-h-[600px] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent">subtitles</span>
                Transcript
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-accent/20 text-accent text-xs font-bold rounded-lg border border-accent/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]">AI Identified</span>
                {transcript?.segments?.length > 0 && !isProcessing && (
                  <button onClick={downloadTranscript} className="text-white hover:text-accent transition-colors ml-2" title="Download Transcript">
                    <span className="material-symbols-outlined text-xl">download</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {isProcessing ? (
                <div className="animate-pulse space-y-4 p-4">
                  <p className="text-accent text-sm font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin-slow">sync</span>
                    {processStatusText}
                  </p>
                  <div className="h-3 bg-white/10 rounded-full w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded-full w-full"></div>
                  <div className="h-3 bg-white/10 rounded-full w-5/6"></div>
                </div>
              ) : transcript?.segments?.length > 0 ? (
                transcript.segments.map((seg: any, idx: number) => {
                  const isActive = currentTime >= seg.start && currentTime <= seg.end;
                  return (
                    <div
                      key={idx}
                      onClick={() => seekTo(seg.start)}
                      className={`flex gap-4 group cursor-pointer p-4 rounded-xl transition-all border ${isActive ? 'bg-white/10 border-accent shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}
                    >
                      <span className={`font-mono px-2 py-1 rounded text-xs h-fit font-bold transition-colors ${isActive ? 'bg-accent text-white border-accent' : 'text-accent bg-accent/10 border-accent/20 group-hover:bg-accent/20'}`}>
                        {new Date(seg.start * 1000).toISOString().substring(14, 19)}
                      </span>
                      <div className={`text-sm transition-colors leading-relaxed ${isActive ? 'text-white font-medium' : 'text-text-secondary group-hover:text-white/90'}`}>
                        {seg.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <span className="material-symbols-outlined text-4xl mb-4 opacity-50 text-accent">speaker_notes_off</span>
                  <p className="text-white text-sm font-bold mb-2">No Transcript Available</p>
                  <p className="text-text-tertiary text-xs mb-4">You opted out of transcript generation.</p>
                  <button onClick={() => handleProcess('transcript')} className="bg-accent/20 text-accent border border-accent/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent hover:text-white transition-all shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
                    Generate Transcript Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-2xl p-8 relative overflow-hidden group transition-all min-h-[300px]">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-700">
            <span className="material-symbols-outlined text-[120px]">bolt</span>
          </div>
          <div className="flex justify-between items-start mb-6">
            <h4 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
              </div>
              AI Detailed Summary
            </h4>
            {summary?.summary && !isProcessing && (
              <button onClick={downloadSummary} className="glass-panel px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 relative z-20">
                <span className="material-symbols-outlined text-sm">download</span> Download
              </button>
            )}
          </div>

          {isProcessing ? (
            <div className="animate-pulse space-y-4 mt-8 max-w-4xl">
              <div className="h-3 bg-white/10 rounded-full w-full"></div>
              <div className="h-3 bg-white/10 rounded-full w-full"></div>
              <div className="h-3 bg-white/10 rounded-full w-3/4"></div>
              <div className="h-3 bg-white/10 rounded-full w-11/12 mt-8"></div>
              <div className="h-3 bg-white/10 rounded-full w-full"></div>
            </div>
          ) : isUploaded ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-50">
              <span className="material-symbols-outlined text-6xl mb-4">analytics</span>
              <p className="text-white text-lg font-bold">Summary has not been generated yet.</p>
              <p className="text-text-tertiary text-sm mt-2">Click "Generate AI Insights" above to start processing.</p>
            </div>
          ) : !summary?.summary ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-pink-500 mb-4 opacity-50">auto_awesome</span>
              <p className="text-white text-lg font-bold">No Summary Available</p>
              <p className="text-text-tertiary text-sm mt-2 mb-6 text-center max-w-md">You opted out of summary generation during upload. You can generate one now.</p>
              <button onClick={() => handleProcess('summary')} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl text-white font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_20px_rgba(217,70,239,0.4)]">
                Generate Summary Now
              </button>
            </div>
          ) : (
            <div className="text-lg text-text-secondary leading-loose whitespace-pre-wrap max-w-4xl relative z-10">
              {summary?.summary || "No summary available."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
