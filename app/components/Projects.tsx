const projects = [
  {
    title: "Mottum Analytica",
    description:
      "Co-built an AI consulting firm specialising in Data, BI, and AI strategy for enterprise clients. Currently leading commercial development and partnerships, including work with UN-backed AI initiatives.",
    link: "#",
    tags: ["AI", "Consulting", "Startups"],
  },
  {
    title: "UN-backed AI Prototype Partnership",
    description:
      "Structured and negotiated partnership agreements for an AI prototype programme backed by a United Nations body. Managed deal design, stakeholder alignment, and GTM planning.",
    link: "#",
    tags: ["AI", "BD", "International"],
  },
  {
    title: "Fraud Mitigation Workflow — Uber Direct",
    description:
      "Designed a full fraud detection and mitigation workflow for last-mile delivery operations. Reduced financial risk management costs by 35% within the first quarter of deployment.",
    link: "#",
    tags: ["Ops", "Fintech", "Risk"],
  },
  {
    title: "Telematics B2B Launch — Polestar",
    description:
      "Designed and executed the commercial launch strategy for a telematics services offering targeting fleet clients. Delivered 15% revenue growth in the first year.",
    link: "#",
    tags: ["B2B", "Mobility", "Commercial"],
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
