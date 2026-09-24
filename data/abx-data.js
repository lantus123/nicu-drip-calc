// 抗生素劑量查詢資料。
// 初版由程式自來源文件產生並逐格比對驗證（130/130），產生器已完成階段性任務、
// 且需讀取不納入版控的來源文件，因此不隨附。此後本檔即為真相來源，
// 由 tests/abx.test.mjs 與 tests/route.test.mjs 把關，可直接維護。
// 資料來源見 source 欄位。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ABX_DATA = factory();
}(typeof self !== "undefined" ? self : this, function () {
  return {
  "source": "Remington, Infectious Diseases of the Fetus and Newborn Infant, 8th ed (2016), p.1159",
  "dataVersion": "2026-09-23",
  "bands": [
    {
      "id": "lt1200_0_4w",
      "weight": "<1200 g",
      "age": "0-4 wks"
    },
    {
      "id": "w1200_2000_le7d",
      "weight": "1200~2000 g",
      "age": "0~7 days"
    },
    {
      "id": "w1200_2000_gt7d",
      "weight": "1200~2000 g",
      "age": ">7 days"
    },
    {
      "id": "gt2000_le7d",
      "weight": ">2000 g",
      "age": "0~7 days"
    },
    {
      "id": "gt2000_gt7d",
      "weight": ">2000 g",
      "age": ">7 days"
    }
  ],
  "notes": {
    "note1": "<1200g 且 age>4 週時，interval 改 q8h",
    "note2": "Term baby >1m/o 或 preterm PMA>44 wks：2.5 mg/kg/dose q8h 或 q12h（sepsis / UTI）",
    "note3": "後續 interval 應依 aminoglycoside peak/trough 半衰期調整",
    "pma40": "PMA > 40 wk 時 interval 改 Q6H",
    "star": "原文帶 * 註記，來源文件未定義其意義"
  },
  "drugs": [
    {
      "id": "amikacin_odd",
      "name": "Amikacin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "18 q48h",
        "w1200_2000_le7d": "18 q36h",
        "w1200_2000_gt7d": "15 q24h",
        "gt2000_le7d": "15 q24h",
        "gt2000_gt7d": "15 q24h"
      },
      "regimen": "ODD",
      "flags": [
        "aminoglycoside"
      ]
    },
    {
      "id": "cefazolin",
      "name": "Cefazolin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "25 q12h",
        "w1200_2000_le7d": "25 q12h",
        "w1200_2000_gt7d": "25 q8h",
        "gt2000_le7d": "50 q12h",
        "gt2000_gt7d": "50 q8h"
      }
    },
    {
      "id": "cefepime",
      "name": "Cefepime",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "50 q12h",
        "w1200_2000_le7d": "50 q12h",
        "w1200_2000_gt7d": "50 q8h",
        "gt2000_le7d": "50 q12h",
        "gt2000_gt7d": "50 q8h"
      }
    },
    {
      "id": "cefotaxime_claforan_sepsis",
      "name": "Cefotaxime (Claforan)",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "50 q12h",
        "w1200_2000_le7d": "50 q12h",
        "w1200_2000_gt7d": "50 q8h",
        "gt2000_le7d": "50 q12h",
        "gt2000_gt7d": "50 q8h"
      },
      "indication": "sepsis"
    },
    {
      "id": "cefotaxime_claforan_meningitis",
      "name": "Cefotaxime (Claforan)",
      "route": "",
      "doses": {
        "lt1200_0_4w": "100 q12h",
        "w1200_2000_le7d": "100 q12h",
        "w1200_2000_gt7d": "67 q8h",
        "gt2000_le7d": "100 q12h",
        "gt2000_gt7d": "67 q8h"
      },
      "indication": "meningitis"
    },
    {
      "id": "ceftazidime_fortum",
      "name": "Ceftazidime(Fortum)",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "50 q12h註1",
        "w1200_2000_le7d": "50 q12h",
        "w1200_2000_gt7d": "50 q8h",
        "gt2000_le7d": "50 q12h",
        "gt2000_gt7d": "50 q8h"
      },
      "note1Bands": [
        "lt1200_0_4w"
      ]
    },
    {
      "id": "ceftriaxone_rocephin",
      "name": "Ceftriaxone(Rocephin)",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "50 q24h",
        "w1200_2000_le7d": "50 q24h",
        "w1200_2000_gt7d": "50 q24h",
        "gt2000_le7d": "50 q24h",
        "gt2000_gt7d": "75 q24h"
      }
    },
    {
      "id": "cephalothin",
      "name": "Cephalothin",
      "route": "IV",
      "doses": {
        "lt1200_0_4w": "20 q12h",
        "w1200_2000_le7d": "20 q12h",
        "w1200_2000_gt7d": "20 q8h",
        "gt2000_le7d": "20 q8h",
        "gt2000_gt7d": "20 q6h"
      }
    },
    {
      "id": "chloramphenicol",
      "name": "Chloramphenicol",
      "route": "IV, PO",
      "doses": {
        "lt1200_0_4w": "25 q24h",
        "w1200_2000_le7d": "25 q24h",
        "w1200_2000_gt7d": "25 q24h",
        "gt2000_le7d": "25 q24h",
        "gt2000_gt7d": "25 q12h"
      },
      "flags": [
        "star"
      ]
    },
    {
      "id": "ciprofloxacin",
      "name": "Ciprofloxacin",
      "route": "IV",
      "doses": {
        "lt1200_0_4w": null,
        "w1200_2000_le7d": null,
        "w1200_2000_gt7d": "10-20 q24h",
        "gt2000_le7d": null,
        "gt2000_gt7d": "20-30 q12h"
      }
    },
    {
      "id": "clindamycin",
      "name": "Clindamycin",
      "route": "IV, IM, PO",
      "doses": {
        "lt1200_0_4w": "5-7.5 q12h",
        "w1200_2000_le7d": "5-7.5 q12h",
        "w1200_2000_gt7d": "5-7.5 q8h",
        "gt2000_le7d": "5-7.5 q8h",
        "gt2000_gt7d": "5-7.5 q6h"
      }
    },
    {
      "id": "erythromycin",
      "name": "Erythromycin",
      "route": "PO",
      "doses": {
        "lt1200_0_4w": "10 q12h",
        "w1200_2000_le7d": "10 q12h",
        "w1200_2000_gt7d": "10 q8h",
        "gt2000_le7d": "10 q12h",
        "gt2000_gt7d": "10 q8h"
      }
    },
    {
      "id": "gentamicin_sdd",
      "name": "Gentamicin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "2.5 q18h",
        "w1200_2000_le7d": "2.5 q12h",
        "w1200_2000_gt7d": "2.5 q8h",
        "gt2000_le7d": "2.5 q12h",
        "gt2000_gt7d": "2.5 q8h"
      },
      "regimen": "SDD",
      "flags": [
        "aminoglycoside",
        "pma44"
      ]
    },
    {
      "id": "gentamicin_odd",
      "name": "Gentamicin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "5 q48h",
        "w1200_2000_le7d": "4 q36h",
        "w1200_2000_gt7d": "4 q24h",
        "gt2000_le7d": "4 q24h",
        "gt2000_gt7d": "4 q24h"
      },
      "regimen": "ODD",
      "flags": [
        "aminoglycoside",
        "pma44"
      ]
    },
    {
      "id": "imipenem",
      "name": "Imipenem",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "20 q12h",
        "w1200_2000_le7d": "20 q12h",
        "w1200_2000_gt7d": "20 q12h",
        "gt2000_le7d": "20 q12h",
        "gt2000_gt7d": "20 q8h"
      }
    },
    {
      "id": "linezolid",
      "name": "Linezolid",
      "route": "IV",
      "doses": {
        "lt1200_0_4w": "10 q12h",
        "w1200_2000_le7d": "10 q12h",
        "w1200_2000_gt7d": "10 q8h",
        "gt2000_le7d": "10 q8h",
        "gt2000_gt7d": "10 q8h"
      }
    },
    {
      "id": "metronidazole",
      "name": "Metronidazole",
      "route": "IVD",
      "doses": {
        "lt1200_0_4w": "7.5 q24h",
        "w1200_2000_le7d": "7.5 q12h",
        "w1200_2000_gt7d": "7.5 q12h",
        "gt2000_le7d": "7.5 q12h",
        "gt2000_gt7d": "7.5 q8h*"
      },
      "flags": [
        "pma40"
      ],
      "freeText": "Loading dose: 15mg/kg (drip > 1 hour); Maintain dose如下:"
    },
    {
      "id": "meropenem_sepsis",
      "name": "Meropenem",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "20 q12h註1",
        "w1200_2000_le7d": "20 q12h",
        "w1200_2000_gt7d": "20 q8h",
        "gt2000_le7d": "20 q8h",
        "gt2000_gt7d": "30 q8h"
      },
      "indication": "sepsis",
      "note1Bands": [
        "lt1200_0_4w"
      ]
    },
    {
      "id": "meropenem_meningitis",
      "name": "Meropenem",
      "route": "",
      "doses": {
        "lt1200_0_4w": "40 q12h註1",
        "w1200_2000_le7d": "40 q12h",
        "w1200_2000_gt7d": "40 q8h",
        "gt2000_le7d": "40 q8h",
        "gt2000_gt7d": "40 q8h"
      },
      "indication": "meningitis",
      "note1Bands": [
        "lt1200_0_4w"
      ]
    },
    {
      "id": "oxacillin_sepsis",
      "name": "Oxacillin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "25 q12h註1",
        "w1200_2000_le7d": "25 q12h",
        "w1200_2000_gt7d": "25 q8h",
        "gt2000_le7d": "25 q8h",
        "gt2000_gt7d": "25 q6h"
      },
      "indication": "sepsis",
      "note1Bands": [
        "lt1200_0_4w"
      ]
    },
    {
      "id": "oxacillin_meningitis",
      "name": "Oxacillin",
      "route": "",
      "doses": {
        "lt1200_0_4w": "50 q12h註1",
        "w1200_2000_le7d": "50 q12h",
        "w1200_2000_gt7d": "50 q8h",
        "gt2000_le7d": "50 q8h",
        "gt2000_gt7d": "50 q6h"
      },
      "indication": "meningitis",
      "note1Bands": [
        "lt1200_0_4w"
      ]
    },
    {
      "id": "penicillin_g_sepsis",
      "name": "Penicillin G",
      "route": "IVD / >30 min",
      "doses": {
        "lt1200_0_4w": "5萬U q12h",
        "w1200_2000_le7d": "5萬U q12h",
        "w1200_2000_gt7d": "5萬U q8h",
        "gt2000_le7d": "5萬U q8h",
        "gt2000_gt7d": "5萬U q6h"
      },
      "indication": "sepsis"
    },
    {
      "id": "penicillin_g_gbs_meningitis",
      "name": "Penicillin G",
      "route": "(同上列)",
      "doses": {
        "lt1200_0_4w": "12.5萬U q12h",
        "w1200_2000_le7d": "12.5萬U q12h",
        "w1200_2000_gt7d": "12.5萬U q8h",
        "gt2000_le7d": "12.5萬U q8h",
        "gt2000_gt7d": "12.5萬q6h"
      },
      "indication": "GBS meningitis"
    },
    {
      "id": "penicillin_benzathine",
      "name": "Penicillin benzathine",
      "route": "IM",
      "doses": {
        "lt1200_0_4w": null,
        "w1200_2000_le7d": "5萬U (x1)",
        "w1200_2000_gt7d": "5萬U (x1 )",
        "gt2000_le7d": "5萬U (x1 )",
        "gt2000_gt7d": "5萬U (x1 )"
      }
    },
    {
      "id": "penicillin_procaine",
      "name": "Penicillin procaine",
      "route": "IM",
      "doses": {
        "lt1200_0_4w": null,
        "w1200_2000_le7d": "5萬U q24h",
        "w1200_2000_gt7d": "5萬U q24h",
        "gt2000_le7d": "5萬U q24h",
        "gt2000_gt7d": "5萬U q24h"
      }
    },
    {
      "id": "piperacillin",
      "name": "Piperacillin",
      "route": "IV, IM",
      "doses": {
        "lt1200_0_4w": "50-100 q12h",
        "w1200_2000_le7d": "100 q12h",
        "w1200_2000_gt7d": "100 q8h",
        "gt2000_le7d": "100 q12h",
        "gt2000_gt7d": "100 q8h"
      }
    },
    {
      "id": "piperacillin_tazobactam",
      "name": "Piperacillin/tazobactam",
      "route": "",
      "doses": {
        "lt1200_0_4w": null,
        "w1200_2000_le7d": null,
        "w1200_2000_gt7d": null,
        "gt2000_le7d": null,
        "gt2000_gt7d": null
      },
      "sameAs": "Piperacillin",
      "freeText": "same as for piperacillin"
    },
    {
      "id": "rifampin",
      "name": "Rifampin",
      "route": "IV",
      "doses": {
        "lt1200_0_4w": "5-10 q12h",
        "w1200_2000_le7d": "5-10 q12h",
        "w1200_2000_gt7d": "5-10 q12h",
        "gt2000_le7d": "5-10 q12h",
        "gt2000_gt7d": "5-10 q12h"
      }
    },
    {
      "id": "teicoplanin_targocid",
      "name": "Teicoplanin (Targocid)",
      "route": "IV",
      "doses": {
        "lt1200_0_4w": null,
        "w1200_2000_le7d": null,
        "w1200_2000_gt7d": null,
        "gt2000_le7d": null,
        "gt2000_gt7d": null
      },
      "freeText": "For intact renal function: 16 loading, 8 qd (if IVF, max 4mg/ml / drip 30 mins. Neonates 只能infusion)"
    }
  ]
};
}));
