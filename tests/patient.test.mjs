// 病人資料：共用欄位與「用哪個體重」的規則
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require(new URL('../lib/patient.js', import.meta.url).pathname);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
};
const doc = v => ({ getElementById: id => ({ value: v[id] === undefined ? '' : String(v[id]) }) });
const read = v => P.read(doc(v));

eq('五個共用欄位', Object.keys(P.FIELDS).length, 5);
eq('未填者為 null', read({}).birthG, null);
eq('讀取數值', read({ pBirthWeight: 1500, pAgeDays: 3 }).birthG, 1500);
eq('PMA = GA + 日齡/7', Math.round(read({ pGaWeeks: 30, pAgeDays: 7 }).pmaWeeks * 10) / 10, 31);
eq('缺 GA 則無 PMA', read({ pAgeDays: 7 }).pmaWeeks, null);

// 抗生素表：max(出生, 當下)
eq('生1500/現1420 → 1500', P.effectiveWeight(read({ pBirthWeight: 1500, pCurrentWeight: 1420 })).g, 1500);
eq('生1000/現1300 → 1300', P.effectiveWeight(read({ pBirthWeight: 1000, pCurrentWeight: 1300 })).g, 1300);
eq('僅出生體重', P.effectiveWeight(read({ pBirthWeight: 1000 })).g, 1000);
eq('缺出生體重 → 拒答', P.effectiveWeight(read({ pCurrentWeight: 1300 })).g, null);
eq('缺出生體重理由', P.effectiveWeight(read({ pCurrentWeight: 1300 })).reason, '請輸入出生體重');

// 其他藥物／Fluconazole：當下優先
eq('當下優先', P.currentWeight(read({ pBirthWeight: 1500, pCurrentWeight: 1420 })).g, 1420);
eq('當下未填退回出生', P.currentWeight(read({ pBirthWeight: 1500 })).g, 1500);
eq('退回出生時說明', P.currentWeight(read({ pBirthWeight: 1500 })).reason, '未輸入當下體重，採出生體重');
eq('兩者皆無 → 拒答', P.currentWeight(read({})).g, null);

// 兩種規則在「當下體重較輕」時必然不同，不可混用
const p = read({ pBirthWeight: 1500, pCurrentWeight: 1200 });
eq('生理性體重下降時兩規則不同', [P.effectiveWeight(p).g, P.currentWeight(p).g], [1500, 1200]);

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
