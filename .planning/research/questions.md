# Research questions

Open questions surfaced during exploration. Investigate before or during planning.

## Smart Community President (opened 2026-09-08 via /gsd-explore)

### Q1 — How does Nicola reliably get actas and threads out of the administrador?
Options to evaluate:
- Email forwarding rule (administrador emails → dedicated inbox this app watches)
- Administrador portal — does his administrador have one? Can it be scraped / does it
  have an export?
- Manual upload as the honest v1 default
The answer shapes the ingestion pipeline and how automatic the "open loop extraction"
can be.

### Q2 — Presupuestos benchmarking: what pricing data sources exist for Spain?
For construction / maintenance / building works. Candidates to research:
- Generadores de precios (CYPE / Base de datos de la construcción, precio centro)
- Colegios de administradores de fincas reference prices
- Marketplaces (Habitissimo, Cronoshare) and whether they expose comparable quotes
- Whether Ciudadela's approach is API-accessible or purely their product
Determines whether pillar 3 is a scraper, a dataset, or an LLM-with-web-search.

### Q3 — LLM extraction accuracy on real actas
Test on 2–3 of Nicola's actual actas: can a model reliably pull acuerdos, vote tallies,
puntos pendientes, and responsible parties into the `OpenLoop` shape? What error rate,
and does it need human confirmation on every extraction?

---

## LPH reference (from exploration research pass)

- [Artículo 19 LPH — actas](https://www.iberley.es/legislacion/articulo-19-ley-propiedad-horizontal)
- [Artículo 16 LPH — convocatoria](https://www.iberley.es/legislacion/articulo-16-ley-propiedad-horizontal)
- [Artículo 17 LPH — mayorías](https://adminfergal.es/blog/administracion-de-fincas/la-ley-de-propiedad-horizontal-articulo-17-y-sus-diferentes-mayorias/)
- [Arts. 10.3.b y 17.4 — obras y accesibilidad](https://urbanismoyderecho.com/mayorias-y-unanimidad-en-la-ley-de-propiedad-horizontal-articulos-10-3-b-y-17-4-de-la-ley-de-propiedad-horizontal/)
- [Artículo 18 LPH — impugnación](https://ley-de-propiedad-horizontal.com.es/articulo-18-ley-propiedad-horizontal-impugnacion-acuerdos/)
- Tools landscape: [fincapp.es](https://fincapp.es/), [fincai.es](https://www.fincai.es/),
  [ciudadela.eu](https://www.ciudadela.eu/),
  [softwaredoit.es — software administración de fincas 2026](https://www.softwaredoit.es/software-de-administracion-de-fincas/index.html)
