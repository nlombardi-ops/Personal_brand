export default function Nav() {
  const links = [
    { label: "Work", href: "#work" },
    { label: "Services", href: "#services" },
    { label: "Projects", href: "#projects" },
    { label: "References", href: "#references" },
    { label: "Contact", href: "#contact" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#fafafa]/90 backdrop-blur-sm">
      <a href="#" className="text-sm font-medium tracking-wide">NL</a>
      <ul className="flex gap-8">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
