export default function Contact() {
  return (
    <section id="contact" className="px-8 py-24 border-t border-neutral-200">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-neutral-400 uppercase tracking-widest mb-12">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
          <div>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight leading-tight text-neutral-900">
              Let's work<br />together.
            </h2>
            <p className="text-sm text-neutral-500 mt-6 leading-relaxed max-w-sm">
              Open to advisory roles, fractional ops/PM, and consulting engagements.
              If there's a fit, I'd love to hear about it.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <a
              href="mailto:hello@nicolombardi.com"
              className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              hello@nicolombardi.com →
            </a>
            <a
              href="https://linkedin.com/in/nicolombardi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              LinkedIn →
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-24 pt-8 border-t border-neutral-100 flex justify-between items-center">
        <p className="text-xs text-neutral-400">© 2026 Nico Lombardi</p>
        <p className="text-xs text-neutral-400">Ops · Strategy · PM · AI</p>
      </div>
    </section>
  );
}
