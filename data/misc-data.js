// Surfactant / AOP / PDA 劑量資料。僅含計算所需數值，不含院內政策與保險規範文字。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MISC_DATA = factory();
}(typeof self !== "undefined" ? self : this, function () {
  return {
    dataVersion: "2026-09-23",
    categories: ["Surfactant", "AOP", "PDA"],
    drugs: [
      {
        id: "curosurf", name: "Curosurf (Poractant alfa)", category: "Surfactant",
        route: "ETT", notes: ["Porcine lung tissue"],
        timing: "prophylactic ≤15 min／early ≤2 hr／rescue >2 hr",
        regimens: [
          { label: "初次劑量", min: 2.5, max: 2.5, unit: "mL", perKg: true },
          { label: "重複劑量", min: 1.25, max: 1.25, unit: "mL", perKg: true }
        ]
      },
      {
        id: "survanta", name: "Survanta (Beractant)", category: "Surfactant",
        route: "ETT", notes: ["Bovine lung tissue"],
        timing: "prophylactic ≤15 min／early ≤2 hr／rescue >2 hr",
        regimens: [
          { label: "劑量", min: 4, max: 4, unit: "mL", perKg: true }
        ]
      },
      {
        id: "aminophylline", name: "Aminophylline", category: "AOP",
        route: "IVD / PO",
        regimens: [
          { label: "Loading", min: 5, max: 5, unit: "mg", perKg: true },
          { label: "Maintenance", min: 2, max: 2, unit: "mg", perKg: true, interval: "Q12H" }
        ],
        levels: { therapeutic: "6~12 µg/mL", toxic: "> 15-20 µg/mL" },
        // 口服改用 Theophylline Soln 時可換算容積
        oralForm: { name: "Theophylline Soln (PO)", concentration: 5.34, concUnit: "mg/mL" }
      },
      {
        id: "caffeine_citrate", name: "Caffeine citrate", category: "AOP",
        route: "PO / IV（over 30 mins）",
        regimens: [
          { label: "Loading", min: 20, max: 20, unit: "mg", perKg: true },
          { label: "Maintenance", min: 5, max: 10, unit: "mg", perKg: true, interval: "QD" }
        ],
        levels: { therapeutic: "5-20 µg/mL", toxic: "> 50 µg/mL" }
      },
      {
        id: "ibuprofen_standard", name: "Ibuprofen（standard-dose）", category: "PDA",
        route: "IV / PO",
        regimens: [
          { label: "第 1 劑", min: 10, max: 10, unit: "mg", perKg: true, note: "× 1 dose" },
          { label: "第 2-3 劑", min: 5, max: 5, unit: "mg", perKg: true, interval: "Q24h", note: "× 2 doses" }
        ],
        maxConc: { value: 4, unit: "mg/mL" },
        constraints: ["IV form 最高濃度 4 mg/cc", "drip > 15 minutes"]
      },
      {
        id: "ibuprofen_high", name: "Ibuprofen（high-dose）", category: "PDA",
        route: "IV / PO",
        regimens: [
          { label: "第 1 劑", min: 20, max: 20, unit: "mg", perKg: true, note: "× 1 dose" },
          { label: "第 2-3 劑", min: 10, max: 10, unit: "mg", perKg: true, interval: "Q24h", note: "× 2 doses" }
        ],
        maxConc: { value: 4, unit: "mg/mL" },
        constraints: ["IV form 最高濃度 4 mg/cc", "drip > 15 minutes"]
      },
      {
        id: "paracetamol_po", name: "Paracetamol (Acetaminophen)", category: "PDA",
        route: "PO",
        regimens: [
          { label: "劑量", min: 15, max: 15, unit: "mg", perKg: true, interval: "q6h", note: "3-7 days" }
        ]
      },
      {
        id: "propacetamol_iv", name: "Propacetamol", category: "PDA",
        route: "IV",
        // 只能以 vial 為單位開立，因此算完 mg 還要換算成 v
        supply: { label: "v", perUnitMg: 1000, note: "1 v = 1 g", orderInUnit: true },
        regimens: [
          { label: "劑量", min: 30, max: 30, unit: "mg", perKg: true, interval: "q6h", note: "3-7 days" }
        ]
      }
    ]
  };
}));
