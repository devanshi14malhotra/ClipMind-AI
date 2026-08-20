"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function PlatformActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      try {
        const res = await fetch(`${API_URL}/api/admin/audit-logs`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setLogs(await res.json());
        else router.push("/dashboard");
      } catch (e) { console.error(e); } 
      finally { setIsLoading(false); }
    };
    fetchLogs();
  }, [router]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">Audit Logs</h1>
        <p className="text-text-secondary font-light">Monitor system activity, access history, and RBAC enforcement.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>
      ) : logs.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-[2rem] p-16 text-center">
          <p className="text-white text-lg">No audit logs available.</p>
        </div>
      ) : (
        <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mt-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">User ID</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Target ID</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-text-secondary text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-text-secondary font-mono text-sm">
                    {log.user_id || "-"}
                  </td>
                  <td className="px-6 py-4 text-text-secondary font-mono text-sm">
                    {log.target_id || "-"}
                  </td>
                  <td className="px-6 py-4 text-text-tertiary text-sm">
                    {log.details || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

