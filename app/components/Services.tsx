const services = [
  {
    title: "Operations Design",
    description:
      "End-to-end process architecture, team structures, and tooling to help your company scale without friction.",
  },
  {
    title: "Product Management",
    description:
      "Roadmap definition, prioritisation frameworks, stakeholder alignment, and shipping discipline.",
  },
  {
    title: "AI Integration",
    description:
      "Identifying high-leverage AI use cases, selecting tools, running pilots, and embedding them into your workflows.",
  },
  {
    title: "Strategic Advisory",
    description:
      "Clear-eyed thinking on growth, structure, and decisions — as a fractional advisor or embedded partner.",
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
      </div>
    </section>
  );
}
