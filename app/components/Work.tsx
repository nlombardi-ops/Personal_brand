const work = [
  {
    year: "2023–Present",
    company: "Company Name",
    role: "Head of Operations & Strategy",
    description:
      "Led cross-functional teams to redesign core operational processes, reducing time-to-delivery by 35% and embedding AI tooling across the org.",
    tags: ["Ops", "AI", "Strategy"],
  },
  {
    year: "2021–2023",
    company: "Company Name",
    role: "Senior Product Manager",
    description:
      "Owned roadmap for a B2B SaaS platform with 50k+ users. Shipped 4 major releases, drove 2× ARR growth.",
    tags: ["Product", "B2B", "SaaS"],
  },
  {
    year: "2019–2021",
    company: "Company Name",
    role: "Strategy & Operations",
    description:
      "Built the ops function from scratch. Designed KPI frameworks, vendor management systems, and internal tooling.",
    tags: ["Ops", "Strategy"],
  },
];

export default function Work() {
  return (
    <section id="work" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">Work</p>
        <div className="space-y-0">
          {work.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[140px_1fr] gap-8 py-10 border-b border-neutral-100 group"
            >
              <div>
                <p className="text-sm text-neutral-400">{item.year}</p>
                <p className="text-sm font-medium text-neutral-700 mt-1">{item.company}</p>
              </div>
              <div>
                <h3 className="text-base font-medium text-neutral-900 mb-2">{item.role}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.description}</p>
                <div className="flex gap-2 mt-4">
                  {item.tags.map((tag) => (
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
