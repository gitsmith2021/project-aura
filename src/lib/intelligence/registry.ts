// CF-3 — Intent Registry. THE extensibility surface: supporting a new executive
// question = adding one IntentDefinition file under intents/ and listing it here.
// Phase 1 ships three flagship intents over existing CF-2 entities; the engine,
// composer, matcher and UI never change as the registry grows.

import type { IntentDefinition, Role } from "./types";
import { feeCollectionIntent } from "./intents/finance.fee-collection";
import { admissionsIntent } from "./intents/admissions.overview";
import { enrollmentIntent } from "./intents/people.enrollment";
import { attendanceRiskIntent } from "./intents/academics.attendance-risk";
import { facultyIntent } from "./intents/people.faculty";

export const INTENTS: IntentDefinition[] = [
  feeCollectionIntent,
  admissionsIntent,
  enrollmentIntent,
  attendanceRiskIntent,
  facultyIntent,
];

export function getIntent(id: string): IntentDefinition | undefined {
  return INTENTS.find((i) => i.id === id);
}

/** Intents a given role may run — drives the launcher's suggestions per persona. */
export function intentsForRole(role: Role): IntentDefinition[] {
  return INTENTS.filter((i) => i.roles.includes(role));
}
