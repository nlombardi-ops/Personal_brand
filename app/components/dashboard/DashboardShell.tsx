"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/dashboard/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />
      {/* Offsets are breakpoint-scoped: the fixed 240px sidebar only exists
          from md up (md:ml-60); below md the fixed 56px mobile top bar takes
          its place (pt-14). Change this together with Sidebar's two modes.
          min-w-0 lets recharts' ResponsiveContainer shrink instead of the
          widest chart setting the page's min-content width. */}
      <main className="flex-1 min-w-0 pt-14 md:ml-60 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
