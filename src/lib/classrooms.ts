// Phase 8 — Smart Campus entity model: Classroom + its NFC tag (P8.3) and card
// reader (P8.2) assignments. Pure domain types + helpers (unit-testable).

export type RoomType = "classroom" | "lab" | "library" | "office" | "seminar_hall" | "meeting_room";
export type TagStatus = "active" | "inactive" | "replaced";
export type ReaderStatus = "active" | "inactive";
export type ReaderVendor = "rfid" | "nfc" | "mifare" | "desfire";

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  classroom: "Classroom",
  lab: "Laboratory",
  library: "Library",
  office: "Office",
  seminar_hall: "Seminar Hall",
  meeting_room: "Meeting Room",
};

export const READER_VENDOR_LABELS: Record<ReaderVendor, string> = {
  rfid: "RFID",
  nfc: "NFC",
  mifare: "MIFARE",
  desfire: "DESFire",
};

export type NfcTag = {
  id: string;
  institution_id: string;
  tag_uid: string;
  classroom_id: string | null;
  status: TagStatus;
  replaced_by: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type CardReader = {
  id: string;
  institution_id: string;
  reader_uid: string;
  vendor: ReaderVendor;
  classroom_id: string | null;
  status: ReaderStatus;
  last_seen_at: string | null;
  created_at: string;
};

export type Classroom = {
  id: string;
  institution_id: string;
  department_id: string | null;
  building: string;
  floor: string | null;
  room_number: string;
  room_type: RoomType;
  capacity: number | null;
  created_at: string;
  // resolved client/server-side
  department_name?: string | null;
  nfc_tag?: NfcTag | null;
  card_reader?: CardReader | null;
};

/** A tag/reader is "offline" (Attendance Exception Dashboard signal) if it hasn't reported in this window. */
const HEALTH_WINDOW_HOURS = 48;

export function isStale(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  return ageMs > HEALTH_WINDOW_HOURS * 60 * 60 * 1000;
}

export type ClassroomStats = { total: number; withTag: number; withReader: number; unconfigured: number };

export function classroomStats(rooms: Pick<Classroom, "nfc_tag" | "card_reader">[]): ClassroomStats {
  const s: ClassroomStats = { total: rooms.length, withTag: 0, withReader: 0, unconfigured: 0 };
  for (const r of rooms) {
    const hasTag = !!r.nfc_tag && r.nfc_tag.status === "active";
    const hasReader = !!r.card_reader && r.card_reader.status === "active";
    if (hasTag) s.withTag++;
    if (hasReader) s.withReader++;
    if (!hasTag && !hasReader) s.unconfigured++;
  }
  return s;
}
