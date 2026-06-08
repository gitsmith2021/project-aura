"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type InstitutionOption = {
  id: string;
  name: string;
  session_types?: string[] | null;
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

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedId, setSelectedIdState] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchInsts = () => {
      supabase
        .from("institutions")
        .select("id, name, session_types")
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
  }, []);

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
