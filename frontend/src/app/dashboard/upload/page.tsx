"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    if (!selectedFile) {
      alert("Please select a video file first!");
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

    setUploadProgress(10);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/api/video/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        let errText = "Unknown error";
        try {
            const errData = await res.json();
            errText = errData.detail || JSON.stringify(errData);
        } catch(e) {
            errText = await res.text();
        }
        throw new Error(`Upload failed (${res.status}): ${errText}`);
      const data = await res.json();
      
      // Simulate progress bar completing
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => router.push(`/dashboard/video/${data.video_id}`), 500);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Upload Content</h1>
        <p className="text-text-secondary font-light">Analyze your media with precision AI insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Left Column */}
        <div className="lg:col-span-7 space-y-8">
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

          {uploadProgress > 0 && (
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
                <span>{(uploadProgress * 3.78).toFixed(1)} MB of 378.2 MB</span>
                <span>{uploadProgress < 100 ? "Processing..." : "Complete"}</span>
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Right Column (Metadata & AI) */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
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
            </div>
            
            <hr className="border-white/10" />
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">auto_awesome</span> AI Enhancements
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-4 cursor-pointer group hover:bg-white/5 p-3 rounded-xl transition-all border border-transparent hover:border-white/10">
                  <div className="relative flex items-center">
                    <input defaultChecked className="w-5 h-5 rounded border-white/20 text-accent focus:ring-accent focus:ring-offset-background bg-white/5 transition-all" type="checkbox" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Generate AI Transcript</span>
                    <span className="text-xs text-text-tertiary">Speech-to-text with 99% accuracy.</span>
                  </div>
                </label>
                <label className="flex items-center gap-4 cursor-pointer group hover:bg-white/5 p-3 rounded-xl transition-all border border-transparent hover:border-white/10">
                  <div className="relative flex items-center">
                    <input defaultChecked className="w-5 h-5 rounded border-white/20 text-accent focus:ring-accent focus:ring-offset-background bg-white/5 transition-all" type="checkbox" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Generate AI Summary</span>
                    <span className="text-xs text-text-tertiary">Automated bullet points and key takeaways.</span>
                  </div>
                </label>
              </div>
            </div>
            
            <button 
              onClick={handleUpload}
              disabled={!selectedFile || uploadProgress > 0}
              className={`w-full text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(139,92,246,0.4)] transition-all ${
                (!selectedFile || uploadProgress > 0) 
                  ? 'bg-white/10 cursor-not-allowed opacity-50' 
                  : 'ai-gradient-bg hover:brightness-110 active:scale-95 hover:scale-[1.02]'
              }`}
            >
              {uploadProgress > 0 ? 'Uploading...' : 'Upload and Analyze'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
