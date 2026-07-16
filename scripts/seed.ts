/**
 * SUTRA seed script — demo data for the local build.
 * Run: npm run seed   (wipes and recreates the `sutra` database)
 * Prints demo login numbers and scratch-panel secrets at the end.
 */
import fs from "fs";
import path from "path";

// Load .env.local before importing anything that reads process.env
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

import mongoose from "mongoose";
import { dbConnect } from "../lib/db";
import {
  Organization, User, Weaver, Product, Tag, Scan, ProvenanceEvent, Claim,
  Certificate, FraudReport, MediaAsset, LedgerEntry, AuditLog, MaterialLot,
} from "../lib/models";
import { sha256, randomHex, canonicalHash } from "../lib/hash";
import { appendLedgerEntry } from "../lib/ledger";
import { issuePassport, freezePassport } from "../lib/passport";
import { recordProvenanceEvent } from "../lib/provenance";
import { registerMaterialLot, computeMaterialHash } from "../lib/materials";
import { saveMedia } from "../lib/storage";
import { scanId as makeScanId } from "../lib/ids";

/* ── placeholder SVG art ── */
function portraitSvg(initials: string, bg: string, skin = "#c68863") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="${bg}"/>
  <rect width="400" height="300" fill="url(#w)" opacity="0.25"/>
  <defs><pattern id="w" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M0 10h20M10 0v20" stroke="#fff" stroke-width="2"/></pattern></defs>
  <circle cx="200" cy="120" r="55" fill="${skin}"/>
  <path d="M110 300 Q110 210 200 205 Q290 210 290 300 Z" fill="#f3e2c0"/>
  <text x="200" y="135" text-anchor="middle" font-family="Georgia" font-size="40" font-weight="bold" fill="#fff" opacity="0.9">${initials}</text>
</svg>`;
}

function sareeSvg(c1: string, c2: string, border: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="z" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="13" cy="13" r="2.2" fill="${border}" opacity="0.65"/>
    </pattern>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <rect width="400" height="400" fill="url(#z)"/>
  <rect y="330" width="400" height="70" fill="${border}"/>
  <rect y="322" width="400" height="6" fill="#f8eeda"/>
  <path d="M0 360 q25 -18 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#f8eeda" stroke-width="3" fill="none"/>
  <text x="200" y="385" text-anchor="middle" font-family="Georgia" font-size="15" fill="#f8eeda">${label}</text>
</svg>`;
}

function loomSvg(c1: string, border: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#5b4632"/>
  <rect x="30" y="40" width="340" height="18" fill="#8a6a48"/>
  <rect x="30" y="340" width="340" height="18" fill="#8a6a48"/>
  <rect x="30" y="40" width="14" height="318" fill="#77552f"/>
  <rect x="356" y="40" width="14" height="318" fill="#77552f"/>
  ${Array.from({ length: 32 }, (_, i) => `<line x1="${52 + i * 9.3}" y1="58" x2="${52 + i * 9.3}" y2="340" stroke="#d9c9a3" stroke-width="1.4"/>`).join("")}
  <rect x="44" y="200" width="312" height="140" fill="${c1}" opacity="0.94"/>
  <rect x="44" y="316" width="312" height="24" fill="${border}"/>
  <rect x="44" y="192" width="312" height="10" fill="#a88b52"/>
  <text x="200" y="380" text-anchor="middle" font-family="Georgia" font-size="13" fill="#d9c9a3">on the loom</text>
</svg>`;
}

async function svgAsset(svg: string, purpose: string, kind: "IMAGE" = "IMAGE") {
  const asset = await saveMedia({ buffer: Buffer.from(svg, "utf8"), mime: "image/svg+xml", kind, purpose, originalName: purpose + ".svg" });
  return asset._id;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

async function main() {
  await dbConnect();
  console.log("Connected. Wiping collections…");
  await Promise.all(
    [Organization, User, Weaver, Product, Tag, Scan, ProvenanceEvent, Claim, Certificate, FraudReport, MediaAsset, LedgerEntry, AuditLog, MaterialLot].map((M) =>
      M.deleteMany({})
    )
  );

  /* ── Organizations ── */
  const coop = await Organization.create({
    orgId: "ORG-TN-0012", type: "COOPERATIVE", name: "Kanchipuram Silk Weavers' Cooperative (PWCS)",
    registrationNo: "TN/PWCS/1978/0441", address: { village: "Pillaiyarpalayam", district: "Kanchipuram", state: "Tamil Nadu", pincode: "631502" },
    contact: { phone: "9000000002" },
  });
  const wsc = await Organization.create({
    orgId: "ORG-TN-WSC-01", type: "VERIFIER_BODY", name: "Weavers' Service Centre, Kanchipuram",
    address: { district: "Kanchipuram", state: "Tamil Nadu" },
  });
  const retailer = await Organization.create({
    orgId: "ORG-TN-RET-07", type: "RETAILER", name: "Nalli Silks, T. Nagar",
    address: { district: "Chennai", state: "Tamil Nadu" },
  });

  /* ── Staff users ── */
  const [admin, officer, verifier] = await User.create([
    { phone: "9000000001", name: "Priya Raman", role: "ADMIN", locale: "en" },
    { phone: "9000000002", name: "K. Senthil Kumar", role: "COOP_OFFICER", orgId: coop._id, locale: "ta" },
    { phone: "9000000003", name: "Dr. R. Meenakshi (WSC)", role: "VERIFIER", orgId: wsc._id, locale: "ta" },
  ]);
  await User.create({ phone: "9000000004", name: "Nalli Front Desk", role: "RETAILER", orgId: retailer._id });

  /* ── Weavers ── */
  const weaverDefs = [
    {
      phone: "9111111111", fullName: "Murugan Subramanian", display: "Murugan S.", handle: "murugan-kanchipuram",
      village: "Pillaiyarpalayam", district: "Kanchipuram", state: "Tamil Nadu", cluster: { code: 101, name: "Kanchipuram", state: "Tamil Nadu" },
      craft: { code: 1, name: "Kanjivaram Silk" }, years: 32, generation: 4, loom: "PIT_LOOM", lang: "ta",
      lineage: "Learned from father, Sundaram S. (1962–2019)",
      story: "My father sat me at the loom when I was twelve. The first year, I only watched his hands. The korvai border cannot be rushed — two of us throw the shuttle to each other for every single line. When you wear this saree, you are wearing four months of two people's mornings. That is what I want you to know.",
      portrait: ["#8c2f39"], verified: true,
    },
    {
      phone: "9222222222", fullName: "Lakshmi Devi Pagadala", display: "Lakshmi Devi", handle: "lakshmi-pochampally",
      village: "Bhoodan Pochampally", district: "Yadadri", state: "Telangana", cluster: { code: 204, name: "Pochampally", state: "Telangana" },
      craft: { code: 4, name: "Pochampally Ikat" }, years: 24, generation: 3, loom: "FRAME_LOOM", lang: "te",
      lineage: "Trained by mother-in-law, Yellamma P.",
      story: "In ikat, the yarn is dyed before it is woven — we tie and dye the pattern into the thread itself, blind, and it only appears as we weave. One misaligned knot and the diamond breaks. People ask why it costs so much. I tell them: the pattern lives in my memory for three weeks before you can see it.",
      portrait: ["#1f4e6b"], verified: true,
    },
    {
      phone: "9333333333", fullName: "Abdul Rahman Ansari", display: "Abdul Rahman", handle: "abdul-banarasi",
      village: "Madanpura", district: "Varanasi", state: "Uttar Pradesh", cluster: { code: 301, name: "Varanasi", state: "Uttar Pradesh" },
      craft: { code: 2, name: "Banarasi" }, years: 41, generation: 6, loom: "JACQUARD", lang: "hi",
      lineage: "Six generations of Ansari weavers in Madanpura",
      story: "My family has woven Banarasi for six generations. The kadhua butis are woven one by one, by hand — nothing is printed, nothing is pasted. A machine copy looks the same from two metres. Turn it over. The back of a true kadhua is as clean as the front. That is the signature we leave.",
      portrait: ["#3d5a2e"], verified: true,
    },
    {
      phone: "9444444444", fullName: "Selvi Arumugam", display: "Selvi A.", handle: "selvi-arni",
      village: "Arni", district: "Tiruvannamalai", state: "Tamil Nadu", cluster: { code: 102, name: "Arni", state: "Tamil Nadu" },
      craft: { code: 11, name: "Cotton Handloom" }, years: 15, generation: 2, loom: "FRAME_LOOM", lang: "ta",
      lineage: "Learned from her mother",
      story: "I weave cotton sarees for daily wear. Soft, breathing cloth for real life.",
      portrait: ["#7a4a20"], verified: false, // stays PENDING — demo for the verification queue
    },
  ];

  const weavers: Record<string, InstanceType<typeof Weaver>> = {};
  let wIndex = 0;
  for (const d of weaverDefs) {
    wIndex++;
    const salt = randomHex(32);
    const initials = d.display.split(" ").map((p) => p[0]).join("").slice(0, 2);
    const photoAssetId = await svgAsset(portraitSvg(initials, d.portrait[0]), "WEAVER_PORTRAIT");
    const weaverId = `WVR-${d.state === "Tamil Nadu" ? "TN" : d.state === "Telangana" ? "TG" : "UP"}-${d.district.slice(0, 3).toUpperCase()}-${String(wIndex).padStart(6, "0")}`;

    const w = await Weaver.create({
      weaverId, handle: d.handle,
      personal: { fullName: d.fullName, phone: d.phone, govtIdType: "HANDLOOM_ID", govtIdHash: sha256("demo-id-" + d.phone), govtIdLast4: d.phone.slice(-4), address: { village: d.village, district: d.district, state: d.state } },
      profile: {
        displayName: d.display, photoAssetId, yearsWeaving: d.years, generation: d.generation,
        cluster: d.cluster, crafts: [{ ...d.craft, isPrimary: true }],
        looms: [{ type: d.loom, count: d.loom === "PIT_LOOM" ? 2 : 1, installedYear: 2008 }],
        languages: [d.lang, "en"], guruLineage: d.lineage,
        awards: d.years > 30 ? [{ title: "State Handloom Award", year: 2019, issuer: `Govt. of ${d.state}` }] : [],
      },
      story: {
        audioLanguage: d.lang,
        transcript: { original: { lang: d.lang, text: d.story, source: "ASR" }, translations: [{ lang: "en", text: d.story, source: "MT" }] },
        highlights: [`${d.generation}th generation`, `${d.years} years`, d.loom.replace(/_/g, " ").toLowerCase()],
        consentGiven: true, consentAt: daysAgo(120),
      },
      verification: { status: "PENDING", method: "IN_PERSON" },
      ledger: { weaverSalt: salt, weaverHash: sha256(weaverId + salt) },
      orgId: coop._id, createdBy: officer._id, registrationMode: "ASSISTED",
    });

    if (d.verified) {
      const profileHash = canonicalHash({ displayName: d.display, cluster: d.cluster, crafts: [d.craft], yearsWeaving: d.years });
      const entry = await appendLedgerEntry({
        type: "WEAVER_ATTESTED", entityType: "weaver", entityId: weaverId,
        payload: { weaverHash: w.ledger.weaverHash, profileHash, verifier: verifier.name, expiresAt: daysAgo(-640).toISOString() },
        summary: `Weaver ${d.display} attested by ${verifier.name}`,
      });
      w.verification = {
        status: "VERIFIED", method: "IN_PERSON", verifiedBy: verifier._id, verifierName: verifier.name,
        verifierOrgId: wsc._id, verifierOrgName: wsc.name, verifiedAt: daysAgo(90), expiresAt: daysAgo(-640),
      };
      w.ledger.profileHash = profileHash;
      w.ledger.credentialEntrySeq = entry.seq;
      w.ledger.anchoredAt = new Date();
      await w.save();
    }

    await User.create({ phone: d.phone, name: d.fullName, role: "WEAVER", orgId: coop._id, weaverId: w._id, locale: d.lang });
    weavers[d.handle] = w;
  }

  /* ── Material lots (weaver-owned, FR-B1) ── */
  const lots: Record<string, Record<string, InstanceType<typeof MaterialLot>>> = {};
  async function lotFor(handle: string, key: string, opts: Parameters<typeof registerMaterialLot>[0]) {
    const lot = await registerMaterialLot(opts);
    (lots[handle] ??= {})[key] = lot;
  }
  for (const [handle, w] of Object.entries(weavers)) {
    if (w.verification?.status !== "VERIFIED") continue;
    const base = { weaverId: String(w._id), orgId: String(coop._id) };
    const silk = w.profile.crafts[0].code !== 11; // not plain cotton
    if (silk) {
      await lotFor(handle, "silk", { ...base, type: "SILK_YARN", supplierName: "Karur Silk Traders", colour: "Undyed mulberry", denier: 20, ply: 2, certification: "SILK_MARK", isHankYarn: true, quantityGrams: 6000 });
      await lotFor(handle, "zari", { ...base, type: "ZARI", supplierName: "Surat Zari House", colour: "Gold", certification: "NONE", quantityGrams: 2500 });
    } else {
      await lotFor(handle, "cotton", { ...base, type: "COTTON_YARN", supplierName: "Erode Cotton Co-op", colour: "Undyed", denier: 40, ply: 2, certification: "HANDLOOM_HANK", isHankYarn: true, quantityGrams: 4000 });
    }
    await lotFor(handle, "dye", { ...base, type: "DYE", supplierName: w.personal.address.district + " Dyers", certification: "AZO_FREE", dyeChemistry: "Natural indigo & madder", quantityGrams: 1500 });
  }

  async function attachMaterial(product: InstanceType<typeof Product>, lot: InstanceType<typeof MaterialLot>, role: string, grams: number) {
    if (!lot || (lot.remainingGrams ?? 0) < grams) return;
    lot.remainingGrams -= grams;
    await lot.save();
    product.materials.push({
      materialLotId: lot._id, lotIdLabel: lot.lotId, type: lot.type, role, quantityGrams: grams,
      supplierName: lot.supplier?.name, certification: lot.spec?.certification, isHankYarn: lot.spec?.isHankYarn,
      materialHash: lot.ledger?.materialHash, linkedAt: new Date(),
    });
  }

  /* ── Products ── */
  type ProdDef = {
    weaver: string; name: string; category: string; colors: [string, string, string];
    specs: Record<string, unknown>; hours: number; price: [number, number];
    narrative: { title: string; body: string; culturalNote?: string };
    certs: { type: string; number: string; issuedBy: string }[];
    dispatched?: boolean; claimed?: boolean; scans: number;
  };
  const productDefs: ProdDef[] = [
    {
      weaver: "murugan-kanchipuram",
      name: "Kanjivaram Silk Saree — Peacock Blue with Temple Border",
      category: "SAREE", colors: ["#0f6a8b", "#123c53", "#c9a227"],
      specs: { lengthCm: 630, widthCm: 118, weightGrams: 720, zariType: "PURE_SILVER_GOLD_PLATED", zariGrams: 180, colours: ["Peacock Blue", "Maroon", "Gold"], motifs: ["Temple Border", "Mayil Chakram", "Rudraksham"], weaveTechnique: "KORVAI", dyeType: "AZO_FREE_CHEMICAL", threadCount: { warp: 60, weft: 56 } },
      hours: 118, price: [45000, 62000],
      narrative: {
        title: "Four months, two looms, one border",
        body: "The body and the border of this saree were woven separately and interlocked line by line — the korvai technique that needs two weavers working in rhythm. The temple border took its shape from the gopuram silhouettes Murugan passes every morning.",
        culturalNote: "The mayil chakram (peacock medallion) motif is drawn from the Kailasanathar temple carvings of Kanchipuram.",
      },
      certs: [
        { type: "GI", number: "GI-00007", issuedBy: "GI Registry of India" },
        { type: "SILK_MARK", number: "SM-9912-2026", issuedBy: "Silk Mark Organisation of India" },
        { type: "HANDLOOM_MARK", number: "HM-2026-4471", issuedBy: "Development Commissioner (Handlooms)" },
      ],
      dispatched: true, claimed: true, scans: 37,
    },
    {
      weaver: "murugan-kanchipuram",
      name: "Kanjivaram Silk Saree — Maroon with Gold Checks",
      category: "SAREE", colors: ["#7a1f2b", "#4a1019", "#c9a227"],
      specs: { lengthCm: 620, weightGrams: 680, zariType: "PURE_SILVER_GOLD_PLATED", zariGrams: 140, colours: ["Maroon", "Gold"], motifs: ["Kottadi Checks", "Rudraksham"], weaveTechnique: "KORVAI", dyeType: "AZO_FREE_CHEMICAL" },
      hours: 96, price: [38000, 48000],
      narrative: { title: "The wedding maroon", body: "Woven in the deep arakku maroon that Kanchipuram is known for, with kottadi checks in pure zari." },
      certs: [{ type: "SILK_MARK", number: "SM-9913-2026", issuedBy: "Silk Mark Organisation of India" }],
      dispatched: true, scans: 18,
    },
    {
      weaver: "lakshmi-pochampally",
      name: "Pochampally Ikat Silk Saree — Indigo Diamond Grid",
      category: "SAREE", colors: ["#25446b", "#16263e", "#b9452e"],
      specs: { lengthCm: 600, weightGrams: 520, colours: ["Indigo", "Rust", "Ivory"], motifs: ["Diamond Grid", "Chowka"], weaveTechnique: "DOUBLE_IKAT", dyeType: "NATURAL" },
      hours: 84, price: [12000, 18000],
      narrative: {
        title: "The pattern lives in the thread",
        body: "Every diamond in this grid was tied and resist-dyed into the yarn before the first pick was thrown. Double ikat means warp and weft were both patterned blind — they meet correctly only if three weeks of knots were tied true.",
        culturalNote: "Pochampally ikat (locally 'chitki') earned its GI tag in 2005 — the first Telangana handloom to do so.",
      },
      certs: [{ type: "GI", number: "GI-00045", issuedBy: "GI Registry of India" }, { type: "HANDLOOM_MARK", number: "HM-2026-5102", issuedBy: "Development Commissioner (Handlooms)" }],
      dispatched: true, scans: 22,
    },
    {
      weaver: "lakshmi-pochampally",
      name: "Ikat Cotton Dupatta — Rust Chevron",
      category: "DUPATTA", colors: ["#b9452e", "#7d2c1c", "#e8d9b0"],
      specs: { lengthCm: 240, weightGrams: 180, colours: ["Rust", "Ivory"], motifs: ["Chevron"], weaveTechnique: "SINGLE_IKAT", dyeType: "NATURAL" },
      hours: 22, price: [2400, 3200],
      narrative: { title: "Everyday ikat", body: "A single-ikat cotton dupatta in natural madder rust — the entry door to the craft." },
      certs: [],
      scans: 6,
    },
    {
      weaver: "abdul-banarasi",
      name: "Banarasi Katan Silk Saree — Ivory Kadhua Butis",
      category: "SAREE", colors: ["#efe6d0", "#d9c49a", "#a13c4e"],
      specs: { lengthCm: 610, weightGrams: 640, zariType: "PURE_SILVER", zariGrams: 160, colours: ["Ivory", "Rose", "Silver"], motifs: ["Kadhua Butis", "Konia Paisley"], weaveTechnique: "KADHUA", dyeType: "AZO_FREE_CHEMICAL" },
      hours: 140, price: [52000, 70000],
      narrative: {
        title: "Turn it over",
        body: "Each buti on this saree is a kadhua — woven individually with its own weft, never cut, never floated. The reverse is as finished as the face. One hundred and forty hours on a jacquard harness his grandfather strung.",
        culturalNote: "Kadhua weaving survives almost exclusively in the Madanpura and Peeli Kothi lanes of Varanasi.",
      },
      certs: [{ type: "GI", number: "GI-00099", issuedBy: "GI Registry of India" }, { type: "SILK_MARK", number: "SM-7781-2026", issuedBy: "Silk Mark Organisation of India" }],
      dispatched: true, scans: 41,
    },
    {
      weaver: "abdul-banarasi",
      name: "Banarasi Silk Stole — Midnight Konia",
      category: "STOLE", colors: ["#1d2440", "#0e1226", "#c9a227"],
      specs: { lengthCm: 210, weightGrams: 160, zariType: "TESTED_ZARI", colours: ["Midnight Blue", "Gold"], motifs: ["Konia Paisley"], weaveTechnique: "CUTWORK", dyeType: "AZO_FREE_CHEMICAL" },
      hours: 30, price: [6500, 9000],
      narrative: { title: "A small piece of Banaras", body: "A stole carrying the konia corner-paisley that has marked Banarasi weaves for two centuries." },
      certs: [],
      scans: 9,
    },
  ];

  const CITIES = ["Chennai", "Bengaluru", "Hyderabad", "Mumbai", "Delhi", "Coimbatore", "Kochi", "Pune", "Kolkata"];
  const tagSecrets: { name: string; passportId: string; secret: string; note: string }[] = [];
  let claimDemoProduct: { passportId: string; secret: string } | null = null;

  for (const def of productDefs) {
    const w = weavers[def.weaver];
    const primaryAssetId = await svgAsset(sareeSvg(def.colors[0], def.colors[1], def.colors[2], def.name.split("—")[0].trim()), "PRODUCT_PRIMARY");
    const onLoomAssetId = await svgAsset(loomSvg(def.colors[0], def.colors[2]), "ON_LOOM");

    const passportId = (await import("../lib/hash")).generatePassportId();
    const product = await Product.create({
      passportId,
      internalSku: `${def.weaver.split("-")[1].slice(0, 3).toUpperCase()}-${def.category.slice(0, 3)}-2026-${String(rand(900) + 100)}`,
      weaverId: w._id, orgId: coop._id,
      item: {
        name: def.name, craft: w.profile.crafts[0], category: def.category,
        giTag: def.certs.some((c) => c.type === "GI") ? { registered: true, giNumber: def.certs.find((c) => c.type === "GI")!.number, name: w.profile.cluster.name + " " + w.profile.crafts[0].name.split(" ")[0] } : { registered: false },
        specs: def.specs,
        production: { startedAt: daysAgo(140), completedAt: daysAgo(30), loomHours: def.hours, weaverCount: def.specs.weaveTechnique === "KORVAI" ? 2 : 1 },
        priceRange: { min: def.price[0], max: def.price[1], currency: "INR" },
      },
      media: { primaryAssetId, onLoomAssetId, gallery: [] },
      narrative: def.narrative,
      status: "DRAFT",
      custody: { currentHolderType: "WEAVER", currentHolderName: w.profile.displayName, since: daysAgo(30) },
      createdBy: officer._id, registrationMode: "ASSISTED",
    });

    // Journey: yarn → dye → weaving → QC
    const journey: [string, number, string, string][] = [
      ["YARN_SOURCED", 150, "COOP", "Mulberry silk yarn lot received; hank yarn, Silk Mark certified"],
      ["DYED", 138, "WEAVER", def.specs.dyeType === "NATURAL" ? "Dyed with natural indigo and madder" : "Azo-free acid dyes, colour-fixed and washed"],
      ["WARPED", 132, "WEAVER", "Street-warping completed with neighbours' help"],
      ["WEAVING_STARTED", 128, "WEAVER", ""],
      ["WEAVING_COMPLETED", 30, "WEAVER", `${def.hours} hours at the loom`],
      ["QC_PASSED", 26, "COOP", "Checked for selvedge finish, zari continuity and weave density"],
    ];
    for (const [type, d, actorType, note] of journey) {
      const e = await recordProvenanceEvent({
        productId: String(product._id), eventType: type,
        actorType, actorId: actorType === "WEAVER" ? String(w._id) : String(officer._id),
        actorName: actorType === "WEAVER" ? w.profile.displayName : coop.name,
        note: note || undefined, location: actorType === "WEAVER" ? w.personal.address.village : coop.address.district,
      });
      e.occurredAt = daysAgo(d);
      await e.save();
    }

    // Link the weaver's own material lots (FR-B2)
    const wl = lots[def.weaver] || {};
    const warpG = Math.round((def.specs.weightGrams as number) * 0.5) || 300;
    const weftG = Math.round((def.specs.weightGrams as number) * 0.45) || 280;
    if (wl.silk) {
      await attachMaterial(product, wl.silk, "WARP", warpG);
      await attachMaterial(product, wl.silk, "WEFT", weftG);
    }
    if (wl.cotton) {
      await attachMaterial(product, wl.cotton, "WARP", warpG);
      await attachMaterial(product, wl.cotton, "WEFT", weftG);
    }
    if (wl.zari && def.specs.zariGrams) await attachMaterial(product, wl.zari, "ZARI", def.specs.zariGrams as number);
    if (wl.dye) await attachMaterial(product, wl.dye, "DYE", 40);
    product.materialHash = computeMaterialHash(product.materials);
    await product.save();

    // Issue passport (ledger + tag secret)
    const issued = await issuePassport(String(product._id));
    if (!issued.ok) throw new Error(`Passport issue failed for ${def.name}: ${issued.error}`);

    // Certificates
    for (const c of def.certs) {
      const cert = await Certificate.create({
        productId: product._id, weaverId: w._id, type: c.type, number: c.number, issuedBy: c.issuedBy,
        issuedAt: daysAgo(25), validUntil: daysAgo(-705), documentHash: sha256(c.number), status: "VALID",
      });
      const entry = await appendLedgerEntry({
        type: "CERTIFICATE_ANCHORED", entityType: "certificate", entityId: `${passportId}/${c.type}`,
        payload: { passportId, type: c.type, number: c.number, documentHash: cert.documentHash },
        summary: `${c.type.replace(/_/g, " ")} ${c.number} anchored for ${passportId}`,
      });
      cert.ledger = { entrySeq: entry.seq };
      await cert.save();
      await Product.updateOne({ _id: product._id }, { $push: { certificates: cert._id } });
      const ce = await recordProvenanceEvent({
        productId: String(product._id), eventType: "CERTIFIED", actorType: "COOP", actorName: c.issuedBy,
        note: `${c.type.replace(/_/g, " ")} ${c.number}`,
      });
      ce.occurredAt = daysAgo(25);
      await ce.save();
    }

    // Dispatch → freeze → retail
    if (def.dispatched) {
      const de = await recordProvenanceEvent({
        productId: String(product._id), eventType: "DISPATCHED", actorType: "COOP",
        actorId: String(officer._id), actorName: coop.name, note: `Consignment to ${retailer.name}`,
      });
      de.occurredAt = daysAgo(20);
      await de.save();
      await freezePassport(String(product._id));
      const re = await recordProvenanceEvent({
        productId: String(product._id), eventType: "RECEIVED", actorType: "RETAILER", actorName: retailer.name,
        note: "Consignment received and tags verified",
      });
      re.occurredAt = daysAgo(18);
      await re.save();
      const rl = await recordProvenanceEvent({
        productId: String(product._id), eventType: "RETAIL_LISTED", actorType: "RETAILER", actorName: retailer.name,
      });
      rl.occurredAt = daysAgo(17);
      await rl.save();
      await Product.updateOne(
        { _id: product._id },
        { $set: { custody: { currentHolderType: "RETAILER", currentHolderName: retailer.name, since: daysAgo(18), history: [{ holderType: "WEAVER", holderName: w.profile.displayName, from: daysAgo(150), to: daysAgo(20) }] } } }
      );
    }

    // Scans
    const scanDocs = [];
    for (let i = 0; i < def.scans; i++) {
      const city = CITIES[rand(CITIES.length)];
      const at = new Date(Date.now() - rand(17 * 86400000));
      scanDocs.push({
        passportId, productId: product._id, scanId: makeScanId(), at,
        source: "QR",
        network: { ipHash: sha256("demo-ip-" + rand(10000)), country: rand(10) === 0 ? "US" : "IN", city },
        client: { uaFamily: "Chrome Mobile", deviceClass: "MOBILE", language: "en-IN", isBot: false },
        session: { anonId: sha256("anon-" + rand(5000) + at.toDateString()), referrer: "camera" },
        engagement: { dwellMs: 20000 + rand(60000), playedVoiceNote: rand(2) === 1, viewedStory: rand(3) > 0 },
      });
    }
    if (scanDocs.length) await Scan.insertMany(scanDocs);
    await Product.updateOne(
      { _id: product._id },
      { $set: { "stats.scanCount": def.scans, "stats.uniqueScanners": Math.ceil(def.scans * 0.8), "stats.lastScanAt": new Date(), "stats.scanCountries": ["IN", "US"] } }
    );
    await Weaver.updateOne({ _id: w._id }, { $inc: { "stats.totalScans": def.scans } });

    // Consumer claim on the hero saree
    if (def.claimed) {
      const tag = await Tag.findOne({ tagCode: passportId });
      tag.secret.claimed = true;
      tag.secret.claimedAt = daysAgo(10);
      tag.status = "CLAIMED";
      await tag.save();
      await Claim.create({
        productId: product._id, passportId, claimantName: "Ananya R.", claimantEmail: "ananya@example.com",
        method: "SCRATCH_SECRET", status: "CLAIMED", claimedAt: daysAgo(10),
      });
      const se = await recordProvenanceEvent({
        productId: String(product._id), eventType: "SOLD", actorType: "RETAILER", actorName: retailer.name,
      });
      se.occurredAt = daysAgo(10);
      await se.save();
      const oc = await recordProvenanceEvent({
        productId: String(product._id), eventType: "OWNERSHIP_CLAIMED", actorType: "CONSUMER", actorName: "Ananya R.",
        note: "Ownership claimed with the scratch-panel code",
      });
      oc.occurredAt = daysAgo(10);
      await oc.save();
      await Product.updateOne(
        { _id: product._id },
        { $set: { "authenticity.claimedByConsumer": true, "authenticity.claimedAt": daysAgo(10), "custody.currentHolderType": "CONSUMER", "custody.currentHolderName": "Ananya R." } }
      );
      claimDemoProduct = { passportId, secret: issued.secret };
      tagSecrets.push({ name: def.name, passportId, secret: issued.secret, note: "ALREADY CLAIMED — claiming again triggers the clone alarm (409)" });
    } else {
      tagSecrets.push({ name: def.name, passportId, secret: issued.secret, note: def.dispatched ? "at retailer, unclaimed — try the claim flow" : "with weaver" });
    }
  }

  /* ── One open consumer fraud report ── */
  await FraudReport.create({
    reportRef: "FR-2026-1024",
    reason: "PHYSICAL_MISMATCH",
    description: "Shop in Chennai Egmore selling sarees with photocopied SUTRA-style tags; QR points to a handwritten code that doesn't resolve. Multiple items, same tag design.",
    reportedBy: { type: "CONSUMER", contact: "concerned.buyer@example.com" },
    riskScore: 45, status: "OPEN",
    autoSignals: [{ signal: "CONSUMER_REPORT", weight: 35, detail: "Unresolvable code reported at point of sale" }],
  });

  /* ── Print the demo sheet ── */
  const lines: string[] = [];
  lines.push("# SUTRA — Demo credentials & tag secrets (LOCAL DEV ONLY)");
  lines.push("");
  lines.push("OTP login: enter the phone number, the OTP is shown on screen (dev mode).");
  lines.push("");
  lines.push("| Role | Phone | Portal |");
  lines.push("|---|---|---|");
  lines.push("| Admin | 9000000001 | /admin/dashboard |");
  lines.push("| Co-op officer | 9000000002 | /coop/dashboard |");
  lines.push("| Verifier (WSC) | 9000000003 | /admin/verify |");
  lines.push("| Retailer | 9000000004 | /coop/dashboard |");
  lines.push("| Weaver — Murugan S. | 9111111111 | /w/dashboard |");
  lines.push("| Weaver — Lakshmi Devi | 9222222222 | /w/dashboard |");
  lines.push("| Weaver — Abdul Rahman | 9333333333 | /w/dashboard |");
  lines.push("| Weaver — Selvi A. (PENDING — verify her in /admin/verify) | 9444444444 | /w/dashboard |");
  lines.push("");
  lines.push("## Passports & scratch-panel secrets");
  lines.push("");
  lines.push("| Product | Passport (URL: /p/{id}) | Secret | Note |");
  lines.push("|---|---|---|---|");
  for (const t of tagSecrets) lines.push(`| ${t.name} | ${t.passportId} | ${t.secret} | ${t.note} |`);
  lines.push("");
  if (claimDemoProduct) {
    lines.push(`Clone-alarm demo: open /p/${claimDemoProduct.passportId}/claim and enter secret ${claimDemoProduct.secret} — it is already claimed, so you get the 409 counterfeit alert and a fraud report appears in /admin/fraud.`);
  }
  const sheet = lines.join("\n");
  fs.writeFileSync(path.join(process.cwd(), "DEMO.md"), sheet, "utf8");
  console.log("\n" + sheet);
  console.log("\nSeed complete. Demo sheet written to DEMO.md");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
