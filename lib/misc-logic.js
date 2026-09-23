// Surfactant / AOP / PDA 劑量換算與覆核。瀏覽器與測試共用。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MiscLogic = factory();
}(typeof self !== "undefined" ? self : this, function () {

  // 每劑量 = 每公斤量 × 體重(kg)；範圍值保留上下限，不取中位數
  function amountFor(regimen, weightG) {
    if (!regimen || !(weightG > 0)) return null;
    var kg = weightG / 1000;
    var f = regimen.perKg ? kg : 1;
    return {
      label: regimen.label, min: regimen.min * f, max: regimen.max * f,
      unit: regimen.unit, interval: regimen.interval || null, note: regimen.note || null,
      perKgText: (regimen.min === regimen.max ? regimen.min : regimen.min + '-' + regimen.max)
        + ' ' + regimen.unit + (regimen.perKg ? '/kg/dose' : '/dose'),
    };
  }

  // IV 最高濃度 → 反推「至少要泡到幾 mL」；口服藥水濃度 → 換算實際抽取容積
  function volumeFor(drug, amt) {
    if (!amt || amt.unit !== 'mg') return null;
    if (drug.maxConc) return {
      kind: 'min', value: amt.min / drug.maxConc.value, valueMax: amt.max / drug.maxConc.value,
      text: '依最高濃度 ' + drug.maxConc.value + ' ' + drug.maxConc.unit + '，至少需稀釋至',
    };
    if (drug.oralForm) return {
      kind: 'exact', value: amt.min / drug.oralForm.concentration, valueMax: amt.max / drug.oralForm.concentration,
      text: drug.oralForm.name + '（' + drug.oralForm.concentration + ' ' + drug.oralForm.concUnit + '）需抽取',
    };
    return null;
  }

  function compute(drug, weightG) {
    if (!drug) return { ok: false, reason: '請選擇藥品' };
    if (!(weightG > 0)) return { ok: false, reason: '請輸入體重' };
    var rows = drug.regimens.map(function (r) {
      var amt = amountFor(r, weightG);
      amt.volume = volumeFor(drug, amt);
      return amt;
    });
    return { ok: true, rows: rows, drug: drug };
  }

  // 覆核：比對醫師欲開立的劑量與本表建議
  function reviewOrder(row, ordered) {
    if (!row) return { verdict: 'n/a', text: '請先查劑量' };
    if (!(ordered > 0)) return { verdict: 'n/a', text: '請輸入欲覆核的每劑劑量' };
    var out = { row: row, ordered: ordered };
    if (ordered < row.min) { out.verdict = 'low'; out.deviation = (ordered / row.min - 1) * 100; }
    else if (ordered > row.max) { out.verdict = 'high'; out.deviation = (ordered / row.max - 1) * 100; }
    else { out.verdict = 'match'; out.deviation = 0; }
    return out;
  }

  return { amountFor: amountFor, volumeFor: volumeFor, compute: compute, reviewOrder: reviewOrder };
}));
