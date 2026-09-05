// Riftvesting — ALT extractor
// Run on an alt.xyz/itm/<id>/research page (logged in), via Claude in Chrome or the DevTools console.
// Reads header + pops, opens "View all" market transactions, expands the list, and stores the result in
// window.__rv (JSON). Use window.__rvPage(a, b) to page rows out in small chunks.
// Set window.__rvMaxRows = 60 before running for a daily check (only the newest rows are needed).
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const leaf = re => [...document.querySelectorAll('button,a,div,span,p')].find(e => e.children.length === 0 && re.test(e.textContent.trim()));
  const fire = el => ['mousedown', 'mouseup', 'click'].forEach(n => el.dispatchEvent(new MouseEvent(n, { bubbles: true, cancelable: true, view: window })));
  const num = s => +String(s).replace(/[$,]/g, '');
  const dateRe = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}\b/;
  const iso = s => { const d = new Date(s); return isNaN(d) ? s : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }; // local date, not UTC
  const typeMap = { 'Auction': 'auction', 'Buy now': 'buy_now', 'Best offer': 'best_offer' };
  const srcMap = { 'eBay': 'ebay', 'Alt': 'alt' };

  // --- header + pops (from page text) ---
  const main = document.body.innerText;
  const title = (main.split('\n').find(l => /^\d{4} .+#\S+/.test(l.trim())) || document.title.replace(/ \| Alt$/, '')).trim(); // page title updates late; header line is reliable
  const grade = (main.match(/\n(PSA|BGS|CGC|SGC|TAG)\n([\d.]+|BL)\nPOP\n/) || []).slice(1, 3).join(' ');
  const av = (main.match(/LT VALUE\n\$([\d,]+)\n\$([\d,]+) - \$([\d,]+)/) || []).slice(1).map(num);
  const pops = {};
  for (const m of main.matchAll(/(PSA|BGS|CGC|SGC|TAG) POPULATION\n([\s\S]*?)(?=\n[A-Z]+ POPULATION|\nRECENT TRANSACTIONS)/g)) {
    const t = m[2].trim().split('\n'); pops[m[1]] = {};
    for (let i = 0; i + 1 < t.length; i += 2) pops[m[1]][t[i]] = +t[i + 1];
  }

  // --- open the Market transactions panel and expand it ---
  const va = leaf(/^view all$/i); if (!va) throw new Error('View all not found');
  fire(va.closest('button,a,[role=button]') || va); await sleep(1500);
  const panelRows = () => {
    const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Market transactions');
    if (!h) return [];
    let p = h; while (p && !/\$[\d,]+/.test(p.innerText || '')) p = p.parentElement;
    const priceEls = [...p.querySelectorAll('*')].filter(e => e.children.length === 0 && /^\$[\d,]+$/.test(e.textContent.trim()));
    return priceEls.map(pe => {
      let r = pe; while (r && r !== p && !dateRe.test(r.innerText)) r = r.parentElement;
      const t = r.innerText.split('\n').map(s => s.trim()).filter(Boolean);
      const ic = r.querySelector('img,svg');
      const src = ic ? (ic.getAttribute('alt') || ic.getAttribute('aria-label') || '') : '';
      return {
        date: iso(t.find(x => dateRe.test(x)) || ''),
        price: num(t.find(x => x.startsWith('$')) || 0),
        type: typeMap[t.find(x => typeMap[x])] || (t.find(x => !dateRe.test(x) && !x.startsWith('$') && !/unpaid/i.test(x)) || '').toLowerCase(),
        source: srcMap[src] || src.toLowerCase().replace(/ fixed price$/, '') || 'unknown',
        via: 'alt',
        unpaid: t.some(x => /unpaid/i.test(x)),
      };
    });
  };
  const maxRows = window.__rvMaxRows || Infinity;
  for (let i = 0; i < 80; i++) {
    if (panelRows().length >= maxRows) break;
    const btn = [...document.querySelectorAll('button')].find(b => /show more/i.test(b.textContent));
    if (!btn) break; btn.click(); await sleep(1200);
  }
  const rows = panelRows().slice(0, maxRows);
  window.__rv = { url: location.href, alt_item_id: (location.pathname.match(/\/itm\/([^/]+)/) || [])[1], title, grade,
    alt_value: av.length ? { value: av[0], low: av[1], high: av[2] } : null, pops, checked: iso(new Date()), rows };
  window.__rvPage = (a, b) => JSON.stringify(window.__rv.rows.slice(a, b).map(r => [r.date, r.price, r.type, r.source, r.unpaid ? 'U' : ''].join('|')));
  return JSON.stringify({ title, grade, alt_value: window.__rv.alt_value, pops, rows: rows.length, newest: rows[0], oldest: rows[rows.length - 1] });
})();
