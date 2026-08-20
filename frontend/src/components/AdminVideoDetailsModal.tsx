import React, { useEffect, useState } from 'react';
import { API_URL } from "@/lib/api";

export default function AdminVideoDetailsModal({ videoId, onClose }: { videoId: number, onClose: () => void }) {
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSections, setOpenSections] = useState({ transcript: false, summary: true, keywords: true });

  useEffect(() => {
    const fetchDetails = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/api/admin/videos/${videoId}/details`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setDetails(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [videoId]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const downloadTxt = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAllTxt = () => {
    if (!details?.summary) return;
    const s = details.summary;
    let content = `--- ${details.title || details.filename} ---\n\n`;
    content += `Status: ${details.status}\n`;
    content += `Created At: ${new Date(details.created_at).toLocaleString()}\n\n`;
    content += `=== SUMMARY ===\n${s.summary || 'N/A'}\n\n`;
    if (s.keywords && s.keywords.length) {
      content += `=== KEYWORDS ===\n${s.keywords.join(', ')}\n\n`;
    }
    content += `=== TRANSCRIPT ===\n${details.transcript?.full_text || 'N/A'}\n`;
    downloadTxt(content, `Report_${details.id}.txt`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[#0f0f15] border border-white/10 p-8 rounded-2xl max-w-md text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-red-400 mb-4">Error loading details</h2>
          <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">Close</button>
        </div>
      </div>
    );
  }

  const s = details.summary || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0f0f15] border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{details.title || details.filename}</h2>
            <div className="flex gap-4 text-sm text-text-tertiary">
              <span>Job #{details.id}</span>
              <span>•</span>
              <span className="capitalize text-accent">{details.status}</span>
              <span>•</span>
              <span>{new Date(details.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {details.status === 'completed' && (
              <button 
                onClick={downloadAllTxt}
                className="ai-gradient-bg text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform text-sm"
              >
                <span className="material-symbols-outlined text-sm">download</span> Download Full Report
              </button>
            )}
            <button 
              className="w-10 h-10 bg-white/5 rounded-full text-text-secondary flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!details.summary ? (
            <div className="text-center py-12 text-text-tertiary">
              <span className="material-symbols-outlined text-4xl mb-4 block">hourglass_empty</span>
              <p>No AI analysis data available yet. {details.status === 'processing' ? 'Currently processing...' : ''}</p>
            </div>
          ) : (
            <>
              {/* Keywords Section */}
              <div className="glass-panel border border-white/10 rounded-xl overflow-hidden">
                <div 
                  className="p-4 bg-white/5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition"
                  onClick={() => toggleSection('keywords')}
                >
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-accent">tag</span> Detected Keywords
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-tertiary">{openSections.keywords ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </div>
                {openSections.keywords && s.keywords && (
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {s.keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-bold border border-accent/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="glass-panel border border-white/10 rounded-xl overflow-hidden">
                <div 
                  className="p-4 bg-white/5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition"
                  onClick={() => toggleSection('summary')}
                >
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-accent">summarize</span> AI Summary
                  </h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadTxt(s.summary || '', `Summary_${details.id}.txt`); }}
                      className="text-text-tertiary hover:text-white p-1 rounded transition" title="Download Summary"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                    </button>
                    <span className="material-symbols-outlined text-text-tertiary">{openSections.summary ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </div>
                {openSections.summary && (
                  <div className="p-6">
                    <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">{s.summary || "No summary available."}</p>
                  </div>
                )}
              </div>

              {/* Transcript Section */}
              <div className="glass-panel border border-white/10 rounded-xl overflow-hidden">
                <div 
                  className="p-4 bg-white/5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition"
                  onClick={() => toggleSection('transcript')}
                >
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-accent">notes</span> Raw Transcript
                  </h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadTxt(details.transcript?.full_text || '', `Transcript_${details.id}.txt`); }}
                      className="text-text-tertiary hover:text-white p-1 rounded transition" title="Download Transcript"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                    </button>
                    <span className="material-symbols-outlined text-text-tertiary">{openSections.transcript ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </div>
                {openSections.transcript && (
                  <div className="p-6 bg-black/50">
                    <p className="text-text-secondary whitespace-pre-wrap font-mono text-sm leading-relaxed">{details.transcript?.full_text || "No transcript available."}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

