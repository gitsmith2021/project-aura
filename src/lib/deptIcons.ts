import {
  Building2,
  Plane,
  FlaskConical,
  Monitor,
  Atom,
  HeartPulse,
  Bone,
  Calculator,
  BookOpen,
  Briefcase,
  Globe,
  Music,
  Dna,
  Stethoscope,
  Code,
  type LucideIcon
} from "lucide-react";

export function getDeptIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Building2;
  const n = name.toLowerCase();
  
  if (n.includes("aviat") || n.includes("aero")) return Plane;
  if (n.includes("bio") || n.includes("micro") || n.includes("dna")) return Dna;
  if (n.includes("chem")) return FlaskConical;
  if (n.includes("comput") || n.includes("it ") || n.includes("software") || n.includes("tech")) return Monitor;
  if (n.includes("physi")) return Atom;
  if (n.includes("nurs") || n.includes("medic") || n.includes("health")) return HeartPulse;
  if (n.includes("math") || n.includes("stat")) return Calculator;
  if (n.includes("eng")) return BookOpen;
  if (n.includes("busin") || n.includes("commer") || n.includes("admin") || n.includes("mba")) return Briefcase;
  if (n.includes("eco") || n.includes("geo") || n.includes("earth")) return Globe;
  if (n.includes("art") || n.includes("music") || n.includes("design")) return Music;
  if (n.includes("anatomy") || n.includes("bone")) return Bone;
  if (n.includes("clinic") || n.includes("surgery")) return Stethoscope;
  if (n.includes("code") || n.includes("program")) return Code;
  
  return Building2;
}
