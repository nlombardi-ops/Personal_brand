import type {
  OpenLoop,
  OpenLoopKind,
  OpenLoopOwner,
  OpenLoopSource,
  OpenLoopStatus,
} from "@/lib/types";

// ── Single source of truth for the D-10 vocabularies ──────────────────────
// The slide-over selects render from these records AND the validation
// allow-lists are derived from their keys — so the type, the validator, the
// form and the labels cannot drift (RESEARCH Pitfall 7).

export const KIND_LABELS: Record<OpenLoopKind, string> = {
  commitment: "Compromiso",
  incidencia: "Incidencia",
  obra: "Obra",
  follow_up: "Seguimiento",
  permiso: "Permiso",
};

export const STATUS_LABELS: Record<OpenLoopStatus, string> = {
  open: "Abierto",
  waiting_on_other: "A la espera",
  blocked: "Bloqueado",
  done: "Hecho",
  dropped: "Descartado",
};

export const OWNER_LABELS: Record<OpenLoopOwner, string> = {
  me: "Yo",
  neighbour: "Vecino",
  administrador: "Administrador",
  provider: "Proveedor",
  junta: "Junta",
};

export const SOURCE_LABELS: Record<OpenLoopSource, string> = {
  acta: "Acta",
  email: "Email",
  manual: "Manual",
  neighbour_form: "Formulario de vecino",
};

const KINDS = new Set(Object.keys(KIND_LABELS));
const STATUSES = new Set(Object.keys(STATUS_LABELS));
const OWNERS = new Set(Object.keys(OWNER_LABELS));
const SOURCES = new Set(Object.keys(SOURCE_LABELS));

const TITLE_MAX = 200;
const NEXT_ACTION_MAX = 2000;
const OWNER_DETAIL_MAX = 200;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Owner detail is only meaningful for these two owners (D-11).
export const OWNER_DETAIL_OWNERS: ReadonlyArray<OpenLoopOwner> = [
  "neighbour",
  "provider",
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Returns a human-readable Spanish error string, or null when the body is valid.
 * `create` requires title + kind + next_action; otherwise every field is
 * optional but still validated when present.
 */
export function validateLoopInput(
  body: unknown,
  opts: { create: boolean },
): string | null {
  if (!isPlainObject(body)) {
    return "El cuerpo de la petición no es válido.";
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const nextAction =
    typeof body.next_action === "string" ? body.next_action.trim() : "";

  if (opts.create) {
    if (!title) return "Añade un título";
    if (body.kind === undefined || body.kind === null || body.kind === "")
      return "Elige un tipo";
    if (!nextAction) return "Indica la próxima acción";
  }

  if (title.length > TITLE_MAX) {
    return `El título no puede superar los ${TITLE_MAX} caracteres.`;
  }
  if (nextAction.length > NEXT_ACTION_MAX) {
    return `La próxima acción no puede superar los ${NEXT_ACTION_MAX} caracteres.`;
  }
  if (body.owner_detail !== undefined && body.owner_detail !== null) {
    if (typeof body.owner_detail !== "string") {
      return "El detalle del responsable no es válido.";
    }
    if (body.owner_detail.trim().length > OWNER_DETAIL_MAX) {
      return `El detalle del responsable no puede superar los ${OWNER_DETAIL_MAX} caracteres.`;
    }
  }

  if (body.due !== undefined && body.due !== null) {
    if (typeof body.due !== "string" || !YMD.test(body.due)) {
      return "La fecha objetivo debe tener el formato AAAA-MM-DD.";
    }
  }

  if (body.kind !== undefined && !KINDS.has(String(body.kind))) {
    return 'El valor de "tipo" no es válido.';
  }
  if (body.status !== undefined && !STATUSES.has(String(body.status))) {
    return 'El valor de "estado" no es válido.';
  }
  if (body.owner !== undefined && !OWNERS.has(String(body.owner))) {
    return 'El valor de "responsable" no es válido.';
  }
  if (body.source !== undefined && !SOURCES.has(String(body.source))) {
    return 'El valor de "origen" no es válido.';
  }

  return null;
}

type NewLoopFields = Omit<OpenLoop, "id" | "created_at" | "updated_at">;

/**
 * Picks the validated field set by name (never spreads the incoming body, so
 * unknown keys never reach the stored document) and fills the D-09 defaults.
 * Call only after validateLoopInput has returned null in create mode.
 */
export function applyCreateDefaults(body: Record<string, unknown>): NewLoopFields {
  const owner = (body.owner as OpenLoopOwner) ?? "me";
  const ownerDetail =
    typeof body.owner_detail === "string" && body.owner_detail.trim()
      ? body.owner_detail.trim()
      : undefined;

  const fields: NewLoopFields = {
    title: String(body.title).trim(),
    kind: body.kind as OpenLoopKind,
    next_action: String(body.next_action).trim(),
    status: (body.status as OpenLoopStatus) ?? "open",
    owner,
    source: (body.source as OpenLoopSource) ?? "manual",
    due: typeof body.due === "string" ? body.due : null,
  };

  if (ownerDetail) fields.owner_detail = ownerDetail;
  if (typeof body.source_ref === "string" && body.source_ref.trim()) {
    fields.source_ref = body.source_ref.trim();
  }

  return fields;
}
