// Fluconazole 劑量計算與覆核。瀏覽器與測試共用。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FluLogic = factory();
}(typeof self !== "undefined" ? self : this, function () {

  function intervalFor(D, gaWeeks, pnaDays) {
    if (!(gaWeeks > 0)) return { error: '請輸入出生 GA（週）' };
    if (!(pnaDays >= 0)) return { error: '請輸入日齡（天）' };
    for (var i = 0; i < D.treatment.intervalRules.length; i++) {
      var r = D.treatment.intervalRules[i];
      if (gaWeeks < r.gaMax && pnaDays <= r.pnaMax) return { interval: r.interval, label: r.label };
    }
    return { error: '無法判定 interval' };
  }

  // 腎功能調整：CCr < 50 給 50%
  function renalFactor(D, ccr) {
    return (ccr > 0 && ccr < D.renal.ccrThreshold)
      ? { factor: D.renal.factor, note: D.renal.note }
      : { factor: 1, note: null };
  }

  function scale(spec, weightG, factor, roundUp) {
    var kg = weightG / 1000;
    var lo = spec.min * kg * factor, hi = spec.max * kg * factor;
    var out = { min: lo, max: hi, unit: spec.unit || 'mg' };
    if (roundUp) { out.rounded = { min: Math.ceil(lo), max: Math.ceil(hi) }; }
    return out;
  }

  // 輸注：容積、最短輸注時間（同時受「至少 2 小時」與「最高 200 mg/hr」限制）
  function infusion(D, doseMg) {
    if (!(doseMg > 0)) return null;
    var a = D.administration;
    var byRate = doseMg / a.maxRateMgPerHour;
    return {
      volumeMl: doseMg / a.maxConcentration,
      minHours: Math.max(a.ivMinHours, byRate),
      limitedBy: byRate > a.ivMinHours ? '最高輸注速率 ' + a.maxRateMgPerHour + ' mg/hr' : '最短輸注時間 ' + a.ivMinHours + ' 小時',
    };
  }

  function computeTreatment(D, weightG, gaWeeks, pnaDays, ccr) {
    if (!(weightG > 0)) return { ok: false, reason: '請輸入體重' };
    var iv = intervalFor(D, gaWeeks, pnaDays);
    if (iv.error) return { ok: false, reason: iv.error };
    var rf = renalFactor(D, ccr);
    var loading = scale(D.treatment.loading, weightG, rf.factor);
    var maint = scale(D.treatment.maintenance, weightG, rf.factor);
    return {
      ok: true, mode: 'treatment', interval: iv.interval, bandLabel: iv.label,
      rows: [
        { label: 'Loading', perKg: D.treatment.loading, amount: loading, infusion: infusion(D, loading.max) },
        { label: 'Maintenance', perKg: D.treatment.maintenance, amount: maint, interval: iv.interval, infusion: infusion(D, maint.max) }
      ],
      renalNote: rf.note, gaWordingNote: D.treatment.gaWordingNote,
    };
  }

  function computeProphylaxis(D, weightG, ccr) {
    if (!(weightG > 0)) return { ok: false, reason: '請輸入體重' };
    var rf = renalFactor(D, ccr);
    var p = D.prophylaxis;
    var amt = scale(p.dose, weightG, rf.factor, p.roundUpToInteger);
    return {
      ok: true, mode: 'prophylaxis', frequency: p.frequency, infusionMinutes: p.infusionMinutes,
      rows: [{ label: '預防劑量', perKg: p.dose, amount: amt, interval: p.frequency }],
      roundUpBasis: p.roundUpToInteger ? p.roundUpBasis : null, renalNote: rf.note,
    };
  }

  function computeIndication(D, weightG, indicationId, ccr) {
    if (!(weightG > 0)) return { ok: false, reason: '請輸入體重' };
    var ind = D.indications.filter(function (x) { return x.id === indicationId; })[0];
    if (!ind) return { ok: false, reason: '請選擇適應症' };
    var rf = renalFactor(D, ccr);
    var rows = [{ label: 'Day 1', perKg: ind.day1, amount: scale(ind.day1, weightG, rf.factor), infusion: infusion(D, ind.day1.max * weightG / 1000 * rf.factor) }];
    if (ind.daily) rows.push({ label: 'Daily therapy', perKg: ind.daily, amount: scale(ind.daily, weightG, rf.factor), note: ind.dailyNote || null, interval: 'QD' });
    return {
      ok: true, mode: 'indication', indication: ind, rows: rows,
      duration: ind.duration, incomplete: !!ind.incomplete, spanned: !!ind.spanned, renalNote: rf.note,
    };
  }

  function reviewOrder(row, ordered) {
    if (!row) return { verdict: 'n/a', text: '請先查劑量' };
    if (!(ordered > 0)) return { verdict: 'n/a', text: '請輸入欲覆核的每劑劑量' };
    var a = row.amount, out = { row: row, ordered: ordered };
    if (ordered < a.min) { out.verdict = 'low'; out.deviation = (ordered / a.min - 1) * 100; }
    else if (ordered > a.max) { out.verdict = 'high'; out.deviation = (ordered / a.max - 1) * 100; }
    else { out.verdict = 'match'; out.deviation = 0; }
    return out;
  }

  return { intervalFor: intervalFor, renalFactor: renalFactor, infusion: infusion,
           computeTreatment: computeTreatment, computeProphylaxis: computeProphylaxis,
           computeIndication: computeIndication, reviewOrder: reviewOrder };
}));
