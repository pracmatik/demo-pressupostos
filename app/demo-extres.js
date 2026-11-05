/* DEMOSTRACIÓ · dues peces que a la versió real es munten a mida per a cada empresa:
   1) sortida del pressupost en BC3 (FIEBDC-3) per obrir-lo amb Presto o TCQ — versió de PROVA;
   2) carregar la base de preus a partir d'un pressupost vostre ja fet (BC3).
   Tot passa al navegador. Si alguna cosa no quadra, es diu en vermell: mai un fitxer dolent en silenci. */
(function () {
  'use strict';
  const avisa = (m, err) => { try { toast(m, !!err); } catch (_) { alert(m); } };
  const net = s => String(s == null ? '' : s).replace(/[|~\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const codiNet = s => String(s || '').trim().replace(/[|~\\#\s]/g, '');
  /* BC3 va en ANSI (Latin-1): el que no hi cap es canvia per un equivalent */
  function aLatin1(text) {
    const t = text.replace(/€/g, 'EUR').replace(/[‘’]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
    const b = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); b[i] = c < 256 ? c : 63; }
    return b;
  }
  function llegeixLatin1(file) {
    return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ko(r.error); r.readAsText(file, 'ISO-8859-1'); });
  }

  /* ── 1 · pressupost → BC3 ─────────────────────────────────────────── */
  function faBC3() {
    const arr = (typeof rows !== 'undefined' && Array.isArray(rows)) ? rows : [];
    const c = coef(), pb = pctBase(arr, c);
    const usats = new Set();
    const unic = c0 => { let k = c0 || 'X', n = 1; while (usats.has(k)) k = c0 + '_' + (n++); usats.add(k); return k; };
    const caps = []; let cur = null;
    arr.forEach((r, i) => {
      if (!r) return;
      if (r.tipo === 'cap' || (r.tipo === 'sec' && !caps.length && !arr.some(x => x && x.tipo === 'cap'))) {
        cur = { codi: unic(codiNet(r.num) || 'C' + String(caps.length + 1).padStart(2, '0')), titol: net(r.desc).slice(0, 200) || 'CAPÍTOL', parts: [] };
        caps.push(cur);
      } else if (r.tipo === 'part') {
        if (!cur) { cur = { codi: unic('00'), titol: 'PARTIDES', parts: [] }; caps.push(cur); }
        const q = +r.amid || 0;
        const tot = isNoSuma(r) ? 0 : rowTotal(arr, i, c, pb);
        const pu = q ? Math.round(tot / q * 100) / 100 : Math.round(tot * 100) / 100;
        const text = net(r.desc);
        cur.parts.push({ codi: unic(codiNet(r.num) || 'P' + String(i).padStart(4, '0')), ut: net(r.ut) || 'ut',
          resum: text.split(/ - /)[0].slice(0, 120), text, q: q || 1, pu });
      }
    });
    const titol = net((document.getElementById('h_obra') || {}).value || (CURRENT && CURRENT.obra) || 'PRESSUPOST').slice(0, 120);
    const L = ['~V|PRACMATIK DEMO|FIEBDC-3/2016|Pracmatik (demo)||ANSI||2|', '~K|\\2\\2\\3\\2\\2\\2\\2\\EUR\\|'];
    L.push('~C|OBRA##||' + titol + '||||0|');
    L.push('~D|OBRA##|' + caps.map(k => k.codi + '#\\1\\1\\').join('') + '|');
    caps.forEach(k => {
      L.push('~C|' + k.codi + '#||' + k.titol.slice(0, 120) + '||||0|');
      L.push('~D|' + k.codi + '#|' + k.parts.map(p => p.codi + '\\1\\' + p.q + '\\').join('') + '|');
      k.parts.forEach(p => {
        L.push('~C|' + p.codi + '|' + p.ut + '|' + p.resum + '|' + p.pu.toFixed(2) + '||0|');
        if (p.text) L.push('~T|' + p.codi + '|' + p.text + '|');
      });
    });
    return { text: L.join('\r\n') + '\r\n\u001a', caps: caps.length, parts: caps.reduce((s, k) => s + k.parts.length, 0),
      total: Math.round(caps.reduce((s, k) => s + k.parts.reduce((t, p) => t + p.q * p.pu, 0), 0) * 100) / 100 };
  }

  /* comprovació: el BC3 que surt es torna a llegir amb el mateix lector de l'app */
  function comprova(sortida) {
    const r = parseBC3(sortida.text);
    const parts = (r.rows || []).filter(x => x.tipo === 'part');
    const total = Math.round(parts.reduce((s, p) => s + (+p.amid || 0) * (+p.preu || 0), 0) * 100) / 100;
    return { ok: parts.length === sortida.parts && Math.abs(total - sortida.total) < 1, parts: parts.length, total };
  }

  function baixa(bytes, nom) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    a.download = nom; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function botoBC3() {
    const pdf = document.getElementById('expPdf');
    if (!pdf || document.getElementById('expBc3')) return;
    const b = document.createElement('button');
    b.className = 'btn'; b.id = 'expBc3'; b.type = 'button';
    b.title = 'Prova: fitxer BC3 (FIEBDC-3) per obrir amb Presto o TCQ. Encara no l\'hem obert amb Presto.';
    b.innerHTML = '<span>BC3 (prova)</span>';
    pdf.insertAdjacentElement('afterend', b);
    b.addEventListener('click', () => {
      try {
        const s = faBC3();
        if (!s.parts) { avisa('No hi ha cap partida per exportar.', true); return; }
        const c = comprova(s);
        if (!c.ok) { avisa('El BC3 no ha quadrat en tornar-lo a llegir (' + c.parts + ' de ' + s.parts + ' partides). No es descarrega.', true); return; }
        const nom = net((document.getElementById('h_obra') || {}).value || 'pressupost').replace(/[^\wÀ-ÿ·.-]+/g, '_').slice(0, 60) + '.bc3';
        baixa(aLatin1(s.text), nom);
        avisa('BC3 de prova descarregat: ' + s.caps + ' capítols, ' + s.parts + ' partides, comprovat en tornar-lo a llegir. Obriu-lo amb Presto i digueu-nos si entra net.');
      } catch (e) { console.error(e); avisa('No s\'ha pogut generar el BC3: ' + e.message, true); }
    });
  }

  /* ── 2 · base de preus a partir d'un pressupost vostre (BC3) ─────── */
  async function carregaPreus(file) {
    const text = await llegeixLatin1(file);
    const r = parseBC3(text);
    const parts = (r.rows || []).filter(x => x.tipo === 'part' && +x.preu > 0 && x.desc);
    if (!parts.length) { avisa('Aquest BC3 no porta preus (és un amidament): per fer la base cal un pressupost amb preus.', true); return; }
    const sb = window.DEMO_SB; let nous = 0, canviats = 0;
    for (const p of parts) {
      const codi = codiNet(p.num) || null;
      const desc = net(p.desc).slice(0, 400);
      const ja = codi ? window.DEMO_DB.precios.find(x => x.partida === codi) : null;
      if (ja) {
        if (Math.abs(+ja.precio - +p.preu) >= 0.005) { await sb.from('precios').update({ precio: +p.preu }).eq('id', ja.id); canviats++; }
      } else {
        await sb.from('precios').insert({ partida: codi || 'BC3-' + (window.DEMO_DB.precios.length + 1), descripcion: desc, descripcio_ca: desc,
          unidad: net(p.ut) || 'ut', amd: null, precio: +p.preu, notas: 'Carregat del BC3 ' + file.name, marcas_ok: [], marcas_no: [],
          activo: true, updated_at: new Date().toISOString(), flag_consulta: null });
        nous++;
      }
    }
    try { await openPreus(); } catch (_) {}
    avisa(nous + ' preus nous i ' + canviats + ' actualitzats des de «' + file.name + '». Ara, si pugeu un amidament, es buscaran també aquí.');
  }

  function botoPreus() {
    const modal = document.getElementById('preusModal');
    if (!modal || document.getElementById('demoCarregaPreus')) return;
    const llista = modal.querySelector('#prList');
    const caixa = document.createElement('div');
    caixa.id = 'demoCarregaPreus';
    caixa.style.cssText = 'margin:8px 0 12px;padding:12px 14px;border:1px dashed currentColor;border-radius:10px;font-size:13.5px;line-height:1.5';
    caixa.innerHTML = '<b>Proveu-ho amb un pressupost vostre.</b> Pugeu un BC3 amb preus (un pressupost que ja hàgiu fet) i les seves partides entren a aquesta base. Després, en pujar un amidament, es busquen aquí. No surt del vostre ordinador.' +
      '<div style="margin-top:8px"><label class="btn" style="display:inline-flex;cursor:pointer"><input type="file" accept=".bc3" style="display:none"><span>Carregar preus d\'un BC3</span></label></div>';
    (llista ? llista.parentElement.insertBefore(caixa, llista) : modal.querySelector('.modal').appendChild(caixa));
    caixa.querySelector('input').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { await carregaPreus(f); } catch (err) { console.error(err); avisa('No s\'ha pogut llegir el BC3: ' + err.message, true); }
    });
  }

  function arrenca() { botoBC3(); botoPreus(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrenca); else arrenca();
  window.DEMO_EXTRES = { faBC3, comprova };
})();
