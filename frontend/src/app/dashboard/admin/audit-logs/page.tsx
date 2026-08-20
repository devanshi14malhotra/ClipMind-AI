"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch(`${API_URL}/api/admin/audit-logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
      else console.error("Failed to fetch audit logs");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Audit Logs</h1>
        <p className="text-text-secondary font-light">Comprehensive record of all platform activities and security events.</p>
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">User ID</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No audit logs available.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-text-tertiary font-mono text-sm whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 uppercase tracking-wider">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-accent font-bold">
                  {log.user_name || 'System'}
                </td>
                <td className="px-6 py-4 text-text-secondary text-sm">
                  {log.details || `Target: ${log.target_id || 'N/A'}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

