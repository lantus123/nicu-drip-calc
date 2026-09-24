// 以「PMA × 日齡」決定 interval 的抗生素（與 abx-data.js 的「體重帶 × 日齡」是兩套查表方式）。
// 僅收印刷內容，不含院內流程語句、修訂標記與手寫註記。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ABX_PMA_DATA = factory();
}(typeof self !== "undefined" ? self : this, function () {

  // PMA 帶的寫法為「≤29 / 30-36 / 37-44 / ≥45」，字面上 29~30、36~37、44~45 之間有空隙。
  // 依完成週數判讀銜接：<30、<37、<45、其餘。畫面上會標示此判讀。
  var PMA_WORDING = "來源寫法為「≤29／30-36／37-44／≥45 週」，本工具以完成週數判讀為 <30、<37、<45、≥45 銜接";

  return {
    dataVersion: "2026-09-24",
    source: "（出處待確認）",
    pmaWordingNote: PMA_WORDING,
    drugs: [
      {
        id: "ampicillin", name: "Ampicillin", route: "IV, IM", kind: "pma",
        maxPerDay: { value: 400, unit: "mg" },
        intervalTable: [
          { pmaMax: 30, pnaMax: 28, hours: 12, label: "PMA <30 週，日齡 0-28 天" },
          { pmaMax: 30, pnaMax: Infinity, hours: 8, label: "PMA <30 週，日齡 >28 天" },
          { pmaMax: 37, pnaMax: 14, hours: 12, label: "PMA 30-36 週，日齡 0-14 天" },
          { pmaMax: 37, pnaMax: Infinity, hours: 8, label: "PMA 30-36 週，日齡 >14 天" },
          { pmaMax: 45, pnaMax: 7, hours: 12, label: "PMA 37-44 週，日齡 0-7 天" },
          { pmaMax: 45, pnaMax: Infinity, hours: 8, label: "PMA 37-44 週，日齡 >7 天" },
          { pmaMax: Infinity, pnaMax: Infinity, hours: 6, label: "PMA ≥45 週" }
        ],
        regimens: [
          { id: "usual", label: "Usual", basis: "perDay", min: 100, max: 100, unit: "mg" },
          { id: "sepsis", label: "Sepsis", basis: "perDay", min: 200, max: 200, unit: "mg" },
          {
            id: "meningitis", label: "Meningitis", basis: "perDay", min: 300, max: 300, unit: "mg",
            // Meningitis 不走上面的 interval 表，另有規則
            intervalTable: [
              { pmaMax: 45, pnaMax: Infinity, hours: 8, label: "Meningitis，PMA ≤44 週" },
              { pmaMax: Infinity, pnaMax: Infinity, hours: 6, label: "Meningitis，PMA ≥45 週" }
            ]
          }
        ]
      },
      {
        id: "unasyn", name: "Ampicillin/sulbactam (Unasyn)", route: "IVD 10-15 分鐘", kind: "pma",
        vial: "1.5 g/vial（ampicillin 1 g + sulbactam 0.5 g）",
        maxConcentration: { value: 45, unit: "mg/mL", note: "以 Unasyn 總量計" },
        intervalTable: [
          { pmaMax: 37, pnaMax: Infinity, hours: 12, label: "PMA <37 週" },
          { pmaMax: Infinity, pnaMax: 8, hours: 8, label: "PMA ≥37 週，日齡 ≤8 天" }
          // PMA ≥37 週且日齡 >8 天、但未滿 1 個月者，來源未涵蓋 → 由邏輯層拒答
        ],
        regimens: [
          { id: "standard", label: "標準", basis: "perDay", min: 100, max: 100, unit: "mg" },
          { id: "infant", label: "≥1 個月", basis: "perDay", min: 100, max: 150, unit: "mg", fixedHours: 6, fixedLabel: "≥1 個月，Q6H" },
          { id: "infant_meningitis", label: "≥1 個月 meningitis", basis: "perDay", min: 200, max: 300, unit: "mg", fixedHours: 6, fixedLabel: "≥1 個月 meningitis，Q6H" }
        ]
      },
      {
        id: "vancomycin", name: "Vancomycin", route: "IV", kind: "pma",
        vial: "500 mg/vial",
        cautions: ["MIC > 2 mg 時表示 resistance，考慮換藥"],
        intervalTable: [
          { pmaMax: 30, pnaMax: 14, hours: 18, label: "PMA <30 週，日齡 0-14 天" },
          { pmaMax: 30, pnaMax: Infinity, hours: 12, label: "PMA <30 週，日齡 >14 天" },
          { pmaMax: 37, pnaMax: 14, hours: 12, label: "PMA 30-36 週，日齡 0-14 天" },
          { pmaMax: 37, pnaMax: Infinity, hours: 8, label: "PMA 30-36 週，日齡 >14 天" },
          { pmaMax: 45, pnaMax: 7, hours: 12, label: "PMA 37-44 週，日齡 0-7 天" },
          { pmaMax: 45, pnaMax: Infinity, hours: 8, label: "PMA 37-44 週，日齡 >7 天" },
          { pmaMax: Infinity, pnaMax: Infinity, hours: 6, label: "PMA ≥45 週" }
        ],
        regimens: [
          { id: "bacteremia", label: "Bacteremia", basis: "perDose", min: 10, max: 10, unit: "mg" },
          { id: "meningitis", label: "Meningitis", basis: "perDose", min: 15, max: 15, unit: "mg" },
          { id: "vlbw", label: "PMA <26 週", basis: "perDose", min: 8, max: 12, unit: "mg",
            note: "PMA <26 週給 15 mg/kg/dose 會使血中濃度過高" },
          { id: "picc", label: "PICC 移除前", basis: "perDose", min: 10, max: 10, unit: "mg",
            single: true, note: "單次（ST）" },
          { id: "infant", label: "≥1 個月／兒童", basis: "perDay", min: 40, max: 40, unit: "mg", fixedHours: 6, fixedLabel: "≥1 個月，q6-8h（此處以 q6h 計）" },
          { id: "staph_cns", label: "Staphylococcal CNS", basis: "perDay", min: 60, max: 60, unit: "mg",
            fixedHours: 6, fixedLabel: "Staphylococcal CNS infection，q6h", maxPerDose: { value: 1000, unit: "mg" } }
        ]
      }
    ]
  };
}));
