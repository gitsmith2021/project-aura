export const SHIFT_PERIOD_TIMES: Record<string, { start: string; end: string; label: string }[]> = {
  NORMAL: [
    { start: "09:00:00", end: "10:00:00", label: "9–10 AM" },
    { start: "10:00:00", end: "11:00:00", label: "10–11 AM" },
    { start: "11:00:00", end: "12:00:00", label: "11–12 PM" },
    { start: "13:00:00", end: "14:00:00", label: "1–2 PM" },
    { start: "14:00:00", end: "15:00:00", label: "2–3 PM" },
    { start: "15:00:00", end: "16:00:00", label: "3–4 PM" },
  ],
  DAY: [
    { start: "08:15:00", end: "09:15:00", label: "8:15–9:15 AM" },
    { start: "09:15:00", end: "10:15:00", label: "9:15–10:15 AM" },
    { start: "10:15:00", end: "11:15:00", label: "10:15–11:15 AM" },
    { start: "11:15:00", end: "12:15:00", label: "11:15 AM–12:15 PM" },
    { start: "12:15:00", end: "13:15:00", label: "12:15–1:15 PM" },
  ],
  EVENING: [
    { start: "13:30:00", end: "14:30:00", label: "1:30–2:30 PM" },
    { start: "14:30:00", end: "15:30:00", label: "2:30–3:30 PM" },
    { start: "15:30:00", end: "16:30:00", label: "3:30–4:30 PM" },
    { start: "16:30:00", end: "17:30:00", label: "4:30–5:30 PM" },
    { start: "17:30:00", end: "18:30:00", label: "5:30–6:30 PM" },
  ],
};
