"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadMethod, setUploadMethod] = useState<'local' | 'youtube'>('local');
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<string[]>([]);
  const [wantTranscript, setWantTranscript] = useState(true);
  const [wantSummary, setWantSummary] = useState(true);
  const [wantKeyMoments, setWantKeyMoments] = useState(true);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const fetchClassrooms = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("\${API_URL}/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          if (user.role === "educator") {
            const classRes = await fetch("\${API_URL}/api/classroom/educator", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (classRes.ok) {
              setClassrooms(await classRes.json());
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClassrooms();
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (uploadMethod === 'local' && !selectedFile) {
      alert("Please select a video file first!");
      return;
    }
    
    if (uploadMethod === 'youtube' && !youtubeUrl.trim()) {
      alert("Please enter a valid YouTube URL.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a video title.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("tags", tags.join(","));
    if (selectedClassroomId) {
      formData.append("classroom_id", selectedClassroomId);
    }

    setUploadProgress(10);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      let res;
      if (uploadMethod === 'local') {
        res = await fetch("\${API_URL}/api/video/upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData,
        });
      } else {
        res = await fetch("\${API_URL}/api/video/youtube", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: youtubeUrl,
            title: title,
            description: description,
            tags: tags.join(","),
            classroom_id: selectedClassroomId ? parseInt(selectedClassroomId) : null
          }),
        });
      }

      if (!res.ok) {
        let errText = "Unknown error";
        try {
            const errData = await res.json();
            errText = errData.detail || JSON.stringify(errData);
        } catch(e) {
            errText = await res.text();
        }
        throw new Error(`Upload failed (${res.status}): ${errText}`);
      }
      
      const data = await res.json();
      
      // Simulate progress bar completing
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setVideoId(data.video_id);
            return 100;
          }
          return prev + 20;
        });
      }, 500);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(0);
      alert("Upload failed. Make sure the backend is running.");
    }
  };

  const handleProcessVideo = async () => {
    if (!videoId) return;
    setIsProcessing(true);
    setProcessSteps(["Extracting audio & frames..."]);
    
    try {
      const token = localStorage.getItem("token");
      await fetch(`\${API_URL}/api/video/${videoId}/process`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          generate_transcript: wantTranscript,
          generate_summary: wantSummary,
          generate_key_moments: wantKeyMoments
        })
      });
      
      setTimeout(() => setProcessSteps(prev => [...prev, "Transcribing with Whisper AI..."]), 2000);
      setTimeout(() => setProcessSteps(prev => [...prev, "Generating Multi-Paragraph Summary..."]), 4500);
      
      const pollInterval = setInterval(async () => {
        const res = await fetch(`\${API_URL}/api/video/${videoId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const video = await res.json();
          if (video.status === "completed") {
            clearInterval(pollInterval);
            setProcessSteps(prev => [...prev, "Done! Redirecting..."]);
            setTimeout(() => router.push(`/dashboard/video/${videoId}`), 1000);
          } else if (video.status === "failed") {
            clearInterval(pollInterval);
            alert("Video processing failed. Please check the backend logs.");
            setIsProcessing(false);
          }
        } else if (res.status === 404) {
          clearInterval(pollInterval);
          alert("Video processing failed. The video was removed.");
          setIsProcessing(false);
          setVideoId(null);
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to start processing.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Upload Content</h1>
        <p className="text-text-secondary font-light">Analyze your media with precision AI insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Left Column */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Tabs */}
          {!videoId && (
            <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-1 gap-1 w-full max-w-sm">
              <button 
                onClick={() => setUploadMethod('local')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${uploadMethod === 'local' ? 'bg-white/10 text-white shadow-md' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                Local File
              </button>
              <button 
                onClick={() => setUploadMethod('youtube')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${uploadMethod === 'youtube' ? 'bg-[#ff0000]/20 text-[#ff0000] border border-[#ff0000]/30 shadow-md' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                YouTube
              </button>
            </div>
          )}

          {uploadMethod === 'local' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`upload-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-6 transition-all group glass-panel border-2 ${isDragging ? "border-accent bg-accent/5 glow-effect" : "border-white/10 hover:border-accent hover:bg-white/5"}`}
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='32' ry='32' stroke='%233F424D' stroke-width='2' stroke-dasharray='8%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")" }}
            >
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <span className="material-symbols-outlined text-4xl">cloud_upload</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">
                  {selectedFile ? selectedFile.name : "Drag & drop video files"}
                </h3>
                <p className="text-sm text-text-secondary">
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "Accepting MP4, MOV, AVI, WebM (Max 2GB)"}
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="mt-4 glass-panel border border-white/20 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95 shadow-lg"
              >
                {selectedFile ? "Change File" : "Browse Files"}
              </button>
            </div>
          ) : (
            <div className="glass-panel border border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-6 h-[400px]">
              <div className="w-24 h-24 rounded-full bg-[#ff0000]/10 flex items-center justify-center text-[#ff0000] shadow-[0_0_30px_rgba(255,0,0,0.15)] mb-2">
                <span className="material-symbols-outlined text-[48px]">smart_display</span>
              </div>
              <div className="space-y-2 w-full max-w-md">
                <h3 className="text-2xl font-bold text-white">Import from YouTube</h3>
                <p className="text-sm text-text-secondary mb-6">Paste a link to automatically download and process.</p>
                <div className="relative w-full group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-text-tertiary group-focus-within:text-[#ff0000] transition-colors">link</span>
                  <input 
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] transition-all placeholder:text-white/20 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {uploadProgress > 0 && !videoId && (
            <div className="glass-panel p-6 rounded-2xl space-y-4 glow-effect">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent animate-spin-slow">sync</span>
                  <span className="text-sm font-bold text-white">Uploading...</span>
                </div>
                <span className="text-accent font-bold text-lg">{uploadProgress}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full ai-gradient-bg rounded-full shadow-[0_0_15px_rgba(160,120,255,0.6)] transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-xs text-text-tertiary flex justify-between font-bold tracking-wide">
                <span>{uploadMethod === 'youtube' ? 'Processing...' : (selectedFile ? `${((uploadProgress / 100) * (selectedFile.size / (1024 * 1024))).toFixed(1)} MB of ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Uploading...")}</span>
                <span>{uploadProgress < 100 ? "Processing..." : "Complete"}</span>
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Right Column (Metadata & AI) */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            {videoId ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Upload Successful</h3>
                  <p className="text-text-secondary text-sm">Select the AI insights you want to generate.</p>
                </div>

                {!isProcessing ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div 
                        onClick={() => setWantTranscript(!wantTranscript)}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-start gap-4 relative overflow-hidden group ${wantTranscript ? 'border-accent bg-accent/10 shadow-[0_0_25px_rgba(139,92,246,0.2)]' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${wantTranscript ? 'border-accent bg-accent text-white' : 'border-white/30 text-transparent'}`}>
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold transition-colors ${wantTranscript ? 'text-white' : 'text-white/70'}`}>AI Transcript</h4>
                          <p className="text-sm text-text-tertiary mt-1">High-accuracy speech-to-text conversion with exact timestamps.</p>
                        </div>
                        {wantTranscript && <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[50px] -mr-10 -mt-10 rounded-full"></div>}
                      </div>

                      <div 
                        onClick={() => setWantSummary(!wantSummary)}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-start gap-4 relative overflow-hidden group ${wantSummary ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_25px_rgba(236,72,153,0.2)]' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${wantSummary ? 'border-pink-500 bg-pink-500 text-white' : 'border-white/30 text-transparent'}`}>
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold transition-colors ${wantSummary ? 'text-white' : 'text-white/70'}`}>AI Summary</h4>
                          <p className="text-sm text-text-tertiary mt-1">Automated multi-paragraph breakdown and key takeaways.</p>
                        </div>
                        {wantSummary && <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 blur-[50px] -mr-10 -mt-10 rounded-full"></div>}
                      </div>
                      <div 
                        onClick={() => setWantKeyMoments(!wantKeyMoments)}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-start gap-4 relative overflow-hidden group ${wantKeyMoments ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_25px_rgba(249,115,22,0.2)]' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${wantKeyMoments ? 'border-orange-500 bg-orange-500 text-white' : 'border-white/30 text-transparent'}`}>
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold transition-colors ${wantKeyMoments ? 'text-white' : 'text-white/70'}`}>Key Moments</h4>
                          <p className="text-sm text-text-tertiary mt-1">Automatically extract important timestamps and highlights.</p>
                        </div>
                        {wantKeyMoments && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[50px] -mr-10 -mt-10 rounded-full"></div>}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleProcessVideo}
                      disabled={!wantTranscript && !wantSummary && !wantKeyMoments}
                      className={`w-full text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all ${(!wantTranscript && !wantSummary && !wantKeyMoments) ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-[1.02] active:scale-95 shadow-[0_4px_20px_rgba(217,70,239,0.4)]'}`}
                    >
                      <span className="material-symbols-outlined">auto_awesome</span>
                      {(!wantTranscript && !wantSummary && !wantKeyMoments) ? 'Select an Option' : 'Run Analysis'}
                    </button>
                  </div>
                ) : (
                  <div className="glass-panel p-8 rounded-3xl border border-accent/20 relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-accent/5 to-transparent blur-3xl pointer-events-none"></div>
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin"></div>
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-accent">magic_button</span>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-6">AI is analyzing your video...</h4>
                    <div className="space-y-4 text-left bg-black/20 p-4 rounded-xl">
                      {processSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-4 text-sm animate-in slide-in-from-left-4 duration-300">
                          <span className="material-symbols-outlined text-green-400 text-lg shadow-[0_0_10px_rgba(74,222,128,0.5)] bg-green-400/10 rounded-full">check_circle</span>
                          <span className="text-white/90 font-medium">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Video Title <span className="text-red-500">*</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all" placeholder="Project marketing overview..." type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all resize-none" placeholder="Describe the content of your video..." rows={3}></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Tags</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-white/10 rounded-xl bg-white/5 min-h-[48px]">
                      {tags.map((tag, idx) => (
                        <span key={idx} className="bg-accent/20 text-accent font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 border border-accent/20">
                          #{tag} <span onClick={() => removeTag(tag)} className="material-symbols-outlined text-xs cursor-pointer hover:text-white">close</span>
                        </span>
                      ))}
                      <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-1 outline-none text-white placeholder-text-tertiary" placeholder="Type and press Enter to add tags..." type="text" />
                    </div>
                  </div>
                  
                  {classrooms.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Assign to Classroom (Optional)</label>
                      <select 
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-white outline-none transition-all appearance-none"
                      >
                        <option value="" className="bg-background text-white">None (Private Library)</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id} className="bg-background text-white">{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleUpload}
                  disabled={(uploadMethod === 'local' && !selectedFile) || (uploadMethod === 'youtube' && !youtubeUrl) || uploadProgress > 0}
                  className={`w-full text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(139,92,246,0.4)] transition-all mt-8 ${
                    ((uploadMethod === 'local' && !selectedFile) || (uploadMethod === 'youtube' && !youtubeUrl) || uploadProgress > 0) 
                      ? 'bg-white/10 cursor-not-allowed opacity-50 shadow-none' 
                      : (uploadMethod === 'youtube' ? 'bg-gradient-to-r from-[#ff0000] to-[#cc0000] hover:scale-[1.02] active:scale-95 shadow-[0_4px_20px_rgba(255,0,0,0.4)]' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-[1.02] active:scale-95')
                  }`}
                >
                  {uploadProgress > 0 ? (uploadMethod === 'youtube' ? 'Downloading...' : 'Uploading...') : (uploadMethod === 'youtube' ? 'Import YouTube Video' : 'Upload Video')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

