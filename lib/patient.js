// 病人資料：四個分頁共用一組輸入，填一次到處通用。
// 「用哪個體重」的規則集中在這裡，各分頁不自行判斷。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Patient = factory();
}(typeof self !== "undefined" ? self : this, function () {

  var FIELDS = {
    birthG: 'pBirthWeight', currentG: 'pCurrentWeight',
    ageDays: 'pAgeDays', gaWeeks: 'pGaWeeks', ccr: 'pCcr',
  };

  function read(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    var out = {};
    for (var k in FIELDS) {
      var el = doc && doc.getElementById(FIELDS[k]);
      var v = el ? parseFloat(el.value) : NaN;
      out[k] = isNaN(v) ? null : v;
    }
    out.pmaWeeks = (out.gaWeeks > 0 && out.ageDays >= 0) ? out.gaWeeks + out.ageDays / 7 : null;
    return out;
  }

  // 抗生素表：出生體重為主，當下體重超過出生體重後才改用當下體重
  function effectiveWeight(p) {
    if (!(p.birthG > 0)) return { g: null, reason: '請輸入出生體重' };
    if (!(p.currentG > 0)) return { g: p.birthG, basis: 'birth', reason: '未輸入當下體重，採出生體重' };
    return p.currentG > p.birthG
      ? { g: p.currentG, basis: 'current', reason: '當下體重已超過出生體重，採當下體重' }
      : { g: p.birthG, basis: 'birth', reason: '當下體重未超過出生體重，採出生體重' };
  }

  // 其他藥物與 Fluconazole：以當下體重為準，未填則退回出生體重
  function currentWeight(p) {
    if (p.currentG > 0) return { g: p.currentG, basis: 'current', reason: '採當下體重' };
    if (p.birthG > 0) return { g: p.birthG, basis: 'birth', reason: '未輸入當下體重，採出生體重' };
    return { g: null, reason: '請輸入體重' };
  }

  // 任一欄變動時通知各分頁清掉舊結果，避免病人換了結果還留著
  function onChange(fn, doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    for (var k in FIELDS) {
      var el = doc.getElementById(FIELDS[k]);
      if (el) { el.addEventListener('change', fn); el.addEventListener('input', fn); }
    }
  }

  return { FIELDS: FIELDS, read: read, effectiveWeight: effectiveWeight,
           currentWeight: currentWeight, onChange: onChange };
}));
