// ── Dashboard ──────────────────────────────────────────────────────────────

export interface EnergyBill {
  month: string;
  total: number;
  potencia: number;
  consumo: number;
  iva: number;
  provider: string;
}

export interface CommunityBill {
  month: string;
  cuota: number;
  water: number;
  extraordinary: number;
  provider: string;
}

export interface InternetBill {
  month: string;
  total: number;
  provider: string;
  plan?: string;
}

export interface BillsData {
  energy: EnergyBill[];
  internet: InternetBill[];
  community: CommunityBill[];
}

export interface MortgageYearEntry {
  year: number;
  annual_payment: number;
  interest?: number;
  principal_paid?: number;
  balance: number;
  note?: string;
}

export interface Bonificador {
  name: string;
  bonification: number;
  requirements: string;
  cost_total: string;
}

export interface MortgageData {
  status: string;
  lender: string;
  principal: number;
  term_months: number;
  start_date: string;
  property_value: number;
  ltv_pct: number;
  type: string;
  fixed_rate: number;
  fixed_rate_bonified: number;
  fixed_end_date: string;
  fixed_period_months: number;
  variable_index: string;
  variable_spread: number;
  max_bonification: number;
  monthly_payment: number;
  monthly_payment_bonified: number;
  total_repayment: number;
  total_repayment_bonified: number;
  tae: number;
  tae_bonified: number;
  early_repayment_fee_pct: number;
  early_repayment_fee_period_years: number;
  bonificadores: Bonificador[];
  obligaciones: {
    cuenta_pago: string;
    seguro_danos: string;
    seguro_hogar_anual: number;
    seguro_vida_anual: number;
  };
  schedule: MortgageYearEntry[];
}

export interface InsurancePolicy {
  id: string;
  name: string;
  type: string;
  provider: string;
  monthly_cost: number;
  annual_cost: number;
  included_in?: string;
  annual_limit?: number;
  start_date: string | null;
  renewal_date: string | null;
  permanencia_end: string | null;
  coverage: string[];
  notes: string;
}

export interface Contract {
  id: string;
  name: string;
  type: string;
  provider: string;
  start_date: string | null;
  permanencia_end: string | null;
  status: string;
  key_terms: string;
  drive_link: string | null;
}

export interface RatesData {
  last_updated: string | null;
  euribor_12m: {
    current: number | null;
    history: { date: string; rate: number }[];
  };
  mortgage_offers: {
    bank: string;
    type: string;
    rate: number;
    bonificaciones: string;
  }[];
  insurance_offers: {
    provider: string;
    type: string;
    annual: number;
    url: string;
  }[];
}

// ── CV Builder ─────────────────────────────────────────────────────────────

export interface JobAnalysis {
  url: string;
  company: string;
  role_title: string;
  industry: string;
  seniority: string;
  required_skills: string[];
  nice_to_have: string[];
  keywords: string[];
  company_tone: string;
  role_focus: string;
}

export interface CvExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface AngleAnalysis {
  summary: string;
}

export interface HrQuestions {
  questions: string[];
}

export interface ContextEntry {
  id: string;
  date: string;
  source_role: string;
  statements: string[];
}

export interface Profile {
  about: { long: string; [key: string]: unknown };
  contact: { name: string; email: string; phone: string; location: string; [key: string]: unknown };
  experience: unknown[];
  skills: unknown;
  education: Array<{ degree: string; institution: string; location: string; year: number }>;
  languages: Array<{ language: string; level: string }>;
  referrals: unknown[];
  context_enrichment?: ContextEntry[];
  [key: string]: unknown;
}

export interface VoiceSample {
  id: string;
  date: string;
  source: "seed" | "cover_letter_answer";
  context?: string;
  text: string;
}

export interface CvVersion {
  id: string;
  job_url: string;
  company: string;
  role_title: string;
  generated_at: string;
  cv_content: CvContent;
  pdf_path: string;
}

export interface Application {
  id: string;
  cv_version_id: string;
  applied_at: string;
  status: "applied" | "interview_1" | "interview_2" | "offer" | "rejected" | "ghosted";
  notes: string;
  salary_discussed: number | null;
}

export interface CvContent {
  about: string;
  skills: string[];
  experience: CvExperience[];
  education: Array<{
    degree: string;
    institution: string;
    location: string;
    year: number;
  }>;
  languages: Array<{
    language: string;
    level: string;
  }>;
  referrals: Array<{
    name: string;
    title: string;
    company: string;
  }>;
  meta: {
    target_company: string;
    target_role: string;
  };
}

// ── Smart Community President ──────────────────────────────────────────────

// Locked vocabularies (CONTEXT D-10). The single source of truth for kind /
// status / owner / source across the type, the validator, the form and the
// Spanish label records in lib/community/loop-defaults.ts.
export type OpenLoopKind =
  | "commitment"
  | "incidencia"
  | "obra"
  | "follow_up"
  | "permiso";
export type OpenLoopStatus =
  | "open"
  | "waiting_on_other"
  | "blocked"
  | "done"
  | "dropped";
export type OpenLoopOwner =
  | "me"
  | "neighbour"
  | "administrador"
  | "provider"
  | "junta";
// PLAT-03 / SC-5: "neighbour_form" is present now even though nothing produces
// it in v1 — an OpenLoop is later created FROM a Submission with this source.
export type OpenLoopSource = "acta" | "email" | "manual" | "neighbour_form";

export interface OpenLoop {
  id: string;
  title: string;
  kind: OpenLoopKind;
  status: OpenLoopStatus; // default "open"
  owner: OpenLoopOwner; // default "me"
  next_action: string; // required to create (D-09)
  source: OpenLoopSource; // default "manual"
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  owner_detail?: string; // shown only when owner is "neighbour" | "provider" (D-11)
  due?: string | null; // plain "YYYY-MM-DD" calendar date, no time component (RESEARCH A3)
  source_ref?: string; // link/id to the originating acta or email thread

  // LPH-aware fields — declared optional now, populated by Phase 3, rendered by
  // nobody in Phase 1. Declaring the shape now is the resolved answer to
  // CONTEXT's "Claude's Discretion" item: Phase 3 adds behaviour, not shape.
  acuerdo_id?: string;
  acta_date?: string;
  majority_type?:
    | "simple"
    | "doble_simple"
    | "tres_quintos"
    | "simple_total"
    | "un_tercio"
    | "unanimidad";
  majority_achieved?: boolean;
  ejecutividad_date?: string;
  impugnacion_deadline?: string;
  ausentes_notified_at?: string;
  budget_annual?: number;
  mensualidad_ordinaria?: number;
}

// Neighbour-portal intake shape (v2). Defined now, empty of president-internal
// data: NEVER add LPH fields, responsible-party routing, or presupuesto
// references here. This shape becomes neighbour-visible in v2, and an OpenLoop
// is created FROM a Submission with source: "neighbour_form". This separation
// is PLAT-03 and Phase 1 success criterion 5.
export interface Submission {
  id: string;
  submitter_name: string;
  submitter_unit: string;
  description: string;
  photos?: string[];
  status: "triage";
  created_at: string;
}
