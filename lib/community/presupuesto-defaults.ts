import type { Presupuesto, PresupuestoStatus } from "@/lib/types";

// D-12: the ordinary Spanish IVA rate. A presupuesto quoting the reduced 10%
// rate for some reformas is entered by editing the field, not by a preset.
export const DEFAULT_IVA_PCT = 21;

/**
 * One `Math.round` over `baseCents * (1 + ivaPct / 100)`. Integer cents plus a
 * single rounding step is what keeps the comparison's deltas exact — euro
 * floats drift across the multiply and the subtract (D-12).
 */
export function computeTotalCents(baseCents: number, ivaPct: number): number {
  return Math.round(baseCents * (1 + ivaPct / 100));
}

const EURO_SIGN = /€/g;
const VALID_EURO_SHAPE = /^\d+(\.\d{1,2})?$/;

/**
 * Accepts what a Spanish keyboard actually types: "1234.56", "1234,56",
 * "1.234,56" (thousands dot, decimal comma), or a bare integer. Returns cents
 * as an integer, or null for anything ambiguous, negative or malformed — the
 * caller shows a Spanish message on null.
 */
export function parseEurosToCents(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(EURO_SIGN, "").trim();
  if (!trimmed) return null;

  const hasDot = trimmed.includes(".");
  const hasComma = trimmed.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    // Whichever separator appears LAST is the decimal separator; the other
    // is a thousands separator and is stripped.
    const lastDot = trimmed.lastIndexOf(".");
    const lastComma = trimmed.lastIndexOf(",");
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, "").replace(",", ".")
        : trimmed.replace(/,/g, "");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  } else {
    normalized = trimmed;
  }

  if (!VALID_EURO_SHAPE.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/**
 * `(cents / 100)` rendered with the Spanish locale and exactly two fraction
 * digits. Formatting happens at render only — nothing downstream of this
 * function is arithmetic.
 */
export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PROVIDER_MAX = 160;
const SCOPE_MAX = 2000;
const BASE_IMPONIBLE_MAX_CENTS = 100_000_000; // one million euros (D-12 cap)
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Returns a human-readable Spanish error string, or null when the body is
 * valid. `create` additionally requires `loop_id` and `provider`; every other
 * field is optional but still validated when present, exactly like
 * `validateLoopInput` / `validateDocumentInput`. A body carrying `total_cents`
 * is never rejected here — the value is simply ignored downstream, because
 * `total_cents` is absent from `PATCHABLE_PRESUPUESTO_KEYS`.
 */
export function validatePresupuestoInput(
  body: unknown,
  opts: { create: boolean },
): string | null {
  if (!isPlainObject(body)) {
    return "El cuerpo de la petición no es válido.";
  }

  if (opts.create) {
    if (typeof body.loop_id !== "string" || !body.loop_id.trim()) {
      return "Falta el bucle al que pertenece este presupuesto.";
    }
    if (typeof body.provider !== "string" || !body.provider.trim()) {
      return "Añade el proveedor.";
    }
  }

  if (body.provider !== undefined) {
    if (typeof body.provider !== "string" || body.provider.length > PROVIDER_MAX) {
      return `El proveedor no puede superar los ${PROVIDER_MAX} caracteres.`;
    }
  }

  if (body.scope !== undefined && body.scope !== null) {
    if (typeof body.scope !== "string" || body.scope.length > SCOPE_MAX) {
      return `El alcance no puede superar los ${SCOPE_MAX} caracteres.`;
    }
  }

  if (body.base_imponible_cents !== undefined) {
    const base = body.base_imponible_cents;
    if (
      typeof base !== "number" ||
      !Number.isInteger(base) ||
      base <= 0 ||
      base > BASE_IMPONIBLE_MAX_CENTS
    ) {
      return "La base imponible debe ser un importe positivo de hasta 1.000.000 €.";
    }
  }

  if (body.iva_pct !== undefined) {
    const iva = body.iva_pct;
    if (typeof iva !== "number" || Number.isNaN(iva) || iva < 0 || iva > 100) {
      return 'El valor de "IVA" no es válido.';
    }
  }

  if (body.received_at !== undefined && body.received_at !== null) {
    if (typeof body.received_at !== "string" || !YMD.test(body.received_at)) {
      return "La fecha de recepción debe tener el formato AAAA-MM-DD.";
    }
  }

  if (body.valid_until !== undefined && body.valid_until !== null) {
    if (typeof body.valid_until !== "string" || !YMD.test(body.valid_until)) {
      return "La fecha de validez debe tener el formato AAAA-MM-DD.";
    }
  }

  if (body.document_id !== undefined && body.document_id !== null) {
    if (typeof body.document_id !== "string" || !body.document_id.trim()) {
      return "El documento vinculado no es válido.";
    }
  }

  if (
    body.status !== undefined &&
    body.status !== "active" &&
    body.status !== "archived"
  ) {
    return 'El valor de "estado" no es válido.';
  }

  return null;
}

// ── PATCH allow-list (D-12, T-02-21) ───────────────────────────────────────
// The ONLY keys a PATCH body may touch. `id`, `loop_id`, `total_cents`,
// `created_at` and `updated_at` are server-owned and absent here, so they
// cannot be set from the wire. `total_cents` being absent is the
// mass-assignment mitigation, not an oversight — it is ALWAYS recomputed by
// `applyPresupuestoPatch` from the merged base and IVA, never taken from the
// body. `__proto__` / `constructor` are likewise absent, so a
// prototype-polluting key is structurally unreachable — not filtered by name.
export const PATCHABLE_PRESUPUESTO_KEYS = Object.freeze([
  "provider",
  "base_imponible_cents",
  "iva_pct",
  "scope",
  "received_at",
  "valid_until",
  "document_id",
  "status",
] as const);

/**
 * Builds the next Presupuesto by copying `existing` and overlaying ONLY the
 * allow-listed keys that are own properties of `patch`. The raw patch object
 * is never spread, so `id`/`loop_id` stay stable and server-owned fields
 * cannot be overwritten. `total_cents` is then unconditionally recomputed
 * from the MERGED record — a patch that touches neither the base nor the IVA
 * is therefore a provable no-op on the total, and a client-sent total can
 * never survive. Refreshes `updated_at` last. Call only after
 * validatePresupuestoInput(patch, { create: false }) has returned null.
 */
export function applyPresupuestoPatch(
  existing: Presupuesto,
  patch: Record<string, unknown>,
): Presupuesto {
  const next: Presupuesto = { ...existing };

  for (const key of PATCHABLE_PRESUPUESTO_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];

    switch (key) {
      case "provider":
        if (typeof value === "string") next.provider = value.trim();
        break;
      case "base_imponible_cents":
        if (typeof value === "number") next.base_imponible_cents = value;
        break;
      case "iva_pct":
        if (typeof value === "number") next.iva_pct = value;
        break;
      case "scope":
        if (typeof value === "string") next.scope = value;
        break;
      case "received_at":
        next.received_at = typeof value === "string" ? value : null;
        break;
      case "valid_until":
        next.valid_until = typeof value === "string" ? value : null;
        break;
      case "document_id":
        next.document_id = typeof value === "string" ? value : null;
        break;
      case "status":
        if (value === "active" || value === "archived") {
          next.status = value as PresupuestoStatus;
        }
        break;
    }
  }

  // Unconditional — deliberately not gated on "did base or iva change" so
  // this line alone proves a scope-only or status-only patch leaves the
  // total byte-identical, and a directly patched `total_cents` (absent from
  // the frozen key list above) is always overwritten by this recompute.
  next.total_cents = computeTotalCents(next.base_imponible_cents, next.iva_pct);

  next.updated_at = new Date().toISOString();
  return next;
}

type NewPresupuestoFields = Omit<Presupuesto, "id" | "created_at" | "updated_at">;

/**
 * Picks the validated field set by name (never spreads the incoming body, so
 * unknown keys never reach the stored document), defaults `iva_pct` to
 * `DEFAULT_IVA_PCT` and `scope` to the empty string, and computes
 * `total_cents`. Call only after validatePresupuestoInput has returned null
 * in create mode.
 */
export function applyPresupuestoCreateDefaults(
  body: Record<string, unknown>,
): NewPresupuestoFields {
  const baseImponibleCents =
    typeof body.base_imponible_cents === "number" ? body.base_imponible_cents : 0;
  const ivaPct = typeof body.iva_pct === "number" ? body.iva_pct : DEFAULT_IVA_PCT;

  return {
    loop_id: String(body.loop_id).trim(),
    provider: String(body.provider).trim(),
    base_imponible_cents: baseImponibleCents,
    iva_pct: ivaPct,
    total_cents: computeTotalCents(baseImponibleCents, ivaPct),
    scope: typeof body.scope === "string" ? body.scope : "",
    received_at: typeof body.received_at === "string" ? body.received_at : null,
    valid_until: typeof body.valid_until === "string" ? body.valid_until : null,
    document_id: typeof body.document_id === "string" ? body.document_id : null,
    status: "active",
  };
}
