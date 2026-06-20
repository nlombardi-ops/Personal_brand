import FadeUp from "./FadeUp";

const work = [
  {
    year: "2025 – Present",
    company: "Mottum Analytica",
    role: "Founder & Head of AI Consulting",
    description:
      "Founded and lead an AI consulting firm focused on Data, BI, and AI strategy. Built the commercial function from zero — clients, pipeline, and partnerships, including a programme with the UN Development Programme (UNDP) to embed AI in public institutions.",
    highlights: [] as string[],
    tags: ["AI", "Strategy", "GTM", "BD"],
  },
  {
    year: "2025",
    company: "Uber Direct",
    role: "Operations Manager",
    description:
      "Designed fraud mitigation workflows and drove operational excellence across last-mile delivery ops.",
    highlights: [
      "35% improvement in financial risk management efficiency",
      "Redesigned fraud detection workflows end-to-end",
    ],
    tags: ["Operations", "Fintech", "Risk"],
  },
  {
    year: "2022 – 2024",
    company: "Polestar",
    role: "Fleet Operations",
    description:
      "Led launch and commercial strategy for telematics services targeting B2B clients. Managed fleet partnerships across the Iberian market.",
    highlights: [
      "15% revenue growth from B2B telematics launch",
      "3 new fleet partnerships closed in 12 months",
    ],
    tags: ["BD", "B2B", "Commercial"],
  },
  {
    year: "Mar 2019 – 2022",
    company: "Capgemini Invent",
    role: "Senior Consultant",
    description:
      "Developed go-to-market strategy for Polestar Iberia, enhancing market entry success. Led CX and NPS transformation across 10 European markets for a top-tier insurance client.",
    highlights: [] as string[],
    tags: ["Consulting", "GTM", "CX"],
  },
  {
    year: "2017 – Mar 2019",
    company: "Amadeus IT",
    role: "Customer Success Manager",
    description:
      "Managed analytics tools and customer feedback solutions for B2B travel clients, enhancing user engagement by 30%.",
    highlights: [] as string[],
    tags: ["Analytics", "B2B", "SaaS"],
  },
];

export default function Work() {
  return (
    <section id="work" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <FadeUp>
          <p className="text-xs text-neutral-600 uppercase tracking-widest mb-12">Work</p>
        </FadeUp>
        <div className="space-y-0">
          {work.map((item, i) => (
            <FadeUp key={i} delay={i * 0.06}>
              <div className="grid grid-cols-[140px_1fr] gap-8 py-10 border-b border-neutral-100">
                <div>
                  <p className="text-sm text-neutral-600">{item.year}</p>
                  <p className="text-sm font-medium text-neutral-700 mt-1">{item.company}</p>
                </div>
                <div>
                  <h3 className="text-base font-medium text-neutral-900 mb-2">{item.role}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{item.description}</p>
                  {item.highlights.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {item.highlights.map((h) => (
                        <li key={h} className="text-sm text-neutral-600 flex items-start gap-2">
                          <span className="mt-[5px] w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
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
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
