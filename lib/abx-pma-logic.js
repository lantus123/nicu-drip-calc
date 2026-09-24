// 「PMA × 日齡」型抗生素的 interval 判定與劑量換算。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AbxPmaLogic = factory();
}(typeof self !== "undefined" ? self : this, function () {

  function fmt(n) {
    if (typeof n !== 'number' || isNaN(n)) return String(n);
    return String(Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100);
  }
  function rangeText(a, b) { return a === b ? fmt(a) : fmt(a) + '~' + fmt(b); }

  // 用法可自帶 interval 表或固定 interval，否則沿用藥品層的表
  function intervalFor(drug, regimen, pmaWeeks, pnaDays) {
    if (regimen && regimen.fixedHours) {
      return { hours: regimen.fixedHours, label: regimen.fixedLabel || ('固定 q' + regimen.fixedHours + 'h') };
    }
    if (!(pmaWeeks > 0)) return { error: '請輸入出生 GA 與日齡（需要 PMA）' };
    if (!(pnaDays >= 0)) return { error: '請輸入日齡' };
    var table = (regimen && regimen.intervalTable) || drug.intervalTable;
    for (var i = 0; i < table.length; i++) {
      var r = table[i];
      if (pmaWeeks < r.pmaMax && pnaDays <= r.pnaMax) return { hours: r.hours, label: r.label };
    }
    return { error: '來源未涵蓋此 PMA／日齡組合，無建議 interval' };
  }

  function compute(drug, regimen, weightG, pmaWeeks, pnaDays) {
    if (!drug || !regimen) return { ok: false, reason: '請選擇藥品與用法' };
    if (!(weightG > 0)) return { ok: false, reason: '請輸入體重' };
    var iv = intervalFor(drug, regimen, pmaWeeks, pnaDays);
    if (iv.error) return { ok: false, reason: iv.error };

    var kg = weightG / 1000;
    var dosesPerDay = 24 / iv.hours;
    var perDoseMin, perDoseMax, perDayMin, perDayMax;
    if (regimen.basis === 'perDay') {
      perDayMin = regimen.min * kg; perDayMax = regimen.max * kg;
      perDoseMin = perDayMin / dosesPerDay; perDoseMax = perDayMax / dosesPerDay;
    } else {
      perDoseMin = regimen.min * kg; perDoseMax = regimen.max * kg;
      perDayMin = perDoseMin * dosesPerDay; perDayMax = perDoseMax * dosesPerDay;
    }

    var notes = [];
    if (regimen.note) notes.push(regimen.note);
    // 單次給藥不談每日總量
    var single = !!regimen.single;
    // 上限檢查
    var exceeded = null;
    if (drug.maxPerDay && perDayMax > drug.maxPerDay.value * kg)
      exceeded = '超過上限 ' + drug.maxPerDay.value + ' ' + drug.maxPerDay.unit + '/kg/day';
    if (regimen.maxPerDose && perDoseMax > regimen.maxPerDose.value)
      exceeded = '單劑超過上限 ' + regimen.maxPerDose.value + ' ' + regimen.maxPerDose.unit;

    return {
      ok: true, drug: drug, regimen: regimen,
      interval: 'q' + iv.hours + 'h', intervalHours: iv.hours, bandLabel: iv.label,
      dosesPerDay: dosesPerDay, single: single,
      perDose: { min: perDoseMin, max: perDoseMax, unit: regimen.unit },
      perDay: { min: perDayMin, max: perDayMax, unit: regimen.unit },
      perKgPerDay: { min: regimen.basis === 'perDay' ? regimen.min : regimen.min * dosesPerDay,
                     max: regimen.basis === 'perDay' ? regimen.max : regimen.max * dosesPerDay },
      notes: notes, exceeded: exceeded,
    };
  }

  // 計算過程：每一行都要能被獨立驗算
  function explain(out, weightG, pmaWeeks) {
    if (!out || !out.ok) return [{ label: '無法計算', detail: '', value: (out && out.reason) || '' }];
    var kg = weightG / 1000, r = out.regimen;
    var steps = [{ label: '體重', detail: '輸入值', value: weightG + ' g = ' + fmt(kg) + ' kg' }];
    if (pmaWeeks > 0) steps.push({ label: 'PMA', detail: '出生 GA ＋ 日齡 ÷ 7', value: fmt(pmaWeeks) + ' 週' });
    steps.push({ label: 'interval', detail: out.bandLabel, value: out.interval });
    if (r.basis === 'perDay') {
      steps.push({ label: '每日總量', detail: rangeText(r.min, r.max) + ' mg/kg/day × ' + fmt(kg) + ' kg',
                   value: rangeText(out.perDay.min, out.perDay.max) + ' ' + r.unit + '/day' });
      steps.push({ label: '每劑', detail: rangeText(out.perDay.min, out.perDay.max) + ' ' + r.unit
                     + ' ÷ (24 ÷ ' + out.intervalHours + ' 小時) = ' + fmt(out.dosesPerDay) + ' 劑/日',
                   value: rangeText(out.perDose.min, out.perDose.max) + ' ' + r.unit + ' ' + out.interval, emphasis: true });
    } else {
      steps.push({ label: '每劑', detail: rangeText(r.min, r.max) + ' mg/kg/dose × ' + fmt(kg) + ' kg',
                   value: rangeText(out.perDose.min, out.perDose.max) + ' ' + r.unit
                     + (out.single ? '（單次）' : ' ' + out.interval), emphasis: true });
      if (!out.single) steps.push({ label: '每日總量',
                   detail: rangeText(out.perDose.min, out.perDose.max) + ' ' + r.unit + ' × ' + fmt(out.dosesPerDay) + ' 劑/日',
                   value: rangeText(out.perDay.min, out.perDay.max) + ' ' + r.unit + '/day（'
                     + rangeText(out.perKgPerDay.min, out.perKgPerDay.max) + ' ' + r.unit + '/kg/day）' });
    }
    return steps;
  }

  function reviewOrder(out, ordered, orderedInterval) {
    if (!out || !out.ok) return { verdict: 'na', text: '本表無可比對的建議劑量' };
    if (!(ordered > 0)) return { verdict: 'na', text: '請輸入欲覆核的每劑劑量' };
    var pd = out.perDose, res = { perDose: pd, ordered: ordered };
    if (ordered < pd.min) { res.verdict = 'low'; res.deviation = (ordered / pd.min - 1) * 100; }
    else if (ordered > pd.max) { res.verdict = 'high'; res.deviation = (ordered / pd.max - 1) * 100; }
    else { res.verdict = 'match'; res.deviation = 0; }
    if (orderedInterval && !out.single) {
      res.intervalMatch = orderedInterval.toLowerCase() === out.interval.toLowerCase();
      res.expectedInterval = out.interval;
    }
    return res;
  }

  return { intervalFor: intervalFor, compute: compute, explain: explain, reviewOrder: reviewOrder };
}));
