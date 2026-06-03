"use client";

import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Services", href: "#services" },
    { label: "Work", href: "#work" },
    { label: "Projects", href: "#projects" },
    { label: "References", href: "#references" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#fafafa]/90 backdrop-blur-sm">
        <a href="#" aria-label="Nico Lombardi — Home" className="text-sm font-medium tracking-wide">
          NL
        </a>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-neutral-900 after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <span className="block w-5 h-px bg-neutral-900" />
          <span className="block w-5 h-px bg-neutral-900" />
          <span className="block w-5 h-px bg-neutral-900" />
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Sheet */}
          <div
            className="absolute top-0 right-0 h-full w-64 bg-[#fafafa] flex flex-col px-8 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="self-end text-sm text-neutral-500 hover:text-neutral-900 mb-10 mt-1"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
            <ul className="flex flex-col gap-7">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
