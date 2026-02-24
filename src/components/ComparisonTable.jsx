import { Fragment, useEffect, useMemo, useState } from "react";

const WEIGHTS_STORAGE_KEY = "home-decision-lab-weights";

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

const presets = {
  balanced: () =>
    Object.fromEntries(allCategoryRows.map((row) => [row.key, 1])),
  budgetFirst: () => ({
    priceFit: 5,
    resalePotential: 4,
    condition: 2,
    layout: 2,
    location: 1.5,
    schools: 1,
    commute: 1,
    emotionalPull: 1,
  }),
  lifestyleFirst: () => ({
    priceFit: 1,
    resalePotential: 1,
    condition: 1.5,
    layout: 1.5,
    location: 4,
    schools: 3,
    commute: 3,
    emotionalPull: 4,
  }),
  resaleFocused: () => ({
    priceFit: 2,
    resalePotential: 5,
    condition: 4,
    layout: 1.5,
    location: 1.5,
    schools: 1,
    commute: 1,
    emotionalPull: 1,
  }),
  familyMode: () => ({
    priceFit: 1.5,
    resalePotential: 2,
    condition: 2,
    layout: 2,
    location: 3,
    schools: 5,
    commute: 4,
    emotionalPull: 1.5,
  }),
};

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getEqualRawWeights() {
  return Object.fromEntries(allCategoryRows.map((row) => [row.key, 1]));
}

function normalizeRawWeights(rawWeights) {
  const sanitized = {};
  allCategoryRows.forEach((row) => {
    const raw = Number(rawWeights?.[row.key]);
    sanitized[row.key] = Number.isFinite(raw) && raw > 0 ? raw : 0;
  });

  const sum = Object.values(sanitized).reduce((acc, value) => acc + value, 0);
  if (sum === 0) {
    const equal = 1 / allCategoryRows.length;
    return Object.fromEntries(allCategoryRows.map((row) => [row.key, equal]));
  }

  return Object.fromEntries(
    allCategoryRows.map((row) => [row.key, sanitized[row.key] / sum])
  );
}

function hydrateRawWeights(storedWeights) {
  if (!storedWeights || typeof storedWeights !== "object") {
    return getEqualRawWeights();
  }

  const hydrated = {};
  allCategoryRows.forEach((row) => {
    const raw = Number(storedWeights[row.key]);
    hydrated[row.key] = Number.isFinite(raw) && raw >= 0 ? raw : 0;
  });
  return hydrated;
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

function ColumnHeader({ property, isWinner }) {
  const structuralScore = Number(property.structuralScore ?? 0);
  const { badge } = getScoreTone(structuralScore);

  return (
    <div
      className={`rounded-xl border p-3 transition-colors duration-300 ${
        isWinner ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
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

function ScoreCell({ score, normalizedWeight }) {
  const { bar } = getScoreTone(score);
  const contribution = roundTo(normalizedWeight * score);
  const percent = roundTo(normalizedWeight * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all duration-300 ${bar}`}
            style={{ width: `${(score / 10) * 100}%` }}
          />
        </div>
        <span className="w-7 text-right text-xs font-medium text-slate-700">{score}</span>
      </div>
      <p
        className="text-[11px] text-slate-500"
        title={`${percent.toFixed(2)}% × ${score} = ${contribution.toFixed(2)}`}
      >
        {contribution.toFixed(2)} pts
      </p>
    </div>
  );
}

function getTopContributors(winner, runnerUp, normalizedWeights) {
  if (!winner || !runnerUp) return [];

  return allCategoryRows
    .map((row) => {
      const scoreDiff = winner.scores[row.key] - runnerUp.scores[row.key];
      const weightedDelta = normalizedWeights[row.key] * scoreDiff;
      return { key: row.key, scoreDiff, weightedDelta };
    })
    .sort((a, b) => b.weightedDelta - a.weightedDelta)
    .filter((item) => item.weightedDelta > 0)
    .slice(0, 3);
}

export default function ComparisonTable({ properties, onBack }) {
  const [rawWeights, setRawWeights] = useState(() => getEqualRawWeights());
  const [selectedPreset, setSelectedPreset] = useState("balanced");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WEIGHTS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      setRawWeights(hydrateRawWeights(parsed));
    } catch {
      setRawWeights(getEqualRawWeights());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(rawWeights));
  }, [rawWeights]);

  const normalizedWeights = useMemo(() => normalizeRawWeights(rawWeights), [rawWeights]);

  const rawWeightTotal = useMemo(
    () =>
      roundTo(
        allCategoryRows.reduce((sum, row) => sum + (Number(rawWeights[row.key]) || 0), 0),
        2
      ),
    [rawWeights]
  );

  const sliderMax = useMemo(() => {
    const maxRaw = Math.max(...allCategoryRows.map((row) => Number(rawWeights[row.key]) || 0), 1);
    return Math.max(10, Math.ceil(maxRaw * 1.25));
  }, [rawWeights]);

  const weightedTotals = useMemo(() => {
    return Object.fromEntries(
      properties.map((property) => [
        property.id,
        allCategoryRows.reduce(
          (sum, row) => sum + normalizedWeights[row.key] * property.scores[row.key],
          0
        ),
      ])
    );
  }, [properties, normalizedWeights]);

  const sortedByWeighted = useMemo(
    () => [...properties].sort((a, b) => weightedTotals[b.id] - weightedTotals[a.id]),
    [properties, weightedTotals]
  );

  const winner = sortedByWeighted[0] || null;
  const runnerUp = sortedByWeighted[1] || null;
  const winnerMargin =
    winner && runnerUp ? roundTo(weightedTotals[winner.id] - weightedTotals[runnerUp.id], 2) : 0;

  const topContributors = useMemo(
    () => getTopContributors(winner, runnerUp, normalizedWeights),
    [winner, runnerUp, normalizedWeights]
  );

  const highestWeightFactor = useMemo(() => {
    return allCategoryRows.reduce((best, row) => {
      if (!best) return row;
      return normalizedWeights[row.key] > normalizedWeights[best.key] ? row : best;
    }, null);
  }, [normalizedWeights]);

  const flipInsight = useMemo(() => {
    if (!winner || !runnerUp || !highestWeightFactor) return null;

    const key = highestWeightFactor.key;
    const weight = normalizedWeights[key];
    const currentScore = runnerUp.scores[key];

    if (weight === 0) return null;

    const minimumIncrease = roundTo(winnerMargin / weight + 0.01, 2);
    const reachableIncrease = roundTo(10 - currentScore, 2);
    const requiredScore = roundTo(currentScore + minimumIncrease, 2);

    return {
      key,
      weightPercent: roundTo(weight * 100, 2),
      minimumIncrease,
      reachableIncrease,
      requiredScore,
      possible: requiredScore <= 10,
      runnerUpName: runnerUp.address,
    };
  }, [winner, runnerUp, highestWeightFactor, normalizedWeights, winnerMargin]);

  const handleWeightChange = (key, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setSelectedPreset("");
    setRawWeights((prev) => ({
      ...prev,
      [key]: safeValue,
    }));
  };

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = presets[presetKey];
    if (!preset) return;
    setRawWeights(preset());
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Decision Lab</h2>
            <p className="mt-1 text-sm text-slate-500">Smart Weights: Auto-normalized to 100%</p>
            <p className="mt-0.5 text-xs text-slate-400">Current total input: {rawWeightTotal.toFixed(2)}</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm text-slate-600">
              Weight Presets
              <select
                value={selectedPreset}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="balanced">Balanced</option>
                <option value="budgetFirst">Budget First</option>
                <option value="lifestyleFirst">Lifestyle First</option>
                <option value="resaleFocused">Resale Focused</option>
                <option value="familyMode">Family Mode</option>
              </select>
            </label>
            <button
              onClick={onBack}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {winner && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-sm font-semibold text-emerald-900">Winner: {winner.address}</p>
            <p className="text-sm text-emerald-800">Margin: +{winnerMargin.toFixed(2)} weighted points</p>
            <p className="text-xs text-emerald-700">Based on your assigned priorities.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-72 border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
                  Category / Weight
                </th>
                {properties.map((property) => (
                  <th key={property.id} className="border-b border-slate-200 px-3 py-2 text-left align-top">
                    <ColumnHeader property={property} isWinner={winner?.id === property.id} />
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
                        className={`px-3 py-2 ${winner?.id === property.id ? "bg-emerald-50/40" : group.tone}`}
                      />
                    ))}
                  </tr>

                  {group.rows.map((row) => {
                    const isDisabled = (Number(rawWeights[row.key]) || 0) === 0;
                    return (
                      <tr key={row.key} className={`transition-colors duration-300 ${isDisabled ? "opacity-45" : ""}`}>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                          <div className="space-y-2">
                            <span>{row.label}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={rawWeights[row.key] ?? 0}
                                onChange={(event) => handleWeightChange(row.key, event.target.value)}
                                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-xs text-slate-700 outline-none transition-all duration-300 focus:border-slate-500"
                              />
                              <input
                                type="range"
                                min="0"
                                max={sliderMax}
                                step="0.1"
                                value={Math.min(Number(rawWeights[row.key]) || 0, sliderMax)}
                                onChange={(event) => handleWeightChange(row.key, event.target.value)}
                                className="h-1.5 w-full accent-slate-600 transition-all duration-300"
                              />
                            </div>
                          </div>
                        </td>

                        {properties.map((property) => (
                          <td
                            key={`${property.id}-${row.key}`}
                            className={`border-b border-slate-100 px-3 py-3 ${
                              winner?.id === property.id ? "bg-emerald-50/30" : ""
                            }`}
                          >
                            <ScoreCell score={property.scores[row.key]} normalizedWeight={normalizedWeights[row.key]} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}

              <tr>
                <td className="px-3 py-3 font-semibold text-slate-900">Weighted Total (WADM)</td>
                {properties.map((property) => (
                  <td
                    key={`${property.id}-weighted`}
                    className={`px-3 py-3 font-semibold ${
                      winner?.id === property.id ? "bg-emerald-50/60 text-emerald-900" : "text-slate-800"
                    }`}
                  >
                    {weightedTotals[property.id].toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Decision Insight</h3>

        {!winner && <p className="mt-3 text-sm text-slate-600">Add properties to generate decision insights.</p>}

        {winner && (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              Winner: <span className="font-medium">{winner.address}</span>
            </p>
            <p>
              Margin: <span className="font-medium">+{winnerMargin.toFixed(2)} weighted points</span>
            </p>
            <div>
              <p className="font-medium text-slate-800">Top contributing factors</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {topContributors.length > 0 ? (
                  topContributors.map((factor) => (
                    <li key={factor.key}>
                      {categoryLabels[factor.key]} ({(normalizedWeights[factor.key] * 100).toFixed(2)}%):
                      score gap {factor.scoreDiff > 0 ? "+" : ""}
                      {factor.scoreDiff.toFixed(1)}, weighted impact +{factor.weightedDelta.toFixed(2)}.
                    </li>
                  ))
                ) : (
                  <li>No positive weighted factor deltas separated the top properties.</li>
                )}
              </ul>
            </div>

            {flipInsight && (
              <div className="pt-2">
                <p className="font-medium text-slate-800">What would need to change for 2nd place to win?</p>
                {flipInsight.possible ? (
                  <p className="mt-1 text-slate-600">
                    In {categoryLabels[flipInsight.key]} ({flipInsight.weightPercent.toFixed(2)}% weight),{" "}
                    {flipInsight.runnerUpName} needs about +{flipInsight.minimumIncrease.toFixed(2)} points
                    to move ahead.
                  </p>
                ) : (
                  <p className="mt-1 text-slate-600">
                    Even raising {flipInsight.runnerUpName} to 10.0 in {categoryLabels[flipInsight.key]} would
                    not fully close the gap; it can gain +{flipInsight.reachableIncrease.toFixed(2)} at most and
                    still trails the required +{flipInsight.minimumIncrease.toFixed(2)}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
