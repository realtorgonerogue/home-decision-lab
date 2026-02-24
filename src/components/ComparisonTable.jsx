import { Fragment } from "react";

const groupedCategories = [
  {
    title: "Financial",
    tone: "bg-slate-50",
    rows: [
      { key: "priceFit", label: "Price Fit" },
      { key: "resalePotential", label: "Resale Potential" },
    ],
  },
  {
    title: "Home Quality",
    tone: "bg-slate-50",
    rows: [
      { key: "condition", label: "Condition" },
      { key: "layout", label: "Layout" },
    ],
  },
  {
    title: "Lifestyle",
    tone: "bg-slate-50",
    rows: [
      { key: "location", label: "Location" },
      { key: "schools", label: "Schools" },
      { key: "commute", label: "Commute" },
    ],
  },
  {
    title: "Emotional",
    tone: "bg-slate-50",
    rows: [{ key: "emotionalPull", label: "Emotional Pull" }],
  },
];

const allCategoryRows = groupedCategories.flatMap((group) => group.rows);

const categoryLabels = {
  priceFit: "Price Fit",
  condition: "Condition",
  layout: "Layout",
  location: "Location",
  schools: "Schools",
  commute: "Commute",
  resalePotential: "Resale Potential",
  emotionalPull: "Emotional Pull",
};

function getScoreTone(score) {
  if (score <= 4) {
    return {
      bar: "bg-red-400",
      badge: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (score <= 7) {
    return {
      bar: "bg-amber-400",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function getVariance(values) {
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
}

function calculateInsights(properties) {
  const structuralWinner = properties.reduce((best, current) =>
    current.structuralScore > best.structuralScore ? current : best
  );
  const emotionalWinner = properties.reduce((best, current) =>
    current.scores.emotionalPull > best.scores.emotionalPull ? current : best
  );

  const largestGapCategory = allCategoryRows.reduce(
    (best, row) => {
      const scores = properties.map((property) => property.scores[row.key]);
      const diff = Math.max(...scores) - Math.min(...scores);
      return diff > best.diff ? { key: row.key, diff } : best;
    },
    { key: allCategoryRows[0].key, diff: 0 }
  );

  const balancedProperty = properties.reduce((best, current) => {
    const values = allCategoryRows.map((row) => current.scores[row.key]);
    const variance = getVariance(values);
    if (!best || variance < best.variance) {
      return { property: current, variance };
    }
    return best;
  }, null);

  return {
    structuralWinner,
    emotionalWinner,
    largestGapCategory: categoryLabels[largestGapCategory.key],
    balancedProperty: balancedProperty.property,
  };
}

function ScoreBar({ score }) {
  const { bar } = getScoreTone(score);

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${bar}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <span className="w-7 text-right text-xs font-medium text-slate-700">{score}</span>
    </div>
  );
}

function ColumnHeader({ property, isBest }) {
  const structuralScore = Number(property.structuralScore ?? 0);
  const { badge } = getScoreTone(structuralScore);

  return (
    <div className={`rounded-xl border p-3 ${isBest ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
      {property.imageBase64 ? (
        <img
          src={property.imageBase64}
          alt={property.address}
          className="mb-3 h-20 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mb-3 flex h-20 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
          No image
        </div>
      )}

      <p className="text-sm font-semibold leading-tight text-slate-900">{property.address}</p>
      {property.listingUrl && (
        <a
          href={property.listingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
        >
          Listing
        </a>
      )}

      <div
        className={`mt-3 flex h-20 w-20 items-center justify-center rounded-full border-2 ${badge}`}
      >
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide">Structural Score</p>
          <p className="text-2xl font-bold leading-none">{structuralScore.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonTable({ properties, onBack }) {
  const highestStructural = properties.reduce((best, current) =>
    current.structuralScore > best.structuralScore ? current : best
  );
  const insights = calculateInsights(properties);
  const structuralVsEmotionalMismatch =
    insights.emotionalWinner.id !== insights.structuralWinner.id;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Decision Lab</h2>
          <button
            onClick={onBack}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-56 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                  Category
                </th>
                {properties.map((property) => (
                  <th key={property.id} className="border-b border-slate-200 px-3 py-2 text-left align-top">
                    <ColumnHeader
                      property={property}
                      isBest={property.id === highestStructural.id}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedCategories.map((group) => (
                <Fragment key={group.title}>
                  <tr key={`${group.title}-header`} className={`${group.tone}`}>
                    <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {group.title}
                    </td>
                    {properties.map((property) => (
                      <td
                        key={`${property.id}-${group.title}`}
                        className={`px-3 py-2 ${property.id === highestStructural.id ? "bg-emerald-50/40" : group.tone}`}
                      />
                    ))}
                  </tr>

                  {group.rows.map((row) => (
                    <tr key={row.key}>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{row.label}</td>
                      {properties.map((property) => (
                        <td
                          key={`${property.id}-${row.key}`}
                          className={`border-b border-slate-100 px-3 py-3 ${
                            property.id === highestStructural.id ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <ScoreBar score={property.scores[row.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Structural Score</td>
                {properties.map((property) => (
                  <td
                    key={`${property.id}-structural`}
                    className={`px-3 py-3 font-semibold ${
                      property.id === highestStructural.id ? "bg-emerald-50/40 text-emerald-900" : "text-slate-800"
                    }`}
                  >
                    {property.structuralScore.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Decision Insight</h3>
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>
            Winner: <span className="font-medium">{insights.structuralWinner.address}</span> (Structural
            Score {insights.structuralWinner.structuralScore.toFixed(1)})
          </p>
          <p>
            Highest Emotional Pull: <span className="font-medium">{insights.emotionalWinner.address}</span>
          </p>
          <p>
            Largest Gap: <span className="font-medium">{insights.largestGapCategory}</span>
          </p>
          <p>
            Most Balanced: <span className="font-medium">{insights.balancedProperty.address}</span>
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          {structuralVsEmotionalMismatch
            ? "One property wins structurally. The other wins emotionally. Decide which matters more."
            : "Your numbers and instincts are aligned."}
        </p>

        {structuralVsEmotionalMismatch && (
          <p className="mt-2 text-xs text-amber-700">
            You're feeling this one more than the numbers support.
          </p>
        )}
      </div>
    </section>
  );
}
