import { PDFParse } from "pdf-parse";
import type { EnergyBill, InternetBill, CommunityBill } from "@/lib/types";

// ─── Text extraction ───────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

export function extractTextFromHtml(buffer: Buffer): string {
  return buffer
    .toString("utf-8")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text: string): string {
  return text
    .replace(/\xa0/g, " ")
    .replace(/​/g, "")
    .replace(/­/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

// ─── Pepephone / MasMovil ─────────────────────────────────────────────────

export function parsePepephoneBill(text: string): Omit<InternetBill, never> | null {
  text = normalizeText(text);

  let total: number | null = null;
  let month: string | null = null;
  let plan: string | null = null;

  // Total
  let m = text.match(/(\d+[.,]\d{2})\s*€\s+TOTAL A PAGAR/);
  if (m) total = parseFloat(m[1].replace(",", "."));
  if (!total) {
    m = text.match(/Total factura\s+(\d+[.,]\d{2})\s*€/);
    if (m) total = parseFloat(m[1].replace(",", "."));
  }

  // Month (use end date of billing period)
  m = text.match(
    /Periodo\s+facturado\s*:\s*Del\s+\d{2}\/\d{2}\/\d{4}\s+al\s+(\d{2})\/(\d{2})\/(\d{4})/
  );
  if (m) {
    month = `${m[3]}-${m[2]}`;
  } else {
    m = text.match(/Del\s+\d{2}\/\d{2}\/\d{4}\s+al\s+(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) month = `${m[3]}-${m[2]}`;
    else {
      m = text.match(/Fecha de emisi.n:\s*(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) month = `${m[3]}-${m[2]}`;
    }
  }

  // Plan
  m = text.match(/(FIBRA\s+\d+\s*[GgMm]b\s*\+\s*TARIFA\s+M.S\s+\d+\s*GB)/);
  if (m) plan = m[1].trim();

  if (!total || !month) return null;
  return { month, total, provider: "Pepephone", plan: plan ?? undefined };
}

// ─── Community / Adm. Colmenarejo ─────────────────────────────────────────

const MONTH_MAP_ES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04",
  mayo: "05", junio: "06", julio: "07", agosto: "08",
  septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

export function parseCommunityBill(text: string): Omit<CommunityBill, never> | null {
  text = normalizeText(text);

  let cuota = 0;
  let water = 0;
  let extraordinary = 0;
  let month: string | null = null;

  let m = text.match(/CUOTA\s+ORDINARIA\s+(\d+[.,]\d{1,2})/);
  if (m) cuota = parseFloat(m[1].replace(",", "."));

  m = text.match(/AGUA\s+\S+\s+\S+\s+\S+\s+(\d+[.,]\d{1,2})/);
  if (!m) m = text.match(/AGUA.*?(\d+[.,]\d{1,2})\s*$/m);
  if (m) water = parseFloat(m[1].replace(",", "."));

  m = text.match(/(?:EXTRAORDINARI[AO]|DERRAMA)\s+.*?(\d+[.,]\d{1,2})/);
  if (m) extraordinary = parseFloat(m[1].replace(",", "."));

  // Month from "Recibo AXXXXXXX-N de DD de MES de YYYY"
  m = text.match(
    /Recibo\s+\S+\s+de\s+\d{1,2}\s+de\s+(\w+)\s+de\s+(\d{4})/
  );
  if (m) {
    const monthNum = MONTH_MAP_ES[m[1].toLowerCase()];
    if (monthNum) month = `${m[2]}-${monthNum}`;
  }

  if (!month) {
    m = text.match(/Fecha de emisi.n[:\s]+\d{1,2}\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (m) {
      const monthNum = MONTH_MAP_ES[m[1].toLowerCase()];
      if (monthNum) month = `${m[2]}-${monthNum}`;
    }
  }

  if (!month) {
    // Fallback: DD/MM/YY from AGUA line
    m = text.match(/AGUA\s+(\d{2})\/(\d{2})\/(\d{2})/);
    if (m) {
      const yr = parseInt(m[3]) < 50 ? `20${m[3]}` : `19${m[3]}`;
      month = `${yr}-${m[2]}`;
    }
  }

  if (!month || (cuota === 0 && water === 0)) return null;
  return { month, cuota, water, extraordinary, provider: "Adm. Colmenarejo" };
}

// ─── Endesa ───────────────────────────────────────────────────────────────

export function parseEndesaBill(text: string): Omit<EnergyBill, never> | null {
  text = normalizeText(text);

  let total: number | null = null;
  let month: string | null = null;
  let potencia: number | null = null;
  let consumo: number | null = null;
  let iva: number | null = null;

  // Total
  for (const pat of [
    /Total a pagar\s*[:\s]*(\d+[.,]\d{2})\s*€/i,
    /Importe total\s*[:\s]*(\d+[.,]\d{2})\s*€/i,
    /TOTAL\s+A\s+PAGAR\s*[:\s]*(\d+[.,]\d{2})\s*€/i,
    /Total factura\s*[:\s]*(\d+[.,]\d{2})\s*€/i,
    /Importe de la factura\s*[:\s]*(\d+[.,]\d{2})\s*€/i,
  ]) {
    const m = text.match(pat);
    if (m) { total = parseFloat(m[1].replace(",", ".")); break; }
  }

  // Month (use end date of billing period)
  let m = text.match(
    /[Dd]el?\s+(\d{2})[/\-](\d{2})[/\-](\d{2,4})\s+al?\s+(\d{2})[/\-](\d{2})[/\-](\d{2,4})/
  );
  if (m) {
    const yr = m[6].length === 2 ? `20${m[6]}` : m[6];
    month = `${yr}-${m[5]}`;
  } else {
    m = text.match(
      /[Pp]er[íi]odo.*?(\d{2})[/\-](\d{2})[/\-](\d{2,4})\s*[-–]\s*(\d{2})[/\-](\d{2})[/\-](\d{2,4})/
    );
    if (m) {
      const yr = m[6].length === 2 ? `20${m[6]}` : m[6];
      month = `${yr}-${m[5]}`;
    } else {
      m = text.match(/Fecha de factura[:\s]+(\d{2})[/\-](\d{2})[/\-](\d{4})/i);
      if (m) month = `${m[3]}-${m[2]}`;
    }
  }

  // Potencia (fixed charge) — use [\s\S] instead of dotAll flag for compat
  for (const pat of [
    /[Tt][ée]rmino de potencia[\s\S]*?(\d+[.,]\d{2})\s*€/,
    /Potencia contratada[\s\S]*?(\d+[.,]\d{2})\s*€/,
    /Potencia[\s\S]*?(\d+[.,]\d{2})\s*€/,
  ]) {
    const mx = text.match(pat);
    if (mx) { potencia = parseFloat(mx[1].replace(",", ".")); break; }
  }

  // Consumo / Energía (variable charge)
  for (const pat of [
    /[Tt][ée]rmino de energ[íi]a[\s\S]*?(\d+[.,]\d{2})\s*€/,
    /Energ[íi]a activa[\s\S]*?(\d+[.,]\d{2})\s*€/,
    /Consumo[\s\S]*?(\d+[.,]\d{2})\s*€/,
  ]) {
    const mx = text.match(pat);
    if (mx) { consumo = parseFloat(mx[1].replace(",", ".")); break; }
  }

  // IVA
  m = text.match(/IVA.*?(\d+[.,]\d{2})\s*€/i);
  if (m) iva = parseFloat(m[1].replace(",", "."));

  if (!total || !month) return null;
  return {
    month,
    total,
    potencia: potencia ?? 0,
    consumo: consumo ?? 0,
    iva: iva ?? 0,
    provider: "Endesa",
  };
}
