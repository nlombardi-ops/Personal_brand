export default function Hero() {
  return (
    <section
      className="min-h-screen flex flex-col justify-end px-8 pb-20 pt-32 relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-4xl relative z-10">
        <p className="text-sm text-neutral-600 tracking-widest uppercase mb-6">
          Business Development · Fintech · AI · Operations
        </p>
        <h1 className="text-[clamp(3rem,8vw,7rem)] leading-[0.95] font-light tracking-tight text-neutral-900 mb-10">
          Nico<br />Lombardi
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl leading-relaxed">
          10+ years driving growth at the intersection of fintech, AI and operations.
          I help companies build the right partnerships, enter new markets, and
          turn strategy into traction.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="text-sm bg-[--cta-accent] text-white px-6 py-3 hover:bg-[--cta-accent-hover] transition-colors"
          >
            Get in touch
          </a>
          <a
            href="#services"
            className="text-sm border border-neutral-300 px-6 py-3 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
          >
            See my work →
          </a>
        </div>
      </div>
    </section>
  );
}
