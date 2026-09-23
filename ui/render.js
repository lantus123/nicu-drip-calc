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

  root.UiRender = { esc: esc, stepsHtml: stepsHtml, guideHtml: guideHtml };
}(typeof self !== 'undefined' ? self : this));
