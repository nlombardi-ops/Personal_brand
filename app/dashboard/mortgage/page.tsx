import { Fragment } from "react";
import { Landmark, TrendingDown, Calendar, Home, Shield, CreditCard, Bell } from "lucide-react";
import AuthGuard from "../../components/dashboard/AuthGuard";
import StatCard from "../../components/dashboard/StatCard";
import AmortizationChart from "../../components/dashboard/AmortizationChart";
import rawMortgage from "../../../data/mortgage.json";
import rawRates from "../../../data/rates.json";
import type { MortgageData, RatesData } from "@/lib/types";

const m = rawMortgage as MortgageData;
const rates = rawRates as RatesData;

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function monthsUntil(dateStr: string) {
  const [y, mo] = dateStr.split("-").map(Number);
  const target = new Date(y, mo - 1);
  const now = new Date();
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
}

function currentMortgageYear() {
  const [y, mo] = m.start_date.split("-").map(Number);
  const start = new Date(y, mo - 1);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.ceil(months / 12);
}

export default function MortgagePage() {
  const currentYear = currentMortgageYear();
  const monthsToVariable = monthsUntil(m.fixed_end_date);
  const totalInterest = m.total_repayment - m.principal;
  const currentEntry = m.schedule.find((s) => s.year === currentYear) || m.schedule[0];
  const pctPaid = ((m.principal - currentEntry.balance) / m.principal) * 100;
  const fixedEndYear = Math.round(m.fixed_period_months / 12);
  const yearAfterFixed = m.schedule.find((s) => s.year === fixedEndYear + 1);
  const yearOfFixed = m.schedule.find((s) => s.year === fixedEndYear);

  const chartData = m.schedule
    .filter((s) => s.interest !== undefined)
    .map((s) => ({
      year: s.year,
      interest: s.interest || 0,
      principal_paid: s.principal_paid || 0,
      balance: s.balance,
    }));

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Mortgage</h1>
        <p className="text-sm text-stone-500">
          Hipoteca {m.lender} — {fmt(m.principal)} a {m.term_months} meses
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Payment"
          value={fmt(m.monthly_payment)}
          sub={`Bonified: ${fmt(m.monthly_payment_bonified)}`}
          icon={Landmark}
          color="bg-red-50"
        />
        <StatCard
          label="Outstanding Balance"
          value={fmt(currentEntry.balance)}
          sub={`${pctPaid.toFixed(1)}% paid off (Year ${currentYear})`}
          icon={TrendingDown}
          color="bg-orange-50"
        />
        <StatCard
          label="Fixed Rate Ends"
          value={`${monthsToVariable} months`}
          sub={`${m.fixed_end_date} → Euríbor + ${m.variable_spread}%`}
          icon={Calendar}
          color="bg-amber-50"
        />
        <StatCard
          label="Current Euríbor 12M"
          value={rates.euribor_12m.current ? `${rates.euribor_12m.current}%` : "Pending"}
          sub={rates.last_updated ? `Updated ${rates.last_updated}` : "Scraper pending"}
          icon={TrendingDown}
          color="bg-cyan-50"
        />
      </div>

      {/* Rate Info Banner */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">Current Phase</p>
            <p className="text-lg font-bold text-amber-600">Fixed Rate: {m.fixed_rate}%</p>
            <p className="text-sm text-stone-600">Bonified: {m.fixed_rate_bonified}%</p>
            <p className="text-xs text-stone-500 mt-1">Until {m.fixed_end_date}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">After Fixed Period</p>
            <p className="text-lg font-bold text-blue-600">Euríbor 12M + {m.variable_spread}%</p>
            <p className="text-sm text-stone-600">Max bonification: -{m.max_bonification}%</p>
            <p className="text-xs text-stone-500 mt-1">Reviewed annually</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">Total Cost</p>
            <p className="text-lg font-bold text-red-600">{fmt(totalInterest)}</p>
            <p className="text-sm text-stone-600">in interest over {m.term_months} months</p>
            <p className="text-xs text-stone-500 mt-1">TAE: {m.tae}% (bonified: {m.tae_bonified}%)</p>
          </div>
        </div>
      </div>

      {/* Amortization Chart */}
      <AmortizationChart
        data={chartData}
        fixedEndYear={fixedEndYear}
        fixedRateLabel={`${m.fixed_rate_bonified}%`}
        variableRateLabel={`Euríbor 12M + ${m.variable_spread}%`}
      />

      {/* Amortization Table */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Amortization Schedule</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-stone-500">Year</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-stone-500">Annual Payment</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-emerald-600">Principal</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-red-600">Interest</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-stone-500">Balance</th>
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-stone-500">Note</th>
              </tr>
            </thead>
            <tbody>
              {m.schedule.map((row) => (
                <Fragment key={row.year}>
                  <tr
                    className={`border-b border-stone-100 transition-colors ${
                      row.year === currentYear ? "bg-blue-50" : "hover:bg-stone-50"
                    } ${row.year === fixedEndYear + 1 ? "border-t-2 border-t-amber-400" : ""}`}
                  >
                    <td className="px-3 py-2 text-stone-700">
                      {row.year}
                      {row.year === currentYear && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">NOW</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-600">{fmt(row.annual_payment)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{row.principal_paid ? fmt(row.principal_paid) : "—"}</td>
                    <td className="px-3 py-2 text-right text-red-600">{row.interest ? fmt(row.interest) : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium text-stone-700">{fmt(row.balance)}</td>
                    <td className="px-3 py-2 text-xs text-stone-500">{row.note || ""}</td>
                  </tr>
                  {row.year === fixedEndYear && yearOfFixed && yearAfterFixed && (
                    <tr key={`${row.year}-transition`} className="border-t-2 border-b-2 border-amber-300 bg-amber-50">
                      <td colSpan={6} className="px-3 py-2 text-xs text-amber-800">
                        ⬇ Fixed period ends — rate resets from {m.fixed_rate_bonified}% to Euríbor 12M + {m.variable_spread}%.
                        Annual payment goes from {fmt(yearOfFixed.annual_payment)} to {fmt(yearAfterFixed.annual_payment)}, and
                        interest jumps from {fmt(yearOfFixed.interest || 0)} to {fmt(yearAfterFixed.interest || 0)} — so principal
                        paid actually drops from {fmt(yearOfFixed.principal_paid || 0)} to {fmt(yearAfterFixed.principal_paid || 0)}
                        even though the payment is higher.
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonificadores */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Bonificadores (Rate Discounts)</h3>
        <p className="mb-4 text-xs text-stone-500">
          Max total bonification: -{m.max_bonification}% on interest rate. Each can be added/removed independently.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {m.bonificadores.map((b, i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">{b.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{b.requirements}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  -{b.bonification}%
                </span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500">Lifetime cost: {b.cost_total}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Contract Terms */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Key Terms</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Property Value</span>
              <span className="text-stone-700">{fmt(m.property_value)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">LTV</span>
              <span className="text-stone-700">{m.ltv_pct}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Early Repayment Fee</span>
              <span className="text-stone-700">Max {m.early_repayment_fee_pct}% (first {m.early_repayment_fee_period_years} years)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subrogation</span>
              <span className="text-emerald-600">Allowed (Ley 2/1994)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Mandatory Insurance</span>
              <span className="text-stone-700">Seguro daños: {fmt(m.obligaciones.seguro_hogar_anual)}/year</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Linked Account</span>
              <span className="text-stone-700">{m.obligaciones.cuenta_pago.split("(")[1]?.replace(")", "") || "60€/year"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Seguro Vida (optional)</span>
              <span className="text-stone-700">{fmt(m.obligaciones.seguro_vida_anual)}/year</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Demora Interest</span>
              <span className="text-red-600">{m.early_repayment_fee_pct > 0 ? "Rate + 3%" : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
