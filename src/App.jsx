import { useEffect, useMemo, useRef, useState } from "react";
import AddPropertyModal from "./components/AddPropertyModal";
import ComparisonTable from "./components/ComparisonTable";
import PropertyCard from "./components/PropertyCard";
import { getEqualRawWeights, hydrateRawWeights } from "./constants/decisionMatrix";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const PROPERTIES_STORAGE_KEY = "home-decision-lab-properties";
const WEIGHTS_STORAGE_KEY = "home-decision-lab-weights";
const CLOUD_TABLE = "home_decision_lab_data";

function normalizeProperties(input) {
  if (!Array.isArray(input)) return [];
  return input.map((property) => ({
    ...property,
    structuralScore:
      typeof property.structuralScore === "number"
        ? property.structuralScore
        : typeof property.overallScore === "number"
          ? property.overallScore
          : 0,
  }));
}

export default function App() {
  const [properties, setProperties] = useState([]);
  const [rawWeights, setRawWeights] = useState(() => getEqualRawWeights());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState("dashboard");

  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoadedRemote, setHasLoadedRemote] = useState(false);

  const propertiesRef = useRef(properties);
  const weightsRef = useRef(rawWeights);

  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  useEffect(() => {
    weightsRef.current = rawWeights;
  }, [rawWeights]);

  useEffect(() => {
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedWeights = localStorage.getItem(WEIGHTS_STORAGE_KEY);

    try {
      const parsedProperties = storedProperties ? JSON.parse(storedProperties) : [];
      setProperties(normalizeProperties(parsedProperties));
    } catch {
      setProperties([]);
    }

    try {
      const parsedWeights = storedWeights ? JSON.parse(storedWeights) : null;
      setRawWeights(hydrateRawWeights(parsedWeights));
    } catch {
      setRawWeights(getEqualRawWeights());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(rawWeights));
  }, [rawWeights]);

  const loadCloudData = async (userId) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);

    try {
      const { data, error } = await supabase
        .from(CLOUD_TABLE)
        .select("properties, raw_weights")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setAuthMessage(`Cloud sync error: ${error.message}`);
        return;
      }

      if (data) {
        setProperties(normalizeProperties(data.properties));
        setRawWeights(hydrateRawWeights(data.raw_weights));
      } else {
        const payload = {
          user_id: userId,
          properties: propertiesRef.current,
          raw_weights: weightsRef.current,
          updated_at: new Date().toISOString(),
        };
        await supabase.from(CLOUD_TABLE).upsert(payload, { onConflict: "user_id" });
      }

      setAuthMessage("Cloud sync active.");
    } finally {
      setHasLoadedRemote(true);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        loadCloudData(nextUser.id);
      } else {
        setHasLoadedRemote(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        loadCloudData(nextUser.id);
      } else {
        setHasLoadedRemote(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user || !hasLoadedRemote) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const payload = {
        user_id: user.id,
        properties,
        raw_weights: rawWeights,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from(CLOUD_TABLE).upsert(payload, { onConflict: "user_id" });
      if (error) {
        setAuthMessage(`Cloud sync error: ${error.message}`);
      }
      setIsSyncing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [properties, rawWeights, user, hasLoadedRemote]);

  const cloudStatus = useMemo(() => {
    if (!isSupabaseConfigured) return "Local only";
    if (!user) return "Signed out";
    if (isSyncing) return "Syncing...";
    return "Synced";
  }, [isSyncing, user]);

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

  const sendMagicLink = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthMessage("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.");
      return;
    }
    if (!authEmail) {
      setAuthMessage("Enter an email address first.");
      return;
    }

    setIsAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setIsAuthBusy(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setAuthMessage("Magic link sent. Check your inbox.");
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthMessage("Signed out. Local cache still available.");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Home Decision Lab</h1>
            <p className="mt-1 text-sm text-slate-500">Clarity over emotion.</p>
            <p className="mt-1 text-xs text-slate-400">Storage: {cloudStatus}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!user && isSupabaseConfigured && (
              <>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <button
                  onClick={sendMagicLink}
                  disabled={isAuthBusy}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isAuthBusy ? "Sending..." : "Send Login Link"}
                </button>
              </>
            )}

            {user && (
              <button
                onClick={signOut}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign Out
              </button>
            )}

            {view === "dashboard" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                + Add Property
              </button>
            )}
          </div>
        </header>

        {authMessage && (
          <div className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {authMessage}
          </div>
        )}

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
          <ComparisonTable
            properties={properties}
            rawWeights={rawWeights}
            onWeightsChange={setRawWeights}
            onBack={() => setView("dashboard")}
          />
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
