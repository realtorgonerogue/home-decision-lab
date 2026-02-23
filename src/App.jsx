import { useEffect, useState } from "react";
import AddPropertyModal from "./components/AddPropertyModal";
import ComparisonTable from "./components/ComparisonTable";
import PropertyCard from "./components/PropertyCard";

const STORAGE_KEY = "home-decision-lab-properties";

export default function App() {
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((property) => ({
          ...property,
          structuralScore:
            typeof property.structuralScore === "number"
              ? property.structuralScore
              : typeof property.overallScore === "number"
                ? property.overallScore
                : 0,
        }));
        setProperties(normalized);
      }
    } catch {
      setProperties([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  }, [properties]);

  const addProperty = (newProperty) => {
    setProperties((prev) => [...prev, newProperty]);
  };

  const deleteProperty = (id) => {
    setProperties((prev) => prev.filter((property) => property.id !== id));
  };

  const openComparison = () => {
    if (properties.length > 0) {
      setView("comparison");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Home Decision Lab</h1>
            <p className="mt-1 text-sm text-slate-500">Clarity over emotion.</p>
          </div>
          {view === "dashboard" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Add Property
            </button>
          )}
        </header>

        {view === "dashboard" ? (
          <>
            {properties.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                No properties saved yet. Click "+ Add Property" to start.
              </div>
            ) : (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onCompare={openComparison}
                    onDelete={deleteProperty}
                  />
                ))}
              </section>
            )}
          </>
        ) : (
          <ComparisonTable properties={properties} onBack={() => setView("dashboard")} />
        )}
      </div>

      <AddPropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addProperty}
      />
    </main>
  );
}
