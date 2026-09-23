// Fluconazole 劑量資料。僅含計算所需數值與給藥限制，不含院內適應症條件與保險規範文字。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FLU_DATA = factory();
}(typeof self !== "undefined" ? self : this, function () {
  return {
    dataVersion: "2026-09-23",
    drug: "Fluconazole (Diflucan)",
    vial: { strength: 100, volume: 50, concentration: 2, unit: "mg/mL" },
    sameDoseOralIv: true,

    // 早產兒治療劑量：interval 依 GA 與日齡決定
    treatment: {
      loading: { min: 12, max: 25, unit: "mg", perKg: true },
      maintenance: { min: 12, max: 12, unit: "mg", perKg: true },
      intervalRules: [
        { gaMax: 30, pnaMax: 14, interval: "q48h", label: "GA <30 週，日齡 0-14 天" },
        { gaMax: 30, pnaMax: Infinity, interval: "q24h", label: "GA <30 週，日齡 >14 天" },
        { gaMax: Infinity, pnaMax: 7, interval: "q48h", label: "GA ≥30 週，日齡 0-7 天" },
        { gaMax: Infinity, pnaMax: Infinity, interval: "q24h", label: "GA ≥30 週，日齡 >7 天" }
      ],
      // 原文寫「≦GA29wk」與「＞GA30wk」，字面上 29~30 週之間無規則；
      // 此處以 30 週為界銜接，並在畫面標示此判讀。
      gaWordingNote: "來源文件原文為「≦GA29wk」與「＞GA30wk」，本工具以 GA 30 週為分界銜接"
    },

    // 預防劑量
    prophylaxis: {
      dose: { min: 3, max: 3, unit: "mg", perKg: true },
      frequency: "Twice weekly",
      infusionMinutes: 60,
      // 2021 年增修：劑量可無條件進位至整數（參考劑量範圍 3-6 mg/kg/dose twice weekly）
      roundUpToInteger: true,
      roundUpBasis: "參考劑量範圍 3-6 mg/kg/dose twice weekly，進位後仍在範圍內"
    },

    // 日齡 >14 天之新生兒、嬰兒與兒童：依適應症
    indications: [
      { id: "oropharyngeal", name: "Oropharyngeal candidiasis", day1: { min: 6, max: 6 }, daily: { min: 3, max: 3 }, duration: "14 d" },
      { id: "esophageal", name: "Esophageal candidiasis", day1: { min: 6, max: 6 }, daily: { min: 3, max: 3 }, dailyNote: "up to 12 mg/kg/d", duration: "21 d" },
      // 原表此列僅三格，Day 1 與 Daily Therapy 為合併儲存格
      { id: "systemic", name: "Systemic candidiasis", day1: { min: 6, max: 12 }, daily: { min: 6, max: 12 }, spanned: true, duration: "28 d" },
      { id: "cryptococcal", name: "Cryptococcal meningitis", day1: { min: 12, max: 12 }, daily: { min: 6, max: 6 }, dailyNote: "up to 12 mg/kg/d", duration: "10-12 wk after CSF culture becomes negative" },
      // 原表此列缺 Daily Therapy 與 Duration
      { id: "relapse", name: "Relapse", day1: { min: 6, max: 6 }, daily: null, duration: null, incomplete: true }
    ],
    neonateUnder14d: "日齡 0-14 天：劑量同較大兒童，但 interval 改為 every 24-72h",

    renal: { ccrThreshold: 50, factor: 0.5, note: "CCr < 50：給予建議劑量的 50%", hemodialysis: "血液透析：每次透析後給一次建議劑量" },
    administration: {
      ivMinHours: 2, maxRateMgPerHour: 200, maxConcentration: 2, concUnit: "mg/mL",
      warnings: ["不可 IM／IVP", "口服與靜脈劑量相同"]
    }
  };
}));
