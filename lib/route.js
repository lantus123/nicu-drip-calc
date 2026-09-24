// 給藥途徑：把來源的自由文字解析成可判讀的途徑，並處理合併儲存格的繼承。
// 口服與針劑必須一眼分得出來，因此途徑以標記呈現而非小灰字。
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RouteInfo = factory();
}(typeof self !== "undefined" ? self : this, function () {

  var KNOWN = [
    { key: 'IV', re: /\bIVD?\b/i, kind: 'injection', label: 'IV' },
    { key: 'IM', re: /\bIM\b/i, kind: 'injection', label: 'IM' },
    { key: 'PO', re: /\bPO\b/i, kind: 'oral', label: 'PO' },
    { key: 'ETT', re: /\bETT\b/i, kind: 'ett', label: 'ETT' }
  ];

  // 「IVD / >30 min」→ 途徑 IV，另附輸注說明
  function parse(str) {
    var routes = [], note = null;
    if (str) {
      KNOWN.forEach(function (k) { if (k.re.test(str)) routes.push(k); });
      var m = String(str).replace(/\b(IVD?|IM|PO|ETT)\b/gi, '').replace(/^[\s,、／/·()（）]+|[\s,、／/·()（）]+$/g, '').trim();
      if (m) note = m;
    }
    return { routes: routes, note: note, raw: str || null };
  }

  // 原表的 Route 欄常為合併儲存格（meningitis 變體、Pip/tazo 等），
  // 同藥名的其他列若有途徑就繼承過來，不讓畫面空白。
  function resolve(item, siblings) {
    var own = parse(item.route);
    if (own.routes.length) return own;
    var found = null;
    (siblings || []).forEach(function (s) {
      if (found) return;
      var p = parse(s.route);
      if (p.routes.length) found = p;
    });
    if (!found) return own;
    return { routes: found.routes, note: found.note, raw: found.raw, inherited: true };
  }

  function hasOral(info) { return info.routes.some(function (r) { return r.kind === 'oral'; }); }
  function hasInjection(info) { return info.routes.some(function (r) { return r.kind === 'injection'; }); }
  function onlyOral(info) { return info.routes.length > 0 && info.routes.every(function (r) { return r.kind === 'oral'; }); }
  function onlyIM(info) { return info.routes.length === 1 && info.routes[0].key === 'IM'; }

  return { parse: parse, resolve: resolve, hasOral: hasOral, hasInjection: hasInjection,
           onlyOral: onlyOral, onlyIM: onlyIM };
}));
