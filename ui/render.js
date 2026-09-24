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
      + '<summary class="text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:underline">計算過程（' + steps.length + ' 步）</summary>'
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
      + '<summary class="text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:underline">給藥指引（' + items.length + ' 項）</summary>'
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
      + '<summary class="text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:underline">來源對照（本表該藥的 ' + bands.length + ' 格，已標出用了哪一格）</summary>'
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

  // 完整劑量表：以本表數值自行渲染，把目前選中的藥與格子標出來。
  // 版面為本工具自訂，非重製來源文件的排版。
  // active: { 藥品id: 使用中的 bandId }
  function fullTableHtml(data, active, openByDefault) {
    active = active || {};
    var bands = data.bands;
    var groups = [];
    bands.forEach(function (b) {
      var last = groups[groups.length - 1];
      if (last && last.weight === b.weight) last.span += 1;
      else groups.push({ weight: b.weight, span: 1 });
    });
    var th = 'border border-gray-200 px-2 py-1 text-center text-xs font-semibold text-gray-600 bg-gray-100';
    var stick = 'tbl-sticky border border-gray-200 px-2 py-1 text-left text-xs font-semibold text-gray-600 bg-gray-100';
    var head = '<thead><tr><th rowspan="2" class="' + stick + '">藥品</th>'
      + groups.map(function (g) { return '<th colspan="' + g.span + '" class="' + th + '">' + esc(g.weight) + '</th>'; }).join('')
      + '</tr><tr>'
      + bands.map(function (b) { return '<th class="' + th + ' font-normal">' + esc(b.age) + '</th>'; }).join('')
      + '</tr></thead>';

    var body = data.drugs.map(function (d) {
      var activeBand = active[d.id];
      var on = activeBand !== undefined;
      var rinfo = root.RouteInfo ? root.RouteInfo.resolve(d, data.drugs.filter(function (x) { return x.name === d.name; })) : null;
      var label = esc(d.name)
        + (d.indication || d.regimen ? ' <span class="text-gray-400">(' + esc(d.indication || d.regimen) + ')</span>' : '')
        + (rinfo && rinfo.routes.length ? '<div class="mt-1">' + routeBadgesHtml(rinfo, { hideNote: true }) + '</div>' : '');
      var cells;
      if (d.freeText && !d.doses[bands[0].id]) {
        cells = '<td colspan="' + bands.length + '" class="border border-gray-200 px-2 py-1 text-xs text-gray-500">' + esc(d.freeText) + '</td>';
      } else {
        cells = bands.map(function (b) {
          var v = d.doses[b.id];
          var hit = b.id === activeBand;
          return '<td class="border px-2 py-1 text-center text-xs whitespace-nowrap '
            + (hit ? 'border-cyan-500 bg-cyan-100 font-bold text-cyan-900 ring-2 ring-inset ring-cyan-500'
                   : 'border-gray-200 ' + (v == null ? 'text-gray-300' : (on ? 'text-gray-700' : 'text-gray-400')))
            + '">' + (v == null ? '—' : esc(v)) + '</td>';
        }).join('');
      }
      return '<tr class="' + (on ? 'bg-cyan-50/60' : '') + '">'
        + '<td class="tbl-sticky border border-gray-200 px-2 py-1 text-sm '
        + (on ? 'bg-cyan-50 font-bold text-gray-900' : 'bg-white text-gray-500') + '">' + label + '</td>'
        + cells + '</tr>';
    }).join('');

    var n = Object.keys(active).length;
    return '<details class="mt-4"' + (openByDefault ? ' open' : '') + '>'
      + '<summary class="text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:underline">'
      + '完整劑量表（' + data.drugs.length + ' 列'
      + (n ? '，已標出選用的 ' + n + ' 格' : '') + '）</summary>'
      + '<div class="mt-2 overflow-x-auto rounded-lg border border-gray-200">'
      + '<table class="w-full border-collapse">' + head + '<tbody>' + body + '</tbody></table></div>'
      + '<div class="mt-1 text-xs text-gray-400">' + esc(data.source) + '</div>'
      + '</details>';
  }

  // 給藥途徑標記：口服與針劑必須一眼分得出來，且單一途徑要標明「僅」。
  // 顏色刻意與「答案」（cyan）和「警示」（紅／琥珀）錯開，口服用綠系。
  function routeBadgesHtml(info, opts) {
    opts = opts || {};
    if (!info || !info.routes.length) return '';
    var only = info.routes.length === 1;
    var badges = info.routes.map(function (r) {
      var oral = r.kind === 'oral';
      var cls = oral
        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
        : (r.kind === 'ett' ? 'border-violet-300 bg-violet-50 text-violet-800'
                            : 'border-slate-300 bg-slate-100 text-slate-700');
      var prefix = oral ? '口服 ' : (r.kind === 'ett' ? '' : '針劑 ');
      var restrict = only && (oral || r.key === 'IM') ? '僅' : '';
      return '<span class="inline-block rounded border px-2 py-0.5 text-xs font-semibold ' + cls + '">'
        + restrict + prefix + esc(r.label) + '</span>';
    }).join(' ');
    var note = info.note && !opts.hideNote
      ? ' <span class="text-xs text-gray-500">' + esc(info.note) + '</span>' : '';
    var inh = info.inherited && !opts.hideNote
      ? ' <span class="text-xs text-gray-400">（原表此列 Route 為合併儲存格，沿用同藥）</span>' : '';
    return '<span class="inline-flex flex-wrap items-center gap-1 align-middle">' + badges + note + inh + '</span>';
  }

  root.UiRender = { esc: esc, stepsHtml: stepsHtml, guideHtml: guideHtml,
                    bandTableHtml: bandTableHtml, rangeBarHtml: rangeBarHtml,
                    fullTableHtml: fullTableHtml, routeBadgesHtml: routeBadgesHtml };
}(typeof self !== 'undefined' ? self : this));
