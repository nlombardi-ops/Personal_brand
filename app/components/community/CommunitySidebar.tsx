"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ChevronLeft, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { label: "Panel", href: "/community-president", icon: LayoutDashboard },
];

export default function CommunitySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-neutral-100 md:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-xs font-semibold text-white">
          CP
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">Presidente</p>
          <p className="text-[11px] text-neutral-500">Comunidad</p>
        </div>
      </div>

      {/* Nav */}
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

      {/* Footer */}
      <div className="space-y-1 border-t border-neutral-200 px-3 py-3">
        <Link
          href="/"
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
    </aside>
  );
}
