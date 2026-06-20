import FadeUp from "./FadeUp";

const services = [
  {
    number: "01",
    title: "AI & Data Consulting",
    description:
      "Identifying high-leverage AI use cases, structuring partnerships around data and BI products, and driving GTM strategy for tech launches — including UN-backed AI prototypes.",
  },
  {
    number: "02",
    title: "Business Development",
    description:
      "End-to-end BD: from market mapping and partnership structuring to deal negotiation and closing. Specialist in fintech, mobility, and enterprise SaaS.",
  },
  {
    number: "03",
    title: "Go-to-Market Strategy",
    description:
      "Market entry playbooks, customer pipeline design, and unit economics. Proven in new market launches across Spain, Iberia, and Europe.",
  },
  {
    number: "04",
    title: "Operations & Risk",
    description:
      "Process design, fraud mitigation frameworks, KPI systems, and cross-functional leadership. Tangible efficiency gains — 35% in financial risk ops at Uber Direct.",
  },
];

export default function Services() {
  return (
    <section id="services" className="px-8 py-24 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <FadeUp>
          <p className="text-xs text-neutral-600 uppercase tracking-widest mb-12">Services</p>
          <ul className="space-y-0">
            {services.map((s, i) => (
              <FadeUp key={s.number} delay={i * 0.07}>
                <li className="grid grid-cols-[48px_1fr] gap-8 py-8 border-b border-neutral-200">
                  <span className="text-xs text-neutral-400 pt-1 tabular-nums">{s.number}</span>
                  <div>
                    <h3 className="text-base font-medium text-neutral-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{s.description}</p>
                  </div>
                </li>
              </FadeUp>
            ))}
          </ul>
        </FadeUp>
      </div>
    </section>
  );
}
