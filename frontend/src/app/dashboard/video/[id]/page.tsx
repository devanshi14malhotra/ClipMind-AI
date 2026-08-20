"use client";
import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────────────────
function downloadBlob(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Minimal PDF-like printable download using a hidden iframe
function downloadAsPdf(htmlContent: string, filename: string) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to download PDF."); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>${filename}</title>
    <style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#111;line-height:1.7}
    h1{color:#4a0e8f}h2{color:#6b21a8;border-bottom:2px solid #e9d5ff;padding-bottom:4px}
    .q{font-weight:bold;margin-top:16px}.opt{margin-left:16px;color:#555}.ans{color:#15803d;font-weight:bold}
    </style></head><body>${htmlContent}<script>window.print();window.close();</script></body></html>`);
  win.document.close();
}

export default function VideoSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [video, setVideo] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Granular per-section processing state — so regenerating ONE thing doesn't flash everything
  const [processingTranscript, setProcessingTranscript] = useState(false);
  const [processingSummary, setProcessingSummary] = useState(false);
  const [processingKeyMoments, setProcessingKeyMoments] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [isKeyMomentsExpanded, setIsKeyMomentsExpanded] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityPassword, setVisibilityPassword] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState<any[]>([]);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // Study Guide / Quiz state
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [generatingStudyGuide, setGeneratingStudyGuide] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [editingStudyGuide, setEditingStudyGuide] = useState(false);
  const [editedStudyGuide, setEditedStudyGuide] = useState<any>(null);
  const [editingQuiz, setEditingQuiz] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<any>(null);
  // Learner interactive quiz play state: { [questionIndex]: selectedOption | null }
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "studyguide" | "quiz">("overview");

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const router = useRouter();

  // ── actions ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/api/video/${resolvedParams.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/dashboard");
    } catch (e) {
      console.error("Delete failed", e);
      setIsDeleting(false);
    }
  };

  // Granular process — only regenerates what was requested
  const handleProcess = async (
    type: "all" | "summary" | "transcript" | "key_moments"
  ) => {
    const tok = localStorage.getItem("token");
    const doTranscript = type === "all" || type === "transcript";
    const doSummary = type === "all" || type === "summary";
    const doKeyMoments = type === "all" || type === "key_moments";

    if (doTranscript) setProcessingTranscript(true);
    if (doSummary) setProcessingSummary(true);
    if (doKeyMoments) setProcessingKeyMoments(true);

    try {
      await fetch(`${API_URL}/api/video/${resolvedParams.id}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          generate_transcript: doTranscript,
          generate_summary: doSummary,
          generate_key_moments: doKeyMoments,
        }),
      });

      // Poll until video status = completed (max ~60s)
      const pollUntilDone = async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await fetch(
            `${API_URL}/api/video/${resolvedParams.id}?t=${Date.now()}`,
            { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }
          );
          if (res.ok) {
            const v = await res.json();
            if (v.status === "completed") break;
          }
        }
        // Refresh only what was regenerated
        if (doTranscript || doSummary || doKeyMoments) {
          const [transRes, sumRes] = await Promise.all([
            doTranscript ? fetch(`${API_URL}/api/insights/transcript/${resolvedParams.id}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }) : Promise.resolve(null),
            (doSummary || doKeyMoments) ? fetch(`${API_URL}/api/insights/summary/${resolvedParams.id}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }) : Promise.resolve(null),
          ]);
          if (transRes?.ok) {
            const t = await transRes.json();
            setTranscript(t);
            if (t.segments) setEditedTranscript(t.segments);
          }
          if (sumRes?.ok) {
            const s = await sumRes.json();
            setSummary((prev: any) => ({
              ...prev,
              ...(doSummary ? { summary: s.summary, short_summary: s.short_summary, keywords: s.keywords } : {}),
              ...(doKeyMoments ? { key_moments: s.key_moments } : {}),
            }));
          }
        }
        if (doTranscript) setProcessingTranscript(false);
        if (doSummary) setProcessingSummary(false);
        if (doKeyMoments) setProcessingKeyMoments(false);
      };
      pollUntilDone();
    } catch (e) {
      console.error("Process failed", e);
      setProcessingTranscript(false);
      setProcessingSummary(false);
      setProcessingKeyMoments(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  // ── materials generation ──────────────────────────────────────────────────
  const generateMaterial = async (type: "quiz" | "study_guide") => {
    const tok = localStorage.getItem("token");
    if (type === "study_guide") setGeneratingStudyGuide(true);
    else setGeneratingQuiz(true);
    try {
      const res = await fetch(
        `${API_URL}/api/educator/video/${resolvedParams.id}/materials`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
          body: JSON.stringify(type),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (type === "study_guide") {
          setStudyGuide(data.data);
          setEditedStudyGuide(JSON.parse(JSON.stringify(data.data)));
          setActiveTab("studyguide");
        } else {
          setQuiz(data.data);
          setActiveTab("quiz");
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (type === "study_guide") setGeneratingStudyGuide(false);
    else setGeneratingQuiz(false);
  };

  const downloadStudyGuide = () => {
    if (!studyGuide) return;
    const sg = editingStudyGuide ? editedStudyGuide : studyGuide;
    let html = `<h1>${sg.title}</h1>`;
    sg.sections?.forEach((s: any) => {
      html += `<h2>${s.heading}</h2><p>${s.content}</p>`;
    });
    downloadAsPdf(html, `${video?.title || "study-guide"} Study Guide`);
  };

  const downloadQuiz = () => {
    if (!quiz) return;
    let html = `<h1>${quiz.title}</h1>`;
    quiz.questions?.forEach((q: any, i: number) => {
      html += `<p class="q">${i + 1}. ${q.q}</p>`;
      q.options?.forEach((o: string) => { html += `<p class="opt">○ ${o}</p>`; });
      html += `<p class="ans">✓ Answer: ${q.answer}</p>`;
    });
    downloadAsPdf(html, `${video?.title || "quiz"} Quiz`);
  };

  // ── data fetching ─────────────────────────────────────────────────────────
  const fetchVideoData = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) { router.push("/login"); return; }
    setToken(storedToken);
    try {
      const [videoRes, transcriptRes, summaryRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/video/${resolvedParams.id}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${storedToken}` }, cache: "no-store" }),
        fetch(`${API_URL}/api/insights/transcript/${resolvedParams.id}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${storedToken}` }, cache: "no-store" }),
        fetch(`${API_URL}/api/insights/summary/${resolvedParams.id}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${storedToken}` }, cache: "no-store" }),
        fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } }),
      ]);

      if (videoRes.ok) setVideo(await videoRes.json());
      if (transcriptRes.ok) {
        const t = await transcriptRes.json();
        setTranscript(t);
        if (t.segments) setEditedTranscript(t.segments);
      }
      if (summaryRes.ok) setSummary(await summaryRes.json());

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserRole(userData.role);
        if (userData.role === "learner") {
          fetch(`${API_URL}/api/learner/history/${resolvedParams.id}`, { method: "POST", headers: { Authorization: `Bearer ${storedToken}` } });
          fetch(`${API_URL}/api/learner/bookmarks`, { headers: { Authorization: `Bearer ${storedToken}` } })
            .then((r) => r.json())
            .then((data) => { if (data.some((v: any) => v.id.toString() === resolvedParams.id)) setIsBookmarked(true); });
        }
        // Educators/Admin: fetch existing materials
        if (userData.role === "educator" || userData.role === "administrator" || userData.role === "learner") {
          const matRes = await fetch(`${API_URL}/api/insights/materials/${resolvedParams.id}`, { headers: { Authorization: `Bearer ${storedToken}` } });
          if (matRes.ok) {
            const mats = await matRes.json();
            const sg = mats.find((m: any) => m.type === "study_guide");
            const qz = mats.find((m: any) => m.type === "quiz");
            if (sg) { setStudyGuide(sg.content); setEditedStudyGuide(JSON.parse(JSON.stringify(sg.content))); }
            if (qz) setQuiz(qz.content);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching video data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchVideoData(); }, [resolvedParams.id]);

  // ── loading / not found ───────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!video) return <div className="p-8 text-white">Video not found.</div>;

  const isUploaded = video.status === "uploaded" && !processingTranscript && !processingSummary && !processingKeyMoments;
  const anyProcessing = processingTranscript || processingSummary || processingKeyMoments;

  const isEducatorOrAdmin = userRole === "educator" || userRole === "administrator";
  const isCreatorOrAdmin = userRole === "content_creator" || userRole === "administrator";
  const canEdit = isCreatorOrAdmin || isEducatorOrAdmin;

  return (
    <div className="space-y-8 py-8 mt-4">

      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-8 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="flex-1 min-w-0 mr-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">{video.title || video.filename}</h1>
          <p className="text-text-secondary mt-2 text-sm">{video.description}</p>
          {video.tags && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {video.tags.split(",").map((t: string) => (
                <span key={t} className="text-xs bg-accent/20 border border-accent/20 px-3 py-1.5 rounded-lg text-accent font-bold tracking-wide">#{t.trim()}</span>
              ))}
            </div>
          )}
          {summary?.keywords && summary.keywords.length > 0 && !anyProcessing && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {summary.keywords.map((kw: string, idx: number) => (
                <span key={idx} className="text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-pink-500/30 px-3 py-1.5 rounded-lg text-white font-bold tracking-wide flex items-center gap-1 shadow-[0_0_10px_rgba(217,70,239,0.1)]">
                  <span className="material-symbols-outlined text-[14px] text-pink-400">local_fire_department</span>
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {userRole === "learner" && (
            <button onClick={async () => {
              const res = await fetch(`${API_URL}/api/learner/bookmark/${video.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
              if (res.ok) setIsBookmarked(!isBookmarked);
            }} className={`glass-panel border ${isBookmarked ? "border-accent text-accent" : "border-white/10 text-white"} px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}>
              <span className="material-symbols-outlined">{isBookmarked ? "bookmark" : "bookmark_border"}</span>
              {isBookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          )}

          {isEducatorOrAdmin && (
            <>
              <button
                onClick={async () => {
                  if (isEditingTranscript) {
                    try {
                      await fetch(`${API_URL}/api/educator/video/${video.id}/transcript`, {
                        method: "PUT",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify(editedTranscript),
                      });
                      setTranscript({ ...transcript, segments: editedTranscript });
                    } catch (e) { console.error(e); }
                  }
                  setIsEditingTranscript(!isEditingTranscript);
                }}
                className={`glass-panel border ${isEditingTranscript ? "border-accent text-accent" : "border-white/10 text-white"} px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2`}
              >
                <span className="material-symbols-outlined">{isEditingTranscript ? "save" : "edit"}</span>
                {isEditingTranscript ? "Save Transcript" : "Edit Transcript"}
              </button>
            </>
          )}

          {canEdit && (
            <>
              <button onClick={() => setShowVisibilityModal(true)} className="glass-panel border border-white/10 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                <span className="material-symbols-outlined">{video.visibility === "public" ? "public" : "lock"}</span>
                {video.visibility === "public" ? "Public" : "Private"}
              </button>
              {/* Extract Clip — only for content_creator and admin, NOT educator */}
              {isCreatorOrAdmin && !isEducatorOrAdmin && (
                <button onClick={() => alert("Extract clip coming soon")} className="glass-panel border border-white/10 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                  <span className="material-symbols-outlined">content_cut</span> Extract Clip
                </button>
              )}
              <button onClick={handleDelete} disabled={isDeleting} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                <span className="material-symbols-outlined">delete</span>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Visibility Modal ── */}
      {showVisibilityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Change Visibility</h3>
            <p className="text-sm text-text-secondary mb-6">Current: <strong>{video.visibility}</strong>. Enter your password to change to {video.visibility === "public" ? "private" : "public"}.</p>
            <input type="password" placeholder="Your Password" value={visibilityPassword} onChange={(e) => setVisibilityPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent outline-none mb-6" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowVisibilityModal(false)} className="px-5 py-2 rounded-xl text-white hover:bg-white/10">Cancel</button>
              <button onClick={async () => {
                const res = await fetch(`${API_URL}/api/video/${video.id}/visibility`, {
                  method: "PUT",
                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ visibility: video.visibility === "public" ? "private" : "public", password: visibilityPassword }),
                });
                if (res.ok) { setVideo({ ...video, visibility: video.visibility === "public" ? "private" : "public" }); setShowVisibilityModal(false); setVisibilityPassword(""); }
                else { const d = await res.json(); alert(d.detail); }
              }} className="ai-gradient-bg px-5 py-2 rounded-xl text-white font-bold">Confirm Change</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video + Transcript Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-video bg-black/50 backdrop-blur-3xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(139,92,246,0.15)] glow-effect">
            <video ref={videoRef} onTimeUpdate={handleTimeUpdate} controls className="w-full h-full object-contain"
              src={token ? `${API_URL}/api/video/stream/${video.id}?token=${token}` : ""}>
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${video.status === "completed" ? "bg-green-400 text-green-400" : "bg-accent text-accent animate-pulse"}`} />
              <p className="text-white font-bold tracking-wide capitalize">
                Status: <span className={anyProcessing ? "text-accent" : video.status === "completed" ? "text-green-400" : "text-accent"}>{anyProcessing ? "Processing..." : video.status}</span>
              </p>
            </div>
            {isUploaded && (
              <button onClick={() => handleProcess("all")} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl text-white font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(217,70,239,0.4)]">
                <span className="material-symbols-outlined text-xl">auto_awesome</span> Generate AI Insights
              </button>
            )}
          </div>
        </div>

        {/* Transcript Panel */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-2xl flex flex-col h-full max-h-[600px] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent">subtitles</span> Transcript
                </h3>
                <div className="flex items-center gap-2">
                  {transcript?.segments?.length > 0 && !processingTranscript && (
                    <>
                      <button onClick={() => {
                        const text = transcript.segments.map((s: any) => `[${new Date(s.start * 1000).toISOString().substring(14, 19)}] ${s.text}`).join("\n");
                        navigator.clipboard.writeText(text).then(() => alert("Copied!"));
                      }} title="Copy" className="text-white hover:text-accent transition-colors"><span className="material-symbols-outlined text-xl">content_copy</span></button>
                      <button onClick={() => {
                        const text = transcript.segments.map((s: any) => `[${new Date(s.start * 1000).toISOString().substring(14, 19)}] ${s.text}`).join("\n");
                        downloadBlob(text, `${video?.title || "transcript"}.txt`);
                      }} title="Download" className="text-white hover:text-accent transition-colors"><span className="material-symbols-outlined text-xl">download</span></button>
                    </>
                  )}
                </div>
              </div>
              {!isEditingTranscript && transcript?.segments?.length > 0 && (
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">search</span>
                  <input type="text" placeholder="Search in transcript..." value={transcriptSearch} onChange={(e) => setTranscriptSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {processingTranscript ? (
                <div className="animate-pulse space-y-4 p-4">
                  <p className="text-accent text-sm font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin-slow">sync</span> Transcribing with Whisper AI...
                  </p>
                  <div className="h-3 bg-white/10 rounded-full w-3/4" />
                  <div className="h-3 bg-white/10 rounded-full w-full" />
                  <div className="h-3 bg-white/10 rounded-full w-5/6" />
                </div>
              ) : transcript?.segments?.length > 0 ? (
                (isEditingTranscript ? editedTranscript : transcript.segments)
                  .filter((seg: any) => seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                  .map((seg: any, idx: number) => {
                    const isActive = !isEditingTranscript && currentTime >= seg.start && currentTime <= seg.end;
                    return (
                      <div key={idx} onClick={() => !isEditingTranscript && seekTo(seg.start)}
                        className={`flex gap-4 group ${!isEditingTranscript ? "cursor-pointer hover:bg-white/5 hover:border-white/10" : ""} p-4 rounded-xl transition-all border ${isActive ? "bg-white/10 border-accent shadow-[0_0_15px_rgba(139,92,246,0.2)]" : "border-transparent"}`}>
                        <span className={`font-mono px-2 py-1 rounded text-xs h-fit font-bold transition-colors ${isActive ? "bg-accent text-white border-accent" : "text-accent bg-accent/10 border-accent/20"}`}>
                          {new Date(seg.start * 1000).toISOString().substring(14, 19)}
                        </span>
                        {isEditingTranscript ? (
                          <textarea value={seg.text} onChange={(e) => { const n = [...editedTranscript]; n[idx].text = e.target.value; setEditedTranscript(n); }}
                            className="w-full bg-black/50 border border-white/20 rounded-lg text-white p-2 outline-none focus:border-accent text-sm" rows={2} />
                        ) : (
                          <div className={`text-sm transition-colors leading-relaxed ${isActive ? "text-white font-medium" : "text-text-secondary group-hover:text-white/90"}`}>{seg.text}</div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <span className="material-symbols-outlined text-4xl mb-4 opacity-50 text-accent">speaker_notes_off</span>
                  <p className="text-white text-sm font-bold mb-2">No Transcript Available</p>
                  <p className="text-text-tertiary text-xs mb-4">You opted out of transcript generation.</p>
                  <button onClick={() => handleProcess("transcript")} className="bg-accent/20 text-accent border border-accent/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent hover:text-white transition-all">
                    Generate Transcript Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs (Educator: always; Learner: only when materials exist) ── */}
      {(isEducatorOrAdmin || (userRole === "learner" && (studyGuide || quiz))) && (
        <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
          {(["overview", "studyguide", "quiz"] as const).map((tab) => {
            // Learners only see tabs that have content
            if (userRole === "learner" && tab === "studyguide" && !studyGuide) return null;
            if (userRole === "learner" && tab === "quiz" && !quiz) return null;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab ? "ai-gradient-bg text-white shadow-lg" : "text-text-secondary hover:text-white hover:bg-white/5"}`}>
                <span className="material-symbols-outlined text-base">
                  {tab === "overview" ? "analytics" : tab === "studyguide" ? "menu_book" : "quiz"}
                </span>
                {tab === "overview" ? "Overview & Summary" : tab === "studyguide" ? "Study Guide" : "Quiz"}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Overview & Summary Content ── */}
      {(activeTab === "overview") && (
        <div className="grid grid-cols-1 gap-8">
          {/* Key Moments */}
          {processingKeyMoments ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h4 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-xl animate-spin-slow">sync</span>
                </div>
                Generating Key Moments...
              </h4>
              <div className="animate-pulse space-y-4 max-w-4xl">
                <div className="h-24 bg-white/10 rounded-xl w-full" />
                <div className="h-24 bg-white/10 rounded-xl w-full" />
              </div>
            </div>
          ) : isUploaded ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center opacity-50">
              <p className="text-white text-lg font-bold">Key Moments have not been generated yet.</p>
            </div>
          ) : !summary?.key_moments || summary.key_moments.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-orange-500 mb-4 opacity-50">movie_filter</span>
              <p className="text-white text-lg font-bold">No Key Moments Available</p>
              <p className="text-text-tertiary text-sm mt-2 mb-6 max-w-md">You opted out of key moments generation. You can generate them now.</p>
              <button onClick={() => handleProcess("key_moments")} className="bg-gradient-to-r from-orange-400 to-red-500 px-8 py-3 rounded-xl text-white font-bold hover:scale-[1.02] transition-all shadow-lg">
                Generate Key Moments Now
              </button>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-2xl relative overflow-hidden">
              <div className="p-8 cursor-pointer flex items-center justify-between hover:bg-white/[0.02] transition-colors group/header"
                onClick={() => setIsKeyMomentsExpanded(!isKeyMomentsExpanded)}>
                <h4 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    <span className="material-symbols-outlined text-white text-xl">movie_filter</span>
                  </div>
                  Key Moments
                </h4>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); handleProcess("key_moments"); }}
                    className="text-white hover:text-accent transition-colors flex items-center gap-2 text-sm font-bold opacity-0 group-hover/header:opacity-100 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="material-symbols-outlined text-sm">refresh</span> Regenerate
                  </button>
                  <span className={`material-symbols-outlined text-white/50 text-3xl transition-transform duration-300 ${isKeyMomentsExpanded ? "rotate-180" : ""}`}>expand_more</span>
                </div>
              </div>
              <div className={`transition-all duration-500 ease-in-out ${isKeyMomentsExpanded ? "max-h-[2000px] opacity-100 px-8 pb-8" : "max-h-0 opacity-0 overflow-hidden"}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.key_moments.map((km: any, idx: number) => {
                    let seconds = 0;
                    if (km.time) { const p = km.time.split(":"); seconds = p.length === 2 ? parseInt(p[0]) * 60 + parseInt(p[1]) : 0; }
                    return (
                      <div key={idx} onClick={() => setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="glass-panel border border-white/10 p-5 rounded-2xl hover:bg-white/10 hover:border-accent/50 transition-all cursor-pointer group shadow-lg flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h6 className="font-bold text-white group-hover:text-accent transition-colors leading-tight pr-2 flex items-center gap-2">
                            {km.title}
                            <span className={`material-symbols-outlined text-white/50 text-sm transition-transform duration-300 ${expandedCards[idx] ? "rotate-180" : ""}`}>expand_more</span>
                          </h6>
                          <button onClick={(e) => { e.stopPropagation(); seekTo(seconds); }} title="Play from this moment"
                            className="bg-accent/20 hover:bg-accent hover:text-white transition-colors text-accent text-xs font-mono px-2 py-1 rounded-md shrink-0 border border-accent/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">play_circle</span>{km.time}
                          </button>
                        </div>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCards[idx] ? "max-h-[500px] mt-2 opacity-100" : "max-h-0 opacity-0"}`}>
                          <p className="text-sm text-text-tertiary leading-relaxed">{km.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Brief Overview (short summary — always shown, never "TL;DR") */}
          {(summary?.short_summary || processingSummary) && (
            <div className="bg-white/5 backdrop-blur-xl border border-accent/20 shadow-[0_4px_24px_rgba(139,92,246,0.15)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  <span className="material-symbols-outlined text-white text-xl">bolt</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Brief Overview</h4>
                  <p className="text-xs text-text-tertiary">2-3 sentence snapshot of the video</p>
                </div>
                {!processingSummary && (
                  <button onClick={() => handleProcess("summary")} title="Regenerate Brief Overview"
                    className="ml-auto text-white/50 hover:text-accent transition-colors">
                    <span className="material-symbols-outlined text-base">refresh</span>
                  </button>
                )}
              </div>
              {processingSummary ? (
                <div className="animate-pulse space-y-3 mt-4 relative z-10">
                  <div className="h-3 bg-white/10 rounded-full w-full" />
                  <div className="h-3 bg-white/10 rounded-full w-4/5" />
                </div>
              ) : (
                <p className="text-lg text-white font-medium leading-relaxed relative z-10">{summary?.short_summary}</p>
              )}
            </div>
          )}

          {/* Detailed Summary */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-2xl p-8 relative overflow-hidden group transition-all min-h-[300px]">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-700">
              <span className="material-symbols-outlined text-[120px]">auto_awesome</span>
            </div>
            <div className="flex justify-between items-start mb-6">
              <h4 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                  <span className="material-symbols-outlined text-white text-xl">article</span>
                </div>
                AI Detailed Summary
              </h4>
              {summary?.summary && !processingSummary && (
                <div className="flex items-center gap-2 relative z-20">
                  <button onClick={() => { if (!processingSummary) handleProcess("summary"); }}
                    className="glass-panel px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">refresh</span> Regenerate
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(summary.summary).then(() => alert("Copied!"))}
                    className="glass-panel px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => downloadBlob(summary.summary, `${video?.title || "summary"}.txt`)}
                    className="glass-panel px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">download</span> Download
                  </button>
                </div>
              )}
            </div>
            {processingSummary ? (
              <div className="animate-pulse space-y-4 mt-8 max-w-4xl">
                <div className="h-3 bg-white/10 rounded-full w-full" />
                <div className="h-3 bg-white/10 rounded-full w-full" />
                <div className="h-3 bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-white/10 rounded-full w-11/12 mt-8" />
                <div className="h-3 bg-white/10 rounded-full w-full" />
              </div>
            ) : isUploaded ? (
              <div className="flex flex-col items-center justify-center py-16 opacity-50">
                <span className="material-symbols-outlined text-6xl mb-4">analytics</span>
                <p className="text-white text-lg font-bold">Summary has not been generated yet.</p>
                <p className="text-text-tertiary text-sm mt-2">Click "Generate AI Insights" above to start.</p>
              </div>
            ) : !summary?.summary ? (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="material-symbols-outlined text-6xl text-pink-500 mb-4 opacity-50">auto_awesome</span>
                <p className="text-white text-lg font-bold">No Summary Available</p>
                <p className="text-text-tertiary text-sm mt-2 mb-6 max-w-md text-center">You opted out of summary generation. You can generate one now.</p>
                <button onClick={() => handleProcess("summary")} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-xl text-white font-bold hover:scale-[1.02] transition-all shadow-[0_4px_20px_rgba(217,70,239,0.4)]">
                  Generate Summary Now
                </button>
              </div>
            ) : (
              <div className="text-lg text-text-secondary leading-loose whitespace-pre-wrap max-w-4xl relative z-10">{summary.summary}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Study Guide Tab ── */}
      {activeTab === "studyguide" && (studyGuide || isEducatorOrAdmin) && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">menu_book</span>
              </div>
              Study Guide
            </h4>
            {/* Educator-only controls */}
            {isEducatorOrAdmin && (
              <div className="flex items-center gap-2">
                {studyGuide && (
                  <>
                    {editingStudyGuide ? (
                      <>
                        <button onClick={() => { setEditingStudyGuide(false); setEditedStudyGuide(JSON.parse(JSON.stringify(studyGuide))); }}
                          className="glass-panel border border-white/10 text-white/70 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">close</span> Cancel
                        </button>
                        <button onClick={() => { setStudyGuide(JSON.parse(JSON.stringify(editedStudyGuide))); setEditingStudyGuide(false); }}
                          className="glass-panel border border-accent text-accent px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">save</span> Save Edits
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingStudyGuide(true); setEditedStudyGuide(JSON.parse(JSON.stringify(studyGuide))); }}
                        className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">edit</span> Edit
                      </button>
                    )}
                    <button onClick={downloadStudyGuide}
                      className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">download</span> Download PDF
                    </button>
                  </>
                )}
                <button onClick={() => generateMaterial("study_guide")} disabled={generatingStudyGuide}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 rounded-xl text-white font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">{generatingStudyGuide ? "sync" : "auto_awesome"}</span>
                  {generatingStudyGuide ? "Generating..." : studyGuide ? "Regenerate" : "Generate Study Guide"}
                </button>
              </div>
            )}
            {/* Learner: download only */}
            {userRole === "learner" && studyGuide && (
              <button onClick={downloadStudyGuide}
                className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span> Download PDF
              </button>
            )}
          </div>

          {generatingStudyGuide ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/10 rounded w-full" />
              <div className="h-3 bg-white/10 rounded w-4/5" />
              <div className="h-3 bg-white/10 rounded w-full" />
            </div>
          ) : studyGuide ? (
            <div className="space-y-6">
              <h5 className="text-xl font-bold text-white">{editingStudyGuide ? editedStudyGuide?.title : studyGuide?.title}</h5>
              {(editingStudyGuide ? editedStudyGuide?.sections : studyGuide?.sections)?.map((sec: any, i: number) => (
                <div key={i} className="glass-panel border border-white/10 p-6 rounded-2xl space-y-3">
                  {editingStudyGuide ? (
                    <>
                      <input value={sec.heading} onChange={(e) => {
                        const ns = JSON.parse(JSON.stringify(editedStudyGuide));
                        ns.sections[i].heading = e.target.value;
                        setEditedStudyGuide(ns);
                      }} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-accent text-lg" />
                      <textarea value={sec.content} rows={5} onChange={(e) => {
                        const ns = JSON.parse(JSON.stringify(editedStudyGuide));
                        ns.sections[i].content = e.target.value;
                        setEditedStudyGuide(ns);
                      }} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-text-secondary outline-none focus:border-accent text-sm resize-y" />
                    </>
                  ) : (
                    <>
                      <h6 className="text-lg font-bold text-white">{sec.heading}</h6>
                      <p className="text-text-secondary leading-relaxed text-sm">{sec.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-emerald-400 mb-4 opacity-40">menu_book</span>
              <p className="text-white text-lg font-bold">No Study Guide Yet</p>
              <p className="text-text-tertiary text-sm mt-2">Click "Generate Study Guide" to have AI create comprehensive study notes from this video&apos;s transcript.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Quiz Tab ── */}
      {activeTab === "quiz" && (quiz || isEducatorOrAdmin) && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h4 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">quiz</span>
              </div>
              Quiz
              {userRole === "learner" && quiz && quizSubmitted && (
                <span className="text-sm font-normal text-text-secondary ml-2">
                  Score: <span className="text-green-400 font-bold">
                    {quiz.questions?.filter((q: any, i: number) => quizAnswers[i] === q.answer).length}
                  </span>/{quiz.questions?.length}
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Learner: play/retry */}
              {userRole === "learner" && quiz && (
                <>
                  {quizSubmitted ? (
                    <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                      className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">replay</span> Retry Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < (quiz.questions?.length ?? 0)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2 rounded-xl text-white font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-40">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Submit ({Object.keys(quizAnswers).length}/{quiz.questions?.length})
                    </button>
                  )}
                  <button onClick={downloadQuiz}
                    className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">download</span> Download
                  </button>
                </>
              )}
              {/* Educator: edit + generate */}
              {isEducatorOrAdmin && quiz && (
                <>
                  {editingQuiz ? (
                    <>
                      <button onClick={() => { setEditingQuiz(false); setEditedQuiz(JSON.parse(JSON.stringify(quiz))); }}
                        className="glass-panel border border-white/10 text-white/70 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">close</span> Cancel
                      </button>
                      <button onClick={() => { setQuiz(JSON.parse(JSON.stringify(editedQuiz))); setEditingQuiz(false); }}
                        className="glass-panel border border-accent text-accent px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">save</span> Save Edits
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingQuiz(true); setEditedQuiz(JSON.parse(JSON.stringify(quiz))); }}
                      className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">edit</span> Edit
                    </button>
                  )}
                  <button onClick={downloadQuiz}
                    className="glass-panel border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">download</span> Download PDF
                  </button>
                </>
              )}
              {isEducatorOrAdmin && (
                <button onClick={() => generateMaterial("quiz")} disabled={generatingQuiz}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2 rounded-xl text-white font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">{generatingQuiz ? "sync" : "auto_awesome"}</span>
                  {generatingQuiz ? "Generating..." : quiz ? "Regenerate" : "Generate Quiz"}
                </button>
              )}
            </div>
          </div>

          {generatingQuiz ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-white/10 rounded w-1/3" />
              <div className="h-24 bg-white/10 rounded" />
              <div className="h-24 bg-white/10 rounded" />
            </div>
          ) : quiz ? (
            <div className="space-y-6">
              {/* ── Educator edit mode ── */}
              {editingQuiz && isEducatorOrAdmin ? (
                <>
                  <input value={editedQuiz?.title ?? ""} onChange={e => {
                    const nq = JSON.parse(JSON.stringify(editedQuiz));
                    nq.title = e.target.value;
                    setEditedQuiz(nq);
                  }} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-accent text-xl" />
                  {editedQuiz?.questions?.map((q: any, i: number) => (
                    <div key={i} className="glass-panel border border-white/10 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-accent font-bold text-sm shrink-0">{i + 1}.</span>
                        <input value={q.q} onChange={e => {
                          const nq = JSON.parse(JSON.stringify(editedQuiz));
                          nq.questions[i].q = e.target.value;
                          setEditedQuiz(nq);
                        }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-accent text-sm" />
                      </div>
                      <div className="space-y-2">
                        {q.options?.map((opt: string, j: number) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-all ${q.answer === opt ? "bg-green-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                              onClick={() => {
                                const nq = JSON.parse(JSON.stringify(editedQuiz));
                                nq.questions[i].answer = opt;
                                setEditedQuiz(nq);
                              }}
                              title="Click to mark as correct answer"
                            >{String.fromCharCode(65 + j)}</span>
                            <input value={opt} onChange={e => {
                              const nq = JSON.parse(JSON.stringify(editedQuiz));
                              const wasAnswer = nq.questions[i].answer === opt;
                              nq.questions[i].options[j] = e.target.value;
                              if (wasAnswer) nq.questions[i].answer = e.target.value;
                              setEditedQuiz(nq);
                            }} className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent" />
                            {q.answer === opt && <span className="text-green-400 text-xs font-bold shrink-0">✓ Correct</span>}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-text-tertiary">Click a letter to mark it as the correct answer.</p>
                    </div>
                  ))}
                </>
              ) : (
                /* ── Read / Play mode ── */
                <>
                  <h5 className="text-xl font-bold text-white">{quiz.title}</h5>
                  {quiz.questions?.map((q: any, i: number) => {
                    const selected = quizAnswers[i] ?? null;
                    const isCorrect = selected === q.answer;
                    const showResult = quizSubmitted && selected !== null;
                    return (
                      <div key={i} className="glass-panel border border-white/10 p-6 rounded-2xl space-y-4">
                        <p className="text-white font-bold text-base">{i + 1}. {q.q}</p>
                        <div className="space-y-2">
                          {q.options?.map((opt: string, j: number) => {
                            const isSelected = selected === opt;
                            const isAnswer = opt === q.answer;
                            let cls = "border-white/10 text-text-secondary hover:border-white/30 hover:bg-white/5 cursor-pointer";
                            if (userRole === "learner" && !quizSubmitted) {
                              cls = isSelected
                                ? "border-accent bg-accent/20 text-white"
                                : "border-white/10 text-text-secondary hover:border-accent/50 hover:bg-white/5 cursor-pointer";
                            } else if (showResult) {
                              if (isAnswer) cls = "border-green-500/60 bg-green-500/15 text-green-300";
                              else if (isSelected && !isCorrect) cls = "border-red-500/60 bg-red-500/10 text-red-300";
                              else cls = "border-white/10 text-text-secondary opacity-50";
                            } else if (isEducatorOrAdmin) {
                              // educator view mode: show answers
                              cls = isAnswer ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-white/10 text-text-secondary";
                            }
                            return (
                              <div key={j}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${cls}`}
                                onClick={() => {
                                  if (userRole === "learner" && !quizSubmitted) {
                                    setQuizAnswers(prev => ({ ...prev, [i]: opt }));
                                  }
                                }}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                  showResult && isAnswer ? "bg-green-500 text-white" :
                                  showResult && isSelected && !isCorrect ? "bg-red-500 text-white" :
                                  isSelected && !quizSubmitted ? "bg-accent text-white" :
                                  "bg-white/10 text-white"
                                }`}>{String.fromCharCode(65 + j)}</span>
                                {opt}
                                {showResult && isAnswer && <span className="ml-auto text-green-400 text-xs font-bold">✓ Correct</span>}
                                {showResult && isSelected && !isCorrect && <span className="ml-auto text-red-400 text-xs font-bold">✗ Wrong</span>}
                                {!quizSubmitted && isEducatorOrAdmin && isAnswer && <span className="ml-auto text-green-400 text-xs font-bold">✓ Answer</span>}
                              </div>
                            );
                          })}
                        </div>
                        {showResult && !isCorrect && (
                          <p className="text-sm text-text-tertiary">Correct answer: <span className="text-green-400 font-bold">{q.answer}</span></p>
                        )}
                      </div>
                    );
                  })}
                  {/* Final score banner for learner after submit */}
                  {userRole === "learner" && quizSubmitted && (() => {
                    const correct = quiz.questions?.filter((q: any, i: number) => quizAnswers[i] === q.answer).length ?? 0;
                    const total = quiz.questions?.length ?? 0;
                    const pct = Math.round((correct / total) * 100);
                    return (
                      <div className={`p-6 rounded-2xl border text-center ${
                        pct >= 80 ? "border-green-500/40 bg-green-500/10" :
                        pct >= 50 ? "border-yellow-500/40 bg-yellow-500/10" :
                        "border-red-500/40 bg-red-500/10"
                      }`}>
                        <p className="text-2xl font-black text-white">{pct >= 80 ? "🎉" : pct >= 50 ? "📚" : "💪"} {correct}/{total} — {pct}%</p>
                        <p className="text-text-secondary text-sm mt-1">
                          {pct >= 80 ? "Excellent! You've mastered this material." :
                           pct >= 50 ? "Good effort! Review the missed questions." :
                           "Keep studying — you'll get it!"}
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-blue-400 mb-4 opacity-40">quiz</span>
              <p className="text-white text-lg font-bold">No Quiz Yet</p>
              <p className="text-text-tertiary text-sm mt-2">Click &quot;Generate Quiz&quot; to have AI create a multiple-choice quiz from this video&apos;s content.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
