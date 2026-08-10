"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          router.push("/login");
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Define sidebar links based on role
  const getSidebarLinks = () => {
    const role = user?.role || "content_creator";
    
    const commonSettings = { href: "/dashboard/settings", icon: "settings", label: "Settings" };
    const topicsLibrary = { href: "/dashboard/topics", icon: "library_books", label: "Topics Library" };
    const analyticsDash = { href: "/dashboard/analytics", icon: "analytics", label: "Analytics" };
    const myLibrary = { href: "/dashboard", icon: "video_library", label: "My Library" };
    
    switch (role) {
      case "administrator":
        return [
          myLibrary,
          analyticsDash,
          topicsLibrary,
          { href: "/dashboard/admin/users", icon: "manage_accounts", label: "User Management" },
          { href: "/dashboard/admin/activity", icon: "monitoring", label: "Platform Activity" },
          commonSettings
        ];
      case "learner":
      case "educator":
      case "content_creator":
      default:
        return [
          myLibrary,
          analyticsDash,
          topicsLibrary,
          commonSettings
        ];
    }
  };

  const sidebarLinks = getSidebarLinks();
  const canUpload = true;

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background font-body-md selection:bg-primary/30">
      {/* TopNavBar */}
      <header className="glass-panel w-full sticky top-0 z-50 border-b border-white/5 rounded-none">
        <div className="flex justify-between items-center px-6 lg:px-8 py-4 w-full h-16">
          <div className="flex items-center gap-4 lg:gap-8 min-w-max">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white tracking-tight shrink-0">
              <div className="w-8 h-8 rounded-lg ai-gradient-bg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
              </div>
              <span className="hidden sm:block">ClipMind AI</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 ml-4">
              <Link href="/dashboard" className={`font-bold pb-1 text-sm transition-colors duration-200 ${pathname === "/dashboard" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-white"}`}>Dashboard</Link>
            </nav>
          </div>
          
          <div className="flex-1"></div>
          
          <div className="flex items-center gap-4 shrink-0 justify-end">
            {canUpload && (
              <Link href="/dashboard/upload" className="hidden sm:flex ai-gradient-bg text-white font-bold py-1.5 px-4 rounded-full items-center gap-2 shadow-[0_2px_10px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-95 transition-all text-sm">
                <span className="material-symbols-outlined text-sm">upload</span> Upload
              </Link>
            )}
            
            <div className="relative group hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">search</span>
              <input className="glass-panel border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-body-sm text-white focus:outline-none focus:border-accent w-64 transition-all placeholder-text-tertiary" placeholder="Search insights..." type="text" />
            </div>
            
            <Link href="/dashboard/settings" className="flex items-center gap-sm cursor-pointer group glass-panel px-4 py-1.5 rounded-full hover:bg-white/5 transition-colors border-white/5">
              <div className="w-8 h-8 rounded-full ai-gradient-bg flex items-center justify-center text-white overflow-hidden shadow-[0_0_10px_rgba(139,92,246,0.4)]">
                <span className="text-sm font-bold">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-label-md font-bold text-white leading-none">{user?.name || "Loading..."}</span>
                <span className="text-[10px] text-accent uppercase tracking-wider">{getRoleDisplay(user?.role)}</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full max-w-[1600px] mx-auto">
        {/* SideNavBar */}
        <aside className={`h-[calc(100vh-64px)] sticky top-16 glass-panel border-r border-white/5 border-l-0 border-t-0 border-b-0 flex-col py-6 px-4 gap-4 hidden md:flex rounded-none transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24 items-center' : 'w-64'}`}>
          <div className={`flex items-center mb-6 w-full ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="material-symbols-outlined text-accent text-2xl">
                  {user?.role === 'administrator' ? 'admin_panel_settings' : 'auto_awesome'}
                </span>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-accent leading-none">
                    {user?.role === 'administrator' ? 'Admin' : 'Library'}
                  </h2>
                  <p className="text-[10px] font-label-md text-text-secondary opacity-70 uppercase tracking-widest mt-1">
                    {user?.role === 'administrator' ? 'System' : 'AI Assets'}
                  </p>
                </div>
              </Link>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <span className="material-symbols-outlined text-xl">{isCollapsed ? "menu" : "menu_open"}</span>
            </button>
          </div>
          
          <nav className="space-y-2 w-full">
            {sidebarLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${pathname === link.href ? 'bg-white/10 text-white font-bold border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:bg-white/5 hover:text-white'} ${isCollapsed ? 'justify-center' : 'gap-4'}`} 
                title={isCollapsed ? link.label : ""}
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                {!isCollapsed && <span className="font-label-md text-label-md">{link.label}</span>}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-6 space-y-4 w-full">
            {canUpload && (
              <Link href="/dashboard/upload" className={`w-full ai-gradient-bg text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all ${isCollapsed ? 'px-0' : 'px-4 gap-2'}`} title={isCollapsed ? "Upload Video" : ""}>
                <span className="material-symbols-outlined">add_circle</span>
                {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Upload Video</span>}
              </Link>
            )}
            <button onClick={handleLogout} className={`w-full glass-panel border border-white/5 text-text-secondary hover:text-white hover:bg-white/10 font-bold py-3 rounded-xl flex items-center justify-center transition-all ${isCollapsed ? 'px-0' : 'px-4 gap-2'}`} title={isCollapsed ? "Logout" : ""}>
              <span className="material-symbols-outlined text-sm">logout</span>
              {!isCollapsed && <span className="font-label-md text-label-md">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 w-full overflow-x-hidden relative z-10 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
