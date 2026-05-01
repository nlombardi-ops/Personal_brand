const references = [
  {
    quote:
      "Nico has a rare ability to bridge commercial strategy and operational execution. He was instrumental in building our Iberian go-to-market — precise, fast, and deeply reliable.",
    name: "Adrien Palumbo",
    title: "Managing Director Spain, Polestar",
  },
  {
    quote:
      "What sets Nico apart is his clarity. He can walk into a complex stakeholder environment and come out with a plan that everyone buys into. An exceptional consultant.",
    name: "Javier Bordetas",
    title: "Director, Capgemini",
  },
  {
    quote:
      "Nico brings real strategic depth to AI projects. He knows how to structure a deal, align a team, and get things shipped. Exactly the profile you want on a high-stakes initiative.",
    name: "— ",
    title: "Add a reference",
  },
];

export default function References() {
  return (
    <section id="references" className="px-8 py-24 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">References</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-200">
          {references.slice(0, 2).map((r, i) => (
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
