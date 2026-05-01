export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-end px-8 pb-20 pt-32">
      <div className="max-w-4xl">
        <p className="text-sm text-neutral-400 tracking-widest uppercase mb-6">
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
        <div className="mt-12 flex gap-6">
          <a
            href="#work"
            className="text-sm border border-neutral-900 px-6 py-3 hover:bg-neutral-900 hover:text-white transition-colors"
          >
            See my work
          </a>
          <a
            href="#contact"
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2"
          >
            Get in touch →
          </a>
        </div>
      </div>
    </section>
  );
}
