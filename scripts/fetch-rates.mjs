#!/usr/bin/env node
/**
 * Refreshes data/rates.json with the 12-month Euribor from the ECB Data Portal.
 *
 * Source: ECB Data Portal (data-api.ecb.europa.eu), series
 * FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA — official, free, no API key.
 *
 * Monthly averages on purpose: Spanish variable-rate mortgages are revised
 * against the published monthly average, not the daily fixing, so this is the
 * number that actually moves Nicola's cuota.
 *
 * Only euribor_12m and last_updated are touched. mortgage_offers and
 * insurance_offers are hand-maintained and are preserved verbatim.
 *
 *   node scripts/fetch-rates.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// The dataflow is a path segment, the series key is the next one:
// /service/data/{FLOW}/{KEY}. Joining them with a dot returns HTTP 400.
const FLOW = "FM";
const SERIES = "M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA";
const MONTHS = 25; // current + two years of history
const URL = `https://data-api.ecb.europa.eu/service/data/${FLOW}/${SERIES}?lastNObservations=${MONTHS}&format=jsondata`;
const RATES_PATH = join(process.cwd(), "data/rates.json");

function round(n) {
  return Math.round(n * 1000) / 1000;
}

async function main() {
  const res = await fetch(URL, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`ECB returned HTTP ${res.status}. Series key may have changed: ${FLOW}/${SERIES}`);
  }

  const payload = await res.json();
  const seriesKey = Object.keys(payload.dataSets?.[0]?.series ?? {})[0];
  if (!seriesKey) throw new Error("No series in ECB response");

  const observations = payload.dataSets[0].series[seriesKey].observations;
  const periods = payload.structure.dimensions.observation[0].values;

  const history = Object.entries(observations)
    .map(([idx, value]) => ({ date: periods[Number(idx)].id, rate: round(value[0]) }))
    .filter((h) => typeof h.rate === "number" && Number.isFinite(h.rate))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (history.length === 0) throw new Error("ECB response contained no usable observations");

  const latest = history[history.length - 1];

  // Keep whatever was typed in by hand; only the scraped half is replaced.
  const existing = JSON.parse(readFileSync(RATES_PATH, "utf-8"));
  const next = {
    ...existing,
    last_updated: new Date().toISOString().slice(0, 10),
    euribor_12m: {
      current: latest.rate,
      as_of: latest.date,
      source: "ECB Data Portal — monthly average",
      history,
    },
  };

  writeFileSync(RATES_PATH, JSON.stringify(next, null, 2) + "\n");

  const twelveAgo = history[history.length - 13];
  const delta = twelveAgo ? round(latest.rate - twelveAgo.rate) : null;
  console.log(`Euribor 12M: ${latest.rate}% (${latest.date})`);
  if (delta !== null) {
    console.log(`Year on year: ${delta >= 0 ? "+" : ""}${delta} pts vs ${twelveAgo.date}`);
  }
  console.log(`${history.length} months of history written to data/rates.json`);
  console.log(
    `mortgage_offers: ${next.mortgage_offers.length} · insurance_offers: ${next.insurance_offers.length} (hand-maintained, untouched)`
  );
}

main().catch((err) => {
  console.error(`fetch-rates failed: ${err.message}`);
  process.exit(1);
});
