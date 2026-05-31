"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Shield,
  Receipt,
  FileText,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mortgage", href: "/dashboard/mortgage", icon: Landmark },
  { label: "Insurance", href: "/dashboard/insurance", icon: Shield },
  { label: "Bills", href: "/dashboard/bills", icon: Receipt },
  { label: "Contracts", href: "/dashboard/contracts", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-60 flex-col bg-neutral-950 border-r border-neutral-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-neutral-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
          F10
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fourquet 10</p>
          <p className="text-[11px] text-neutral-500">Finance Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-neutral-800 text-white font-medium"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-800 px-3 py-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Portfolio
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
