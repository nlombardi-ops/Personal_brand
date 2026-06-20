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
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}
