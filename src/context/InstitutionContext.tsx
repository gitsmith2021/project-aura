"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { withLocalizationDefaults, type Localization } from "@/lib/locale";

export type InstitutionOption = {
  id: string;
  name: string;
  slug: string | null;
  session_types?: string[] | null;
  currency?: string | null;
  locale?: string | null;
  timezone?: string | null;
};

type InstitutionContextValue = {
  institutions: InstitutionOption[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  loading: boolean;
};

const InstitutionContext = createContext<InstitutionContextValue>({
  institutions: [],
  selectedId: "",
  setSelectedId: () => {},
  loading: true,
});

export function InstitutionProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedId, setSelectedIdState] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setInstitutions([]);
      setSelectedIdState("");
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const fetchInsts = () => {
      supabase
        .from("institutions")
        .select("id, name, slug, session_types, currency, locale, timezone")
        .order("name")
        .then(({ data }) => {
          if (data && data.length > 0) {
            setInstitutions(data);
            setSelectedIdState((prev) => {
              const saved =
                typeof sessionStorage !== "undefined"
                  ? sessionStorage.getItem("aura_inst_id")
                  : null;
              const valid = (saved && data.some((d) => d.id === saved)) || (prev && data.some((d) => d.id === prev));
              return valid ? (saved || prev) : data[0].id;
            });
          } else {
            setInstitutions([]);
            setSelectedIdState("");
          }
          setLoading(false);
        });
    };

    fetchInsts();

    const channel = supabase
      .channel("realtime-institutions-context")
      .on("postgres_changes", { event: "*", schema: "public", table: "institutions" }, () => {
        fetchInsts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("aura_inst_id", id);
    }
  };

  return (
    <InstitutionContext.Provider value={{ institutions, selectedId, setSelectedId, loading }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  return useContext(InstitutionContext);
}

/**
 * The currently-selected institution's localization (currency / locale /
 * timezone), falling back to the India defaults. Pass the result to the
 * `src/lib/locale.ts` helpers (formatCurrency / formatDate) for tenant-aware
 * display.
 */
export function useInstitutionLocalization(): Localization {
  const { institutions, selectedId } = useInstitution();
  const inst = institutions.find((i) => i.id === selectedId);
  return withLocalizationDefaults(
    inst ? { currency: inst.currency ?? "", locale: inst.locale ?? "", timezone: inst.timezone ?? "" } : null,
  );
}
