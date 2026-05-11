export type DepartmentFundingType = "AIDED" | "SELF_FINANCING";

export function normalizeFundingType(raw: string | null | undefined): DepartmentFundingType {
  return raw === "SELF_FINANCING" ? "SELF_FINANCING" : "AIDED";
}

/** Compact UI label shown next to department names */
export function fundingTypeShortLabel(raw: string | null | undefined): "Aided" | "SF" {
  return normalizeFundingType(raw) === "SELF_FINANCING" ? "SF" : "Aided";
}
