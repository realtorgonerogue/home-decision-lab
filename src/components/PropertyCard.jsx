function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getScoreColorClasses(score) {
  if (score <= 4) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (score <= 7) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function PropertyCard({ property, onCompare, onDelete }) {
  const structuralScore = Number(property.structuralScore ?? 0);
  const emotionalPull = Number(property.scores?.emotionalPull ?? 0);
  const isEmotionLeading = emotionalPull > structuralScore;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {property.imageBase64 ? (
        <img
          src={property.imageBase64}
          alt={property.address}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
          No image uploaded
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight text-slate-900">{property.address}</h3>
            <p className="mt-2 text-slate-600">Price: {formatCurrency(property.price)}</p>
            {property.listingUrl && (
              <a
                href={property.listingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
              >
                View listing
              </a>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Emotional {emotionalPull.toFixed(1)}</span>
              <span className="text-slate-300">|</span>
              <span>Structural {structuralScore.toFixed(1)}</span>
            </div>
            {isEmotionLeading && (
              <p className="mt-2 text-xs font-medium text-amber-700">Emotion leading</p>
            )}
          </div>

          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2 ${getScoreColorClasses(structuralScore)}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide">Structural Score</span>
            <span className="text-2xl font-bold leading-none">{structuralScore.toFixed(1)}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCompare}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Compare
          </button>
          <button
            onClick={() => onDelete(property.id)}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
