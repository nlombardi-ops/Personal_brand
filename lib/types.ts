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
