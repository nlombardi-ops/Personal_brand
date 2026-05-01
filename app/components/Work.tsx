const work = [
  {
    year: "2025 – Present",
    company: "Mottum Analytica",
    role: "Founder & Head of AI Consulting",
    description:
      "Founded and lead an AI consulting firm focused on Data, BI, and AI strategy. Built the commercial function from zero — clients, pipeline, and partnerships, including a UN-backed AI initiative.",
    tags: ["AI", "Strategy", "GTM", "BD"],
  },
  {
    year: "2025",
    company: "Uber Direct",
    role: "Operations Manager",
    description:
      "Designed fraud mitigation workflows that improved financial risk management efficiency by 35%. Drove operational excellence across last-mile delivery ops.",
    tags: ["Operations", "Fintech", "Risk"],
  },
  {
    year: "2022 – 2024",
    company: "Polestar",
    role: "Fleet Operations",
    description:
      "Led launch and commercial strategy for telematics services targeting B2B clients, resulting in 15% revenue growth. Managed fleet partnerships across the Iberian market.",
    tags: ["BD", "B2B", "Commercial"],
  },
  {
    year: "2021 – 2022",
    company: "Capgemini Invent",
    role: "Senior Consultant",
    description:
      "Developed go-to-market strategy for Polestar Iberia, enhancing market entry success. Led CX and NPS transformation across 10 European markets for a top-tier insurance client.",
    tags: ["Consulting", "GTM", "CX"],
  },
  {
    year: "2019 – 2021",
    company: "Amadeus IT",
    role: "Customer Success Manager",
    description:
      "Managed analytics tools and customer feedback solutions for B2B travel clients, enhancing user engagement by 30%.",
    tags: ["Analytics", "B2B", "SaaS"],
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
              className="grid grid-cols-[140px_1fr] gap-8 py-10 border-b border-neutral-100"
            >
              <div>
                <p className="text-sm text-neutral-400">{item.year}</p>
                <p className="text-sm font-medium text-neutral-700 mt-1">{item.company}</p>
              </div>
              <div>
                <h3 className="text-base font-medium text-neutral-900 mb-2">{item.role}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
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
