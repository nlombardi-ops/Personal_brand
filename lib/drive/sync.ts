import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import { DriveClient } from "./client";
import {
  extractTextFromPdf,
  extractTextFromHtml,
  parsePepephoneBill,
  parseCommunityBill,
  parseMasmovilEnergyBill,
  parseAdeslasBill,
} from "./parsers";
import type { BillsData, EnergyBill, InternetBill, CommunityBill, InsuranceBill } from "@/lib/types";

// insurance's Drive folder does not exist yet — organizer.py creates it on
// its first run once an Insurance provider entry is present in the user's
// (gitignored) config.json. Paste the resulting folder ID here afterwards.
// Never write a real-looking Drive ID here; a fabricated 33-character ID
// would send the sync at a random or non-existent folder.
const FOLDERS = {
  phone_internet: "1UKLsmvyQ_1er64dyPHLZJe17xG_Uqeby",
  community: "1b_TuM2oeIwUI1klonWONT1XTTX0ErSUY",
  energy: "1EBzivC0dyH0cRiTlI2tAhwL1AOFDXcY6",
  insurance: null as string | null,
};

const BLOB_PATHNAME = "bills.json";

// ─── Storage helpers ───────────────────────────────────────────────────────

export async function getBillsData(): Promise<BillsData> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false), so the CDN would
      // otherwise keep serving the pre-sync copy after every write.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as BillsData;
      }
    } catch {
      // fall through to local
    }
  }
  const raw = readFileSync(join(process.cwd(), "data/bills.json"), "utf-8");
  return JSON.parse(raw) as BillsData;
}

async function storeBillsData(data: BillsData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    // Local dev fallback
    writeFileSync(join(process.cwd(), "data/bills.json"), json);
  }
}

// ─── Category syncs ────────────────────────────────────────────────────────

async function syncInternet(drive: DriveClient): Promise<InternetBill[]> {
  const files = await drive.listFiles(FOLDERS.phone_internet, [".pdf"]);
  const bills: InternetBill[] = [];

  for (const f of files) {
    try {
      const buf = await drive.downloadFile(f.id);
      const text = await extractTextFromPdf(buf);
      const parsed = parsePepephoneBill(text);
      if (parsed) bills.push(parsed);
    } catch {
      // skip unparseable file
    }
  }

  return bills.sort((a, b) => a.month.localeCompare(b.month));
}

async function syncCommunity(drive: DriveClient): Promise<CommunityBill[]> {
  const allFiles = await drive.listFiles(FOLDERS.community, [".html", ".htm"]);
  const files = allFiles.filter((f) => f.name.includes("Nuevo recibo"));
  const bills: CommunityBill[] = [];

  for (const f of files) {
    try {
      const buf = await drive.downloadFile(f.id);
      const text = extractTextFromHtml(buf);
      const parsed = parseCommunityBill(text);
      if (parsed) bills.push(parsed);
    } catch {
      // skip unparseable file
    }
  }

  return bills.sort((a, b) => a.month.localeCompare(b.month));
}

async function syncEnergy(drive: DriveClient): Promise<EnergyBill[]> {
  const files = await drive.listFiles(FOLDERS.energy, [".pdf"]);
  const bills: EnergyBill[] = [];

  for (const f of files) {
    try {
      const buf = await drive.downloadFile(f.id);
      const text = await extractTextFromPdf(buf);
      const parsed = parseMasmovilEnergyBill(text);
      if (parsed) bills.push(parsed);
    } catch {
      // skip unparseable file
    }
  }

  return bills.sort((a, b) => a.month.localeCompare(b.month));
}

async function syncInsurance(drive: DriveClient, folderId: string): Promise<InsuranceBill[]> {
  const files = await drive.listFiles(folderId, [".pdf"]);
  const bills: InsuranceBill[] = [];

  for (const f of files) {
    try {
      const buf = await drive.downloadFile(f.id);
      const text = await extractTextFromPdf(buf);
      const parsed = parseAdeslasBill(text);
      if (parsed) bills.push(parsed);
    } catch {
      // skip unparseable file
    }
  }

  return bills.sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Main entry point ──────────────────────────────────────────────────────

export interface SyncResult {
  synced: { internet: number; community: number; energy: number; insurance: number };
}

export async function syncBills(category: "all" | "internet" | "community" | "energy" | "insurance" = "all"): Promise<SyncResult> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN");
  }

  const drive = await DriveClient.create();
  const current = await getBillsData();

  let internet = current.internet;
  let community = current.community;
  let energy = current.energy;
  // BillsData.insurance predates the field, so a stored document may not
  // have it — default defensively.
  let insurance = current.insurance ?? [];

  if (category === "all" || category === "internet") {
    internet = await syncInternet(drive);
  }
  if (category === "all" || category === "community") {
    community = await syncCommunity(drive);
  }
  if (category === "all" || category === "energy") {
    energy = await syncEnergy(drive);
  }
  if ((category === "all" || category === "insurance") && FOLDERS.insurance) {
    insurance = await syncInsurance(drive, FOLDERS.insurance);
  }

  await storeBillsData({ internet, community, energy, insurance });

  return {
    synced: {
      internet: internet.length,
      community: community.length,
      energy: energy.length,
      insurance: insurance.length,
    },
  };
}
