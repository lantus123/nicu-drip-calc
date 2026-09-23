// 抗生素劑量選格與覆核邏輯。瀏覽器與 node 共用（tests/ 直接載入這支）。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AbxLogic = factory();
}(typeof self !== "undefined" ? self : this, function () {

  // 裁決1：出生體重為主；當下體重超過出生體重後改用當下體重
  function effectiveWeight(birthG, currentG) {
    if (!(birthG > 0)) return { g: null, reason: '請輸入出生體重' };
    if (!(currentG > 0)) return { g: birthG, basis: 'birth', reason: '未輸入當下體重，採出生體重' };
    return currentG > birthG
      ? { g: currentG, basis: 'current', reason: '當下體重已超過出生體重，採當下體重' }
      : { g: birthG, basis: 'birth', reason: '當下體重未超過出生體重，採出生體重' };
  }

  // 裁決2：<1200g 且 >4 週為第四狀態（僅註1藥改 q8h，其餘拒答）
  function selectBand(weightG, postnatalDays) {
    if (!(weightG > 0)) return { error: '請輸入體重' };
    if (!(postnatalDays >= 0)) return { error: '請輸入日齡' };
    if (weightG < 1200) {
      return postnatalDays <= 28
        ? { band: 'lt1200_0_4w', label: '<1200 g ／ Age 0-4 wks' }
        : { band: 'lt1200_0_4w', label: '<1200 g ／ Age >4 wks', over4w: true };
    }
    var gt2000 = weightG > 2000, early = postnatalDays <= 7;
    return {
      band: gt2000 ? (early ? 'gt2000_le7d' : 'gt2000_gt7d') : (early ? 'w1200_2000_le7d' : 'w1200_2000_gt7d'),
      label: (gt2000 ? '>2000 g' : '1200~2000 g') + ' ／ Age ' + (early ? '0~7 days' : '>7 days'),
    };
  }

  var DOSE_RE = /^([\d.]+(?:-[\d.]+)?)\s*(萬U|U|mg)?\s*(q\d+h)?(.*)$/;

  function resolveDose(drug, sel, opts) {
    opts = opts || {};
    if (!drug) return { ok: false, reason: '請選擇藥品' };
    if (sel.error) return { ok: false, reason: sel.error };
    if (drug.freeText && !drug.doses[sel.band]) return { ok: false, reason: '此藥為原文敘述用法，不做自動計算', freeText: drug.freeText };

    var raw = drug.doses[sel.band];
    if (raw == null) return { ok: false, reason: '本表於此體重／日齡無建議劑量' };

    var isNote1 = (drug.note1Bands || []).indexOf(sel.band) !== -1;
    if (sel.over4w && !isNote1)
      return { ok: false, reason: '原表 <1200 g 僅涵蓋 Age 0-4 wks，超過 4 週無建議劑量' };

    // 裁決4：有 peak/trough 後 aminoglycoside 退場
    if (opts.hasLevels && (drug.flags || []).indexOf('aminoglycoside') !== -1)
      return { ok: false, reason: '已有 peak/trough：請依血中濃度調整 interval，本表不再適用' };

    var m = DOSE_RE.exec(raw);
    if (!m || !m[3]) return { ok: false, reason: '此格為原文敘述，不做計算', raw: raw };

    var parts = m[1].split('-');
    var interval = (sel.over4w && isNote1) ? 'q8h' : m[3];
    return {
      ok: true, raw: raw,
      min: parseFloat(parts[0]), max: parseFloat(parts[1] || parts[0]),
      unit: m[2] === '萬U' ? 'MU' : (m[2] || 'mg'),
      interval: interval,
      intervalNote: (sel.over4w && isNote1) ? ('原表 ' + m[3] + '，依註1（<1200 g 且 >4 週）改為 q8h') : null,
      trailing: (m[4] || '').trim() || null,
    };
  }

  // 每劑量 = 每公斤劑量 × 體重(kg)；範圍值保留上下限，不取中位數
  function perDose(res, weightG) {
    if (!res.ok || !(weightG > 0)) return null;
    var kg = weightG / 1000;
    return { min: res.min * kg, max: res.max * kg, unit: res.unit, interval: res.interval };
  }

  // 覆核：把醫師打算開的劑量跟本表比對
  function reviewOrder(res, weightG, ordered, orderedInterval) {
    var pd = perDose(res, weightG);
    if (!pd) return { verdict: 'n/a', text: '本表無可比對的建議劑量' };
    if (!(ordered > 0)) return { verdict: 'n/a', text: '請輸入欲覆核的每劑劑量' };
    var out = { perDose: pd, ordered: ordered };
    if (ordered < pd.min)      { out.verdict = 'low';  out.deviation = (ordered / pd.min - 1) * 100; }
    else if (ordered > pd.max) { out.verdict = 'high'; out.deviation = (ordered / pd.max - 1) * 100; }
    else                       { out.verdict = 'match'; out.deviation = 0; }
    if (orderedInterval) {
      out.intervalMatch = orderedInterval.toLowerCase() === pd.interval.toLowerCase();
      out.expectedInterval = pd.interval;
    }
    return out;
  }

  // PMA 相關提醒（不自動套用，交醫師判斷）
  function warnings(drug, pmaWeeks) {
    var w = [], f = drug && drug.flags || [];
    if (f.indexOf('pma44') !== -1 && pmaWeeks > 44)
      w.push('PMA > 44 週：註2 建議 2.5 mg/kg/dose q8h 或 q12h（sepsis / UTI），請依臨床判斷');
    if (f.indexOf('pma40') !== -1 && pmaWeeks > 40)
      w.push('PMA > 40 週：interval 改 Q6H');
    if (f.indexOf('aminoglycoside') !== -1)
      w.push('註3：後續 interval 應依 peak/trough 半衰期調整');
    if (f.indexOf('sameAsPiperacillin') !== -1)
      w.push('劑量同 Piperacillin，請改選 Piperacillin 計算');
    if (f.indexOf('star') !== -1)
      w.push('原文此藥帶 * 註記，來源文件未定義其意義');
    return w;
  }


  // 顯示用數值格式（3 位有效數字內，去掉無意義的小數）
  function fmt(n) {
    if (typeof n !== 'number' || isNaN(n)) return String(n);
    var r = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
    return String(r);
  }
  function rangeText(a, b) { return a === b ? fmt(a) : fmt(a) + '~' + fmt(b); }

  function intervalHours(interval) {
    var m = /^q(\d+)h$/i.exec(interval || '');
    return m ? parseInt(m[1], 10) : null;
  }

  // 每日總量：interval 超過 24 小時者標為平均值
  function dailyTotal(res, weightG) {
    var pd = perDose(res, weightG);
    var h = intervalHours(res && res.interval);
    if (!pd || !h) return null;
    var dosesPerDay = 24 / h, kg = weightG / 1000;
    return {
      dosesPerDay: dosesPerDay, cycleHours: h, averaged: h > 24,
      min: pd.min * dosesPerDay, max: pd.max * dosesPerDay,
      perKgMin: res.min * dosesPerDay, perKgMax: res.max * dosesPerDay,
      unit: pd.unit,
    };
  }

  // 接近分界提醒：體重或日齡再動一點就會換一格，劑量可能整個不同
  function boundaryNotes(weightG, ageDays) {
    var out = [];
    if (weightG > 0) {
      if (weightG === 1200) out.push('體重正好在 1200 g 分界上：本表 1200 g 屬「1200~2000 g」帶');
      else if (weightG === 2000) out.push('體重正好在 2000 g 分界上：本表 2000 g 屬「1200~2000 g」帶，非「>2000 g」');
      else [1200, 2000].forEach(function (b) {
        var d = Math.abs(weightG - b);
        if (d > 0 && d <= 100) out.push('體重距 ' + b + ' g 分界僅 ' + d + ' g，跨過後查表欄位會改變');
      });
    }
    if (ageDays >= 0 && weightG > 0) {
      var ab = weightG < 1200 ? 28 : 7;
      var ad = ageDays - ab;
      if (ad === 0) out.push('日齡正好在第 ' + ab + ' 天分界上：本表第 ' + ab + ' 天仍屬前一欄');
      else if (Math.abs(ad) === 1) out.push('日齡距第 ' + ab + ' 天分界僅 1 天，跨過後查表欄位會改變');
    }
    return out;
  }

  // 計算過程：每一行都要能被獨立驗算
  function explain(drug, sel, res, ew, weightG) {
    var steps = [];
    var kg = weightG / 1000;
    steps.push({ label: '有效體重', detail: ew.reason, value: weightG + ' g = ' + fmt(kg) + ' kg' });
    steps.push({ label: '查表欄位', detail: '體重帶 × 日齡帶', value: sel.label });
    if (!res.ok) {
      steps.push({ label: '結果', detail: res.raw ? '原文「' + res.raw + '」' : '', value: res.reason });
      return steps;
    }
    steps.push({ label: '本表值', detail: '原文「' + res.raw + '」', value: rangeText(res.min, res.max) + ' ' + res.unit + '/kg/dose ' + res.interval });
    if (res.intervalNote) steps.push({ label: 'interval 調整', detail: res.intervalNote, value: res.interval });
    var pd = perDose(res, weightG);
    steps.push({
      label: '每劑', detail: rangeText(res.min, res.max) + ' ' + res.unit + '/kg × ' + fmt(kg) + ' kg',
      value: rangeText(pd.min, pd.max) + ' ' + res.unit + ' ' + res.interval, emphasis: true,
    });
    var dt = dailyTotal(res, weightG);
    if (dt) {
      steps.push({
        label: dt.averaged ? '平均每日' : '每日總量',
        detail: rangeText(pd.min, pd.max) + ' ' + res.unit + ' × (24 ÷ ' + dt.cycleHours + ' 小時) = ' + fmt(dt.dosesPerDay) + ' 劑/日',
        value: rangeText(dt.min, dt.max) + ' ' + res.unit + '/day（' + rangeText(dt.perKgMin, dt.perKgMax) + ' ' + res.unit + '/kg/day）',
      });
    }
    return steps;
  }

  return { effectiveWeight: effectiveWeight, selectBand: selectBand, resolveDose: resolveDose,
           perDose: perDose, reviewOrder: reviewOrder, warnings: warnings,
           dailyTotal: dailyTotal, explain: explain, intervalHours: intervalHours,
           boundaryNotes: boundaryNotes };
}));
