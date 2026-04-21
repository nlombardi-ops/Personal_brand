const projects = [
  {
    title: "Project Alpha",
    description:
      "An AI-powered ops tool built to automate weekly reporting across distributed teams. Reduced manual reporting time by 80%.",
    link: "#",
    tags: ["AI", "Automation"],
  },
  {
    title: "Project Beta",
    description:
      "Internal knowledge base and SOP library for a 200-person org — designed, built, and rolled out in 6 weeks.",
    link: "#",
    tags: ["Ops", "Knowledge Management"],
  },
  {
    title: "Project Gamma",
    description:
      "Custom dashboard for tracking OKRs and quarterly planning across 5 departments. Built on Notion + Make.",
    link: "#",
    tags: ["Strategy", "Tooling"],
  },
];

export default function Projects() {
  return (
    <section id="projects" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">Personal Projects</p>
        <div className="space-y-0">
          {projects.map((p, i) => (
            <div key={i} className="py-10 border-b border-neutral-100 flex justify-between items-start gap-8">
              <div className="flex-1">
                <h3 className="text-base font-medium text-neutral-900 mb-2">{p.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed mb-4">{p.description}</p>
                <div className="flex gap-2">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-neutral-400 border border-neutral-200 px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={p.link}
                className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors whitespace-nowrap mt-1"
              >
                View →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
