import { Fragment, useEffect, useMemo, useState } from "react";

const WEIGHTS_STORAGE_KEY = "home-decision-lab-weights";
const WEIGHT_EPSILON = 0.01;

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
const categoryLabels = Object.fromEntries(allCategoryRows.map((row) => [row.key, row.label]));

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getEqualWeights() {
  const keys = allCategoryRows.map((row) => row.key);
  const baseWeight = roundTo(100 / keys.length);
  const weights = {};
  keys.forEach((key) => {
    weights[key] = baseWeight;
  });
  const runningTotal = keys.reduce((sum, key) => sum + weights[key], 0);
  const delta = roundTo(100 - runningTotal);
  weights[keys[keys.length - 1]] = roundTo(weights[keys[keys.length - 1]] + delta);
  return weights;
}

function normalizeWeights(rawWeights) {
  if (!rawWeights || typeof rawWeights !== "object") {
    return getEqualWeights();
  }

  const keys = allCategoryRows.map((row) => row.key);
  const hasMissing = keys.some((key) => rawWeights[key] === undefined);
  if (hasMissing) {
    return getEqualWeights();
  }

  const parsed = {};
  keys.forEach((key) => {
    const parsedValue = Number(rawWeights[key]);
    parsed[key] = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
  });

  const total = keys.reduce((sum, key) => sum + parsed[key], 0);
  if (total <= 0) {
    return getEqualWeights();
  }

  const normalized = {};
  keys.forEach((key) => {
    normalized[key] = roundTo((parsed[key] / total) * 100);
  });
  const normalizedTotal = keys.reduce((sum, key) => sum + normalized[key], 0);
  const delta = roundTo(100 - normalizedTotal);
  normalized[keys[keys.length - 1]] = roundTo(normalized[keys[keys.length - 1]] + delta);
  return normalized;
}

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

function ScoreCell({ score, weight }) {
  const { bar } = getScoreTone(score);
  const contribution = roundTo((weight / 100) * score);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full ${bar}`} style={{ width: `${(score / 10) * 100}%` }} />
        </div>
        <span className="w-7 text-right text-xs font-medium text-slate-700">{score}</span>
      </div>
      <p className="text-[11px] text-slate-500">
        {roundTo(weight)}% × {score} = {contribution.toFixed(2)}
      </p>
    </div>
  );
}

function ColumnHeader({ property, isBest }) {
  const structuralScore = Number(property.structuralScore ?? 0);
  const { badge } = getScoreTone(structuralScore);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isBest ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
      }`}
    >
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

      <div className={`mt-3 flex h-20 w-20 items-center justify-center rounded-full border-2 ${badge}`}>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide">Structural Score</p>
          <p className="text-2xl font-bold leading-none">{structuralScore.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}

function buildDecisionBullets(properties, winner, runnerUp, weights) {
  if (!winner || !runnerUp) {
    return [];
  }

  const rankedFactors = allCategoryRows
    .map((row) => {
      const scoreDiff = winner.scores[row.key] - runnerUp.scores[row.key];
      const weightedDiff = (weights[row.key] / 100) * scoreDiff;
      return {
        key: row.key,
        scoreDiff,
        weightedDiff,
      };
    })
    .sort((a, b) => b.weightedDiff - a.weightedDiff)
    .filter((factor) => factor.weightedDiff > 0)
    .slice(0, 3);

  return rankedFactors.map((factor) => {
    const weight = roundTo(weights[factor.key]);
    const scoreDiff = roundTo(factor.scoreDiff, 1);
    const weightedDiff = roundTo(factor.weightedDiff, 2);
    return `${categoryLabels[factor.key]} (${weight}%): score gap ${scoreDiff > 0 ? "+" : ""}${scoreDiff}, weighted impact +${weightedDiff.toFixed(2)}.`;
  });
}

export default function ComparisonTable({ properties, onBack }) {
  const [weights, setWeights] = useState(() => getEqualWeights());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WEIGHTS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      setWeights(normalizeWeights(parsed));
    } catch {
      setWeights(getEqualWeights());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
  }, [weights]);

  const weightTotal = useMemo(
    () => roundTo(allCategoryRows.reduce((sum, row) => sum + (Number(weights[row.key]) || 0), 0)),
    [weights]
  );
  const isWeightTotalValid = Math.abs(weightTotal - 100) < WEIGHT_EPSILON;

  const weightedTotals = useMemo(() => {
    const totals = {};
    properties.forEach((property) => {
      totals[property.id] = allCategoryRows.reduce((sum, row) => {
        const weight = Number(weights[row.key]) || 0;
        return sum + (weight / 100) * property.scores[row.key];
      }, 0);
    });
    return totals;
  }, [properties, weights]);

  const sortedByWeighted = useMemo(() => {
    if (!isWeightTotalValid) return [];
    return [...properties].sort((a, b) => weightedTotals[b.id] - weightedTotals[a.id]);
  }, [isWeightTotalValid, properties, weightedTotals]);

  const weightedWinner = sortedByWeighted[0] || null;
  const runnerUp = sortedByWeighted[1] || null;
  const winnerDelta = weightedWinner && runnerUp ? roundTo(weightedTotals[weightedWinner.id] - weightedTotals[runnerUp.id]) : 0;

  const highestStructural = properties.reduce((best, current) =>
    current.structuralScore > best.structuralScore ? current : best
  );

  const summaryBullets = useMemo(
    () => buildDecisionBullets(properties, weightedWinner, runnerUp, weights),
    [properties, weightedWinner, runnerUp, weights]
  );

  const handleWeightChange = (key, value) => {
    const parsedValue = Number(value);
    const safeValue = Number.isFinite(parsedValue) ? Math.min(100, Math.max(0, parsedValue)) : 0;
    setWeights((prev) => ({
      ...prev,
      [key]: safeValue,
    }));
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Decision Lab</h2>
            <p className="mt-1 text-sm text-slate-500">Weight Total: {weightTotal.toFixed(2)}%</p>
          </div>

          <button
            onClick={onBack}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        {!isWeightTotalValid && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Weights must total exactly 100% to compute weighted totals and winner.
          </div>
        )}

        {isWeightTotalValid && weightedWinner && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Winner: <span className="font-semibold">{weightedWinner.address}</span>
            {runnerUp && <span> by +{winnerDelta.toFixed(2)}</span>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-64 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                  Category / Weight
                </th>
                {properties.map((property) => (
                  <th key={property.id} className="border-b border-slate-200 px-3 py-2 text-left align-top">
                    <ColumnHeader property={property} isBest={property.id === highestStructural.id} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedCategories.map((group) => (
                <Fragment key={group.title}>
                  <tr className={group.tone}>
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
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <span>{row.label}</span>
                          <label className="flex items-center gap-1 text-xs text-slate-500">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={weights[row.key] ?? 0}
                              onChange={(event) => handleWeightChange(row.key, event.target.value)}
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-xs text-slate-700 outline-none focus:border-slate-500"
                            />
                            %
                          </label>
                        </div>
                      </td>

                      {properties.map((property) => (
                        <td
                          key={`${property.id}-${row.key}`}
                          className={`border-b border-slate-100 px-3 py-3 ${
                            property.id === highestStructural.id ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <ScoreCell score={property.scores[row.key]} weight={weights[row.key] ?? 0} />
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

              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Weighted Total (WADM)</td>
                {properties.map((property) => (
                  <td
                    key={`${property.id}-weighted`}
                    className={`px-3 py-3 font-semibold ${
                      isWeightTotalValid && weightedWinner?.id === property.id
                        ? "bg-emerald-50/50 text-emerald-900"
                        : "text-slate-800"
                    }`}
                  >
                    {isWeightTotalValid ? weightedTotals[property.id].toFixed(2) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Decision Summary</h3>

        {!isWeightTotalValid && (
          <p className="mt-3 text-sm text-slate-600">
            Set weights to exactly 100% to generate the weighted factor summary.
          </p>
        )}

        {isWeightTotalValid && weightedWinner && !runnerUp && (
          <p className="mt-3 text-sm text-slate-600">
            Add another property to compare factor-level weighted contribution differences.
          </p>
        )}

        {isWeightTotalValid && weightedWinner && runnerUp && (
          <>
            <p className="mt-3 text-sm text-slate-700">
              Winner: <span className="font-medium">{weightedWinner.address}</span> against{" "}
              <span className="font-medium">{runnerUp.address}</span>.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {summaryBullets.length > 0 ? (
                summaryBullets.map((bullet) => <li key={bullet}>{bullet}</li>)
              ) : (
                <li>No positive weighted factor differences separated the top two properties.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
