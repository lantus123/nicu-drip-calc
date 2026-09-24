// 各分頁共用的呈現元件。調整計算過程／指引的版面只需要改這個檔案。
(function (root) {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // 計算過程：每一行都要能被獨立驗算，故預設展開
  function stepsHtml(steps) {
    if (!steps || !steps.length) return '';
    return '<details open class="mt-4">'
      + '<summary class="text-sm font-semibold text-cyan-700 cursor-pointer select-none hover:underline">計算過程（' + steps.length + ' 步）</summary>'
      + '<div class="steps mt-2 border border-gray-200 rounded-lg overflow-hidden">'
      + steps.map(function (st, i) {
          return '<div class="flex gap-3 px-3 py-2 text-sm ' + (i % 2 ? 'bg-white' : 'bg-gray-50') + (st.emphasis ? ' font-semibold' : '') + '">'
            + '<div class="w-24 shrink-0 font-medium text-gray-500">' + esc(st.label) + '</div>'
            + '<div class="flex-1 text-gray-600">' + esc(st.detail || '') + '</div>'
            + '<div class="shrink-0 text-right text-gray-900">' + esc(st.value) + '</div>'
            + '</div>';
        }).join('')
      + '</div></details>';
  }

  // 給藥指引：僅來源文件明載的中性事實，預設收合
  // 接受 { loading, notes: [], cautions: [] }
  function guideHtml(a) {
    if (!a) return '';
    var items = []
      .concat(a.loading ? [{ t: a.loading, warn: false }] : [])
      .concat((a.notes || []).map(function (x) { return { t: x, warn: false }; }))
      .concat((a.cautions || []).map(function (x) { return { t: x, warn: true }; }));
    if (!items.length) return '';
    return '<details class="mt-3">'
      + '<summary class="text-sm font-semibold text-cyan-700 cursor-pointer select-none hover:underline">給藥指引（' + items.length + ' 項）</summary>'
      + '<div class="mt-2 space-y-1">'
      + items.map(function (it) {
          return '<div class="text-sm rounded-lg px-3 py-2 border '
            + (it.warn ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700')
            + '">' + (it.warn ? '⚠ ' : '') + esc(it.t) + '</div>';
        }).join('')
      + '</div></details>';
  }

  // 來源小表：重建該藥那一列，標出用了哪一格。
  // 刻意不重製原始表格的版面，只呈現該藥的五個數值（事實），並附出處。
  // bands: [{id, weight, age}]；values: {bandId: 原文或 null}；activeId: 目前選中的格
  function bandTableHtml(bands, values, activeId, source) {
    if (!bands || !bands.length) return '';
    // 相鄰且同體重帶者合併表頭
    var groups = [];
    bands.forEach(function (b) {
      var last = groups[groups.length - 1];
      if (last && last.weight === b.weight) last.span += 1;
      else groups.push({ weight: b.weight, span: 1 });
    });
    var th = 'border border-gray-200 px-2 py-1 text-center font-semibold text-gray-600';
    var head1 = groups.map(function (g) {
      return '<th colspan="' + g.span + '" class="' + th + ' bg-gray-100">' + esc(g.weight) + '</th>';
    }).join('');
    var head2 = bands.map(function (b) {
      return '<th class="' + th + ' bg-gray-50 font-normal">' + esc(b.age) + '</th>';
    }).join('');
    var row = bands.map(function (b) {
      var v = values[b.id];
      var on = b.id === activeId;
      return '<td class="border px-2 py-1.5 text-center whitespace-nowrap '
        + (on ? 'border-cyan-500 bg-cyan-100 font-bold text-cyan-900 ring-2 ring-inset ring-cyan-500'
              : 'border-gray-200 ' + (v == null ? 'text-gray-300' : 'text-gray-600'))
        + '">' + (v == null ? '—' : esc(v)) + '</td>';
    }).join('');
    return '<details class="mt-3">'
      + '<summary class="text-sm font-semibold text-cyan-700 cursor-pointer select-none hover:underline">來源對照（本表該藥的 ' + bands.length + ' 格，已標出用了哪一格）</summary>'
      + '<div class="mt-2 overflow-x-auto">'
      + '<table class="w-full border-collapse text-sm"><thead><tr>' + head1 + '</tr><tr>' + head2 + '</tr></thead>'
      + '<tbody><tr>' + row + '</tr></tbody></table>'
      + (source ? '<div class="mt-1 text-xs text-gray-400">' + esc(source) + '</div>' : '')
      + '</div></details>';
  }

  // 劑量範圍帶：把「差多少、離邊界多近」畫出來，而不只給一個百分比
  // min/max = 本表建議範圍；value = 醫師輸入值（可省略）
  function rangeBarHtml(min, max, value, unit) {
    if (!(max > 0)) return '';
    var hasVal = typeof value === 'number' && !isNaN(value) && value > 0;
    // 讓建議範圍與輸入值都落在畫面內，並留一點餘裕
    var top = Math.max(max, hasVal ? value : 0) * 1.25;
    var pct = function (v) { return Math.max(0, Math.min(100, v / top * 100)); };
    var left = pct(min), right = pct(max);
    var width = Math.max(right - left, 1.5);   // 單點範圍也要看得見
    var inRange = hasVal && value >= min && value <= max;

    var marker = '';
    if (hasVal) {
      var vp = pct(value);
      marker = '<div class="absolute -top-1 h-5 w-0.5 ' + (inRange ? 'bg-green-700' : 'bg-red-600')
        + '" style="left:' + vp + '%"></div>'
        + '<div class="absolute top-5 -translate-x-1/2 whitespace-nowrap text-xs font-bold '
        + (inRange ? 'text-green-800' : 'text-red-700') + '" style="left:' + vp + '%">'
        + (Math.round(value * 100) / 100) + '</div>';
    }
    var fmt = function (n) { return Math.round(n * 100) / 100; };
    return '<div class="mt-2 pb-5">'
      + '<div class="relative h-3 w-full rounded bg-gray-200">'
      +   '<div class="absolute h-3 rounded bg-green-400" style="left:' + left + '%;width:' + width + '%"></div>'
      +   marker
      + '</div>'
      + '<div class="mt-1 flex justify-between text-xs text-gray-500">'
      +   '<span>0</span>'
      +   '<span class="text-green-800">建議 ' + (min === max ? fmt(min) : fmt(min) + '~' + fmt(max)) + (unit ? ' ' + esc(unit) : '') + '</span>'
      +   '<span>' + fmt(top) + '</span>'
      + '</div></div>';
  }

  root.UiRender = { esc: esc, stepsHtml: stepsHtml, guideHtml: guideHtml,
                    bandTableHtml: bandTableHtml, rangeBarHtml: rangeBarHtml };
}(typeof self !== 'undefined' ? self : this));
