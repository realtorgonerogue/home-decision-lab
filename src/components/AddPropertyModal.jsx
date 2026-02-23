import { useState } from "react";

const categoryKeys = [
  "priceFit",
  "condition",
  "layout",
  "location",
  "schools",
  "commute",
  "resalePotential",
  "emotionalPull",
];

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

const initialScores = categoryKeys.reduce((acc, key) => {
  acc[key] = 5;
  return acc;
}, {});

const initialForm = {
  address: "",
  listingUrl: "",
  price: "",
  beds: "",
  baths: "",
  sqFt: "",
  notes: "",
  imageBase64: "",
  scores: initialScores,
};

export default function AddPropertyModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState(initialForm);

  if (!isOpen) return null;

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSliderChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [key]: Number(value),
      },
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, imageBase64: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        imageBase64: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const scoreValues = Object.values(formData.scores);
    const structuralScore =
      scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length;

    onAdd({
      id: crypto.randomUUID(),
      address: formData.address.trim(),
      listingUrl: formData.listingUrl.trim(),
      price: Number(formData.price),
      beds: Number(formData.beds),
      baths: Number(formData.baths),
      sqFt: Number(formData.sqFt),
      notes: formData.notes.trim(),
      imageBase64: formData.imageBase64,
      scores: formData.scores,
      structuralScore,
    });

    setFormData(initialForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900">Add Property</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Address
              <input
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Listing URL (optional)
              <input
                type="url"
                name="listingUrl"
                value={formData.listingUrl}
                onChange={handleInputChange}
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Price
              <input
                required
                min="0"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Beds
              <input
                required
                min="0"
                type="number"
                name="beds"
                value={formData.beds}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Baths
              <input
                required
                min="0"
                type="number"
                name="baths"
                value={formData.baths}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Sq Ft
              <input
                required
                min="0"
                type="number"
                name="sqFt"
                value={formData.sqFt}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Property Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Scoring Categories (1-10)
            </h3>
            <div className="mt-3 space-y-3">
              {categoryKeys.map((key) => (
                <label key={key} className="block">
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                    <span>{categoryLabels[key]}</span>
                    <span className="font-semibold">{formData.scores[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.scores[key]}
                    onChange={(event) => handleSliderChange(key, event.target.value)}
                    className="w-full accent-slate-700"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Save Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
