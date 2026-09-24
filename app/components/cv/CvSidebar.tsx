"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, User, Clock, BarChart2, ChevronLeft, LogOut } from "lucide-react";

const NAV = [
  { label: "Generate", href: "/cv", icon: FileText },
  { label: "My Profile", href: "/cv/profile", icon: User },
  { label: "History", href: "/cv/versions", icon: Clock },
  { label: "Stats", href: "/cv/stats", icon: BarChart2 },
];

export default function CvSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-56 flex-col bg-stone-100 border-r border-stone-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-stone-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-bold text-white tracking-tight">
          NL
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">CV Tool</p>
          <p className="text-[11px] text-stone-500">AI-powered generator</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/cv"
              ? pathname === "/cv"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[#0f172a] text-white font-medium"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-stone-200 px-3 py-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Portfolio
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
