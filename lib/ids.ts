/** Human-readable entity id generators (SRS §6 conventions). */

const STATE_CODES: Record<string, string> = {
  "Tamil Nadu": "TN",
  "Uttar Pradesh": "UP",
  "West Bengal": "WB",
  Telangana: "TG",
  Odisha: "OD",
  Assam: "AS",
  Karnataka: "KA",
  Maharashtra: "MH",
  Gujarat: "GJ",
  "Himachal Pradesh": "HP",
  "Madhya Pradesh": "MP",
  Bihar: "BR",
};

export function stateCode(state?: string): string {
  return STATE_CODES[state || ""] || "IN";
}

export function weaverIdFor(state: string, district: string, n: number): string {
  const dist = (district || "GEN").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  return `WVR-${stateCode(state)}-${dist}-${String(n).padStart(6, "0")}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function reportRef(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `FR-${year}-${n}`;
}

export function scanId(): string {
  return "sc_" + Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
