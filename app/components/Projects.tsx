const projects = [
  {
    title: "Mottum Analytica",
    description:
      "Founded and lead Mottum Analytica, an AI consulting firm specialising in Data, BI, and AI strategy for enterprise clients. Built the commercial function from zero — clients, pipeline, and partnerships.",
    link: "#",
    tags: ["AI", "Consulting", "Founder"],
  },
  {
    title: "UN-backed AI Prototype Partnership",
    description:
      "Structured partnership agreements for an AI programme with the UN Development Programme (UNDP) to embed AI tools in public institutions. Managed deal design, stakeholder alignment, and GTM planning.",
    link: "#",
    tags: ["AI", "BD", "International"],
  },
];

export default function Projects() {
  return (
    <section id="projects" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-600 uppercase tracking-widest mb-12">Selected Work</p>
        <ul className="space-y-0">
          {projects.map((p, i) => (
            <li key={i} className="py-10 border-b border-neutral-100 flex justify-between items-start gap-8">
              <div className="flex-1">
                <h3 className="text-base font-medium text-neutral-900 mb-2">{p.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed mb-4">{p.description}</p>
                <div className="flex flex-wrap gap-2">
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
