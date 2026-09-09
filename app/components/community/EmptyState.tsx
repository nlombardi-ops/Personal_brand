interface Props {
  onAdd: () => void;
}

// D-18 first-run state: heading + explainer + one prominent accent action.
export default function EmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-semibold text-neutral-900">
        Aún no hay bucles abiertos
      </h2>
      <p className="max-w-md text-sm leading-6 text-neutral-600">
        Un bucle es cualquier compromiso o incidencia pendiente de tu acción o de
        la respuesta de otra persona. Añade el primero para empezar a seguirlo.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e293b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] focus-visible:ring-offset-2"
      >
        Añadir tu primer bucle
      </button>
    </div>
  );
}
