"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ChevronLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// Single nav definition — reused by both the desktop aside and the mobile
// drawer. Future surfaces add entries here only.
const NAV_ITEMS = [
  { label: "Panel", href: "/community-president", icon: LayoutDashboard },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/community-president"
            ? pathname === "/community-president"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-neutral-200 font-medium text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-semibold text-white">
        CP
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">Presidente</p>
        <p className="text-[11px] text-neutral-500">Comunidad</p>
      </div>
    </div>
  );
}

export default function CommunitySidebar() {
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
    <div className="space-y-1 border-t border-neutral-200 px-3 py-3">
      <Link
        href="/"
        onClick={() => setDrawerOpen(false)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al portfolio
      </Link>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed 240px aside (md and up). */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-neutral-100 md:flex">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-5">
          <BrandTile />
        </div>
        <NavLinks pathname={pathname} />
        {footer}
      </aside>

      {/* Mobile: top bar on the page background with a bottom hairline. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-[#fafafa] px-4 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-semibold text-white">
          CP
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
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
            aria-label="Menú"
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-neutral-200 bg-neutral-100 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <BrandTile />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-md p-1 text-neutral-500 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
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
