// 抗生素給藥指引（人工整理，與程式產生的 abx-data.js 分開存放）。
// 只收來源文件明載的中性給藥事實：稀釋、輸注時間、途徑限制、已知不良反應。
// 不含院內政策與保險規範。鍵為 abx-data.js 的 drug.name。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ABX_ADMIN = factory();
}(typeof self !== "undefined" ? self : this, function () {
  return {
    "Metronidazole": {
      loading: "Loading dose 15 mg/kg，drip > 1 小時",
      notes: ["1 A = 500 mg / 100 mL，含 13.5 mEq Sodium"],
    },
    "Penicillin G": {
      notes: ["IVD > 30 分鐘"],
      cautions: [
        "快速輸注可能導致心律不整、心跳停止",
        "大劑量可能引起癲癇",
        "其他不良反應：過敏反應、皮疹、發燒、念珠菌二重感染、腹瀉、溶血性貧血",
      ],
    },
    "Teicoplanin (Targocid)": {
      notes: ["最高濃度 4 mg/mL", "drip 30 分鐘"],
      cautions: ["新生兒只能 infusion，不可推注"],
    },
    "Amikacin": { cautions: ["後續 interval 應依 peak / trough 半衰期調整"] },
    "Gentamicin": { cautions: ["後續 interval 應依 peak / trough 半衰期調整"] },
    "Piperacillin/tazobactam": { notes: ["劑量同 Piperacillin"] },
  };
}));
