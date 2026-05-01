const services = [
  {
    title: "AI & Data Consulting",
    description:
      "Identifying high-leverage AI use cases, structuring partnerships around data and BI products, and driving GTM strategy for tech launches — including UN-backed AI prototypes.",
  },
  {
    title: "Business Development",
    description:
      "End-to-end BD: from market mapping and partnership structuring to deal negotiation and closing. Specialist in fintech, mobility, and enterprise SaaS.",
  },
  {
    title: "Go-to-Market Strategy",
    description:
      "Market entry playbooks, customer pipeline design, and unit economics. Proven in new market launches across Spain, Iberia, and Europe.",
  },
  {
    title: "Operations & Risk",
    description:
      "Process design, fraud mitigation frameworks, KPI systems, and cross-functional leadership. Tangible efficiency gains — 35% in financial risk ops at Uber Direct.",
  },
];

export default function Services() {
  return (
    <section id="services" className="px-8 py-24 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">Services</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-200">
          {services.map((s) => (
            <div key={s.title} className="bg-neutral-50 p-8">
              <h3 className="text-base font-medium text-neutral-900 mb-3">{s.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          {[
            "Business Development",
            "Fintech",
            "Partnerships",
            "Commercial Strategy",
            "Data Analytics",
            "Cross-Functional Leadership",
            "Project Management",
            "GTM Planning",
            "Unit Economics",
          ].map((skill) => (
            <span
              key={skill}
              className="text-xs text-neutral-400 border border-neutral-200 px-3 py-1 bg-white"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
