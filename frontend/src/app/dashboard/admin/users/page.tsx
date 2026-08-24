"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers(); // Refresh the list
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to completely delete this user and all their associated data? This cannot be undone.")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Failed to delete user.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 mt-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">User Management</h1>
        <p className="text-text-secondary font-light">Manage platform users, assign roles, and monitor activity.</p>
      </div>

      <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Email Address</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Role Assignment</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-text-secondary">Loading users...</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full ai-gradient-bg flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-white">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">{user.email}</td>
                <td className="px-6 py-4">
                  {user.role === 'administrator' ? (
                    <span className="text-white px-3 py-2 opacity-70">Administrator</span>
                  ) : (
                    <select 
                        className="bg-black/50 border border-white/10 rounded-lg text-white px-3 py-2 outline-none focus:border-accent capitalize"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        <option value={user.role}>
                          {user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </option>
                        <option value="administrator">Administrator</option>
                        <option value="content_creator">Content Creator</option>
                        <option value="educator">Educator</option>
                        <option value="learner">Learner</option>
                      </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.role !== 'administrator' && (
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      title="Delete User"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

