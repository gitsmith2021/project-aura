import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { parentApi, type ParentChild } from "@/lib/parentApi";

// Phase 8F — shared selected-child state across the parent tabs. Fetches the
// linked children once (only for the parent tier) and persists the selection.
const STORAGE_KEY = "aura_parent_selected_child";

type ParentChildState = {
  children: ParentChild[];
  selected: ParentChild | null;
  selectedId: string | null;
  select: (studentId: string) => void;
  loading: boolean;
  error: string | null;
};

const Ctx = createContext<ParentChildState | undefined>(undefined);

export function ParentChildProvider({ children: node }: { children: React.ReactNode }) {
  const { identity } = useAuth();
  const isParent = identity?.tier === "parent";

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isParent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isParent) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const kids = await parentApi.children();
        if (!active) return;
        setChildren(kids);
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const valid = saved && kids.some((k) => k.studentId === saved);
        setSelectedId(valid ? saved : kids[0]?.studentId ?? null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load your children.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isParent]);

  const select = useCallback((studentId: string) => {
    setSelectedId(studentId);
    AsyncStorage.setItem(STORAGE_KEY, studentId).catch(() => {});
  }, []);

  const selected = children.find((c) => c.studentId === selectedId) ?? null;

  return (
    <Ctx.Provider value={{ children, selected, selectedId, select, loading, error }}>
      {node}
    </Ctx.Provider>
  );
}

export function useParentChild(): ParentChildState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useParentChild must be used within ParentChildProvider");
  return ctx;
}
