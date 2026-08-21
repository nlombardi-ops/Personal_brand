import { FileText, ExternalLink, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import AuthGuard from "../../components/dashboard/AuthGuard";
import ContractsChat from "../../components/dashboard/ContractsChat";
import rawContracts from "../../../data/contracts.json";
import type { Contract } from "@/lib/types";

const contractsData = { contracts: rawContracts.contracts as Contract[] };

function getStatusConfig(contract: typeof contractsData.contracts[0]) {
  if (!contract.permanencia_end) {
    return { icon: CheckCircle, label: "No permanencia", color: "text-emerald-700", bgColor: "bg-emerald-50" };
  }

  const endDate = new Date(contract.permanencia_end);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { icon: CheckCircle, label: "Free to cancel", color: "text-emerald-700", bgColor: "bg-emerald-50" };
  if (daysLeft <= 90) return { icon: Clock, label: `${daysLeft} days left`, color: "text-amber-700", bgColor: "bg-amber-50" };
  return { icon: AlertTriangle, label: `Locked until ${contract.permanencia_end}`, color: "text-red-600", bgColor: "bg-red-50" };
}

const TYPE_LABELS: Record<string, string> = {
  mortgage: "Hipoteca",
  energy: "Energía",
  internet: "Internet / Móvil",
  community: "Comunidad",
  insurance: "Seguro",
};

export default function ContractsPage() {
  const active = contractsData.contracts.filter((c) => c.status === "active");
  const freeToLeave = active.filter((c) => !c.permanencia_end).length;

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Contracts</h1>
        <p className="text-sm text-stone-500">
          All active contracts — permanencia status, key terms & links
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4">
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-3">
          <span className="text-xs text-stone-500">Active</span>
          <span className="ml-2 text-lg font-bold text-stone-900">{active.length}</span>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-3">
          <span className="text-xs text-stone-500">Free to cancel</span>
          <span className="ml-2 text-lg font-bold text-emerald-600">{freeToLeave}</span>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-3">
          <span className="text-xs text-stone-500">With permanencia</span>
          <span className="ml-2 text-lg font-bold text-red-600">{active.length - freeToLeave}</span>
        </div>
      </div>

      {/* Contract Cards */}
      <div className="space-y-3">
        {contractsData.contracts.map((contract) => {
          const status = getStatusConfig(contract);
          const StatusIcon = status.icon;

          return (
            <div
              key={contract.id}
              className="rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                    <FileText className="h-5 w-5 text-stone-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">{contract.name}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-stone-500">{contract.provider}</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs text-stone-500">
                        {TYPE_LABELS[contract.type] || contract.type}
                      </span>
                      {contract.start_date && (
                        <>
                          <span className="text-stone-300">·</span>
                          <span className="text-xs text-stone-500">Since {contract.start_date}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
              </div>

              {contract.key_terms && (
                <div className="mt-3 rounded-lg bg-stone-50 px-4 py-3">
                  <p className="text-xs font-medium text-stone-500 mb-1">Key Terms</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{contract.key_terms}</p>
                </div>
              )}

              {contract.drive_link && (
                <a
                  href={contract.drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in Google Drive
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Q&A assistant */}
      <ContractsChat />
    </div>
    </AuthGuard>
  );
}
