"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  User,
  Clock,
  BarChart2,
  ChevronLeft,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";

const NAV = [
  { label: "Generate", href: "/cv", icon: FileText },
  { label: "Cover Letter", href: "/cv/cover-letter", icon: Mail },
  { label: "Application Q&A", href: "/cv/answers", icon: MessageSquare },
  { label: "My Profile", href: "/cv/profile", icon: User },
  { label: "History", href: "/cv/versions", icon: Clock },
  { label: "Stats", href: "/cv/stats", icon: BarChart2 },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
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
            onClick={onNavigate}
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
  );
}

function BrandTile() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-bold text-white tracking-tight">
        NL
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-900">CV Tool</p>
        <p className="text-[11px] text-stone-500">AI-powered generator</p>
      </div>
    </div>
  );
}

export default function CvSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    setDrawerOpen(false);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }

  // Close the drawer on Escape (external system — an effect is correct here).
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const footer = (
    <div className="border-t border-stone-200 px-3 py-3 space-y-1">
      <Link
        href="/"
        onClick={() => setDrawerOpen(false)}
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
  );

  return (
    <>
      {/* Desktop: fixed 224px aside (md and up). */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-56 flex-col bg-stone-100 border-r border-stone-200 md:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-stone-200">
          <BrandTile />
        </div>
        <NavLinks pathname={pathname} />
        {footer}
      </aside>

      {/* Mobile: top bar on the page background with a bottom hairline. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-stone-50 px-4 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-bold text-white tracking-tight">
          NL
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 items-center justify-center rounded-md text-stone-600 transition-colors hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile: left sheet drawer over a translucent backdrop. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[rgba(10,10,10,0.2)]"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-stone-200 bg-stone-100 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <BrandTile />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-stone-500 transition-colors hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              onNavigate={() => setDrawerOpen(false)}
            />
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
