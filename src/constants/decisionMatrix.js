export const groupedCategories = [
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

export const allCategoryRows = groupedCategories.flatMap((group) => group.rows);

export const categoryLabels = Object.fromEntries(
  allCategoryRows.map((row) => [row.key, row.label])
);

export const presets = {
  balanced: () => Object.fromEntries(allCategoryRows.map((row) => [row.key, 1])),
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

export function getEqualRawWeights() {
  return Object.fromEntries(allCategoryRows.map((row) => [row.key, 1]));
}

export function normalizeRawWeights(rawWeights) {
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

export function hydrateRawWeights(storedWeights) {
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
