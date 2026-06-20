import FadeUp from "./FadeUp";

export default function Contact() {
  return (
    <section id="contact" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <FadeUp>
        <p className="text-xs text-neutral-600 uppercase tracking-widest mb-12">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
          <div>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight leading-tight text-neutral-900">
              Let's work<br />together.
            </h2>
            <p className="text-sm text-neutral-500 mt-6 leading-relaxed max-w-sm">
              Open to BD, AI consulting, and strategic advisory engagements.
              Based in Madrid — working globally.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["Italian", "English", "Spanish", "French"].map((lang) => (
                <span key={lang} className="text-xs text-neutral-400 border border-neutral-200 px-2 py-0.5">
                  {lang}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-5">
            <a
              href="mailto:nicolalombardi@mac.com"
              className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              nicolalombardi@mac.com →
            </a>
            <a
              href="https://www.linkedin.com/in/nicola-lombardi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              LinkedIn →
            </a>
            <a
              href="tel:+34603376602"
              className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              +34 603 376 602 →
            </a>
          </div>
        </div>
        </FadeUp>
      </div>
      <div className="max-w-4xl mx-auto mt-24 pt-8 border-t border-neutral-100 flex justify-between items-center flex-wrap gap-4">
        <p className="text-xs text-neutral-400">© 2026 Nico Lombardi · Madrid, Spain</p>
        <div className="flex items-center gap-6">
          <p className="text-xs text-neutral-400">BD · Fintech · AI · Ops</p>
          <a
            href="/dashboard"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/cv"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            CV Builder
          </a>
        </div>
      </div>
    </section>
  );
}
