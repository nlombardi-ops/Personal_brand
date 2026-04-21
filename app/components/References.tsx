const references = [
  {
    quote:
      "Nico has an exceptional ability to bring clarity to ambiguous situations. He redesigned our ops in 3 months and the impact was immediate.",
    name: "Name Surname",
    title: "CEO, Company",
  },
  {
    quote:
      "One of the sharpest PMs I've worked with. He balances user needs, business goals, and technical constraints better than anyone I know.",
    name: "Name Surname",
    title: "CTO, Company",
  },
  {
    quote:
      "Nico helped us think about AI not as a trend but as an operational lever. The frameworks he introduced are still running our workflows today.",
    name: "Name Surname",
    title: "COO, Company",
  },
];

export default function References() {
  return (
    <section id="references" className="px-8 py-24 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">References</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-200">
          {references.map((r, i) => (
            <div key={i} className="bg-neutral-50 p-8 flex flex-col justify-between">
              <p className="text-sm text-neutral-600 leading-relaxed mb-8">"{r.quote}"</p>
              <div>
                <p className="text-sm font-medium text-neutral-900">{r.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{r.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
