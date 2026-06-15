// Shared visual tokens — keeps the mobile look aligned with the web app's
// violet/emerald palette without pulling in a styling library.

export const colors = {
  violet: "#7C3AED",
  violetDark: "#6D28D9",
  emerald: "#10B981",
  rose: "#F43F5E",
  amber: "#F59E0B",
  sky: "#0EA5E9",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  white: "#FFFFFF",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
