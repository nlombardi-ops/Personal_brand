const references = [
  {
    quote:
      "Nico has a rare ability to bridge commercial strategy and operational execution. He was instrumental in building our Iberian go-to-market — precise, fast, and deeply reliable.",
    name: "Adrien Palumbo",
    title: "Managing Director Spain, Polestar",
    pending: false,
  },
  {
    quote:
      "What sets Nico apart is his clarity. He can walk into a complex stakeholder environment and come out with a plan that everyone buys into. An exceptional consultant.",
    name: "Javier Bordetas",
    title: "Director, Capgemini",
    pending: false,
  },
  {
    quote: "",
    name: "CEO, Mottum Analytica",
    title: "Coming soon",
    pending: true,
  },
  {
    quote: "",
    name: "Uber Direct",
    title: "Coming soon",
    pending: true,
  },
];

export default function References() {
  const live = references.filter((r) => !r.pending);

  return (
    <section id="references" className="px-8 py-24 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">References</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-200">
          {live.map((r, i) => (
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
