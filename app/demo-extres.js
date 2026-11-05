/* DEMOSTRACIÓ · peces que a la versió real es munten a mida per a cada empresa:
   1) sortida del pressupost en BC3 (FIEBDC-3) per obrir-lo amb Presto o TCQ — versió de PROVA;
   2) carregar la base de preus a partir d'un pressupost vostre ja fet (BC3);
   3) avisos propis de la demo (cercador simplificat, desat al navegador), en català i castellà.
   Tot passa al navegador. Si alguna cosa no quadra, es diu en vermell: mai un fitxer dolent en silenci. */
(function () {
  'use strict';
  const T = {
    ca: {
      cinta: "<b>DEMOSTRACIÓ</b> · Dades inventades. El que hi feu es desa només en aquest navegador i els fitxers no surten del vostre ordinador.",
      cinta_err: "<b>DEMOSTRACIÓ</b> · Aquest navegador no deixa desar: si recarregueu la pàgina, es perd el que hàgiu fet.",
      guia: "Guia de la demo", reinicia: "Tornar a començar", reinicia_q: "Esborrar el que heu fet a la demo i tornar a l'inici?",
      recuperat: "S'ha recuperat el que vau fer l'últim cop en aquest navegador.",
      bc3: "BC3 (prova)", bc3_t: "Prova: fitxer BC3 (FIEBDC-3) per obrir amb Presto o TCQ.",
      bc3_buit: "No hi ha cap partida per exportar.",
      bc3_mal: (a, b) => "El BC3 no ha quadrat en tornar-lo a llegir (" + a + " de " + b + " partides). No es descarrega.",
      bc3_ok: (c, p) => "BC3 de prova descarregat: " + c + " capítols i " + p + " partides, comprovat en tornar-lo a llegir. Obriu-lo amb Presto i digueu-nos si entra net.",
      bc3_err: m => "No s'ha pogut generar el BC3: " + m,
      caixa: "<b>Proveu-ho amb un pressupost vostre.</b> Pugeu un BC3 amb preus (un pressupost que ja hàgiu fet) i les seves partides entren a aquesta base. Després, en pujar un amidament, es busquen aquí. No surt del vostre ordinador.",
      boto_preus: "Carregar preus d'un BC3",
      sense_preus: "Aquest BC3 no porta preus (és un amidament): per fer la base cal un pressupost amb preus.",
      preus_ok: (n, c, f) => n + " preus nous i " + c + " actualitzats des de «" + f + "». Ara, si pugeu un amidament, es buscaran també aquí.",
      preus_err: m => "No s'ha pogut llegir el BC3: " + m,
      cercador: "<b>Cercador simplificat de la demo.</b> Aquí els preus es busquen comparant paraules. A la versió real ho fa una IA sobre la vostra base, que entén que dues descripcions diferents són la mateixa partida. Per això, les partides a zero d'aquesta demo no mesuren l'encert real.",
      tanca: "Entesos"
    },
    es: {
      cinta: "<b>DEMOSTRACIÓN</b> · Datos inventados. Lo que hagáis se guarda solo en este navegador y los archivos no salen de vuestro ordenador.",
      cinta_err: "<b>DEMOSTRACIÓN</b> · Este navegador no deja guardar: si recargáis la página, se pierde lo que hayáis hecho.",
      guia: "Guía de la demo", reinicia: "Volver a empezar", reinicia_q: "¿Borrar lo que habéis hecho en la demo y volver al inicio?",
      recuperat: "Se ha recuperado lo que hicisteis la última vez en este navegador.",
      bc3: "BC3 (prueba)", bc3_t: "Prueba: archivo BC3 (FIEBDC-3) para abrir con Presto o TCQ.",
      bc3_buit: "No hay ninguna partida para exportar.",
      bc3_mal: (a, b) => "El BC3 no ha cuadrado al volver a leerlo (" + a + " de " + b + " partidas). No se descarga.",
      bc3_ok: (c, p) => "BC3 de prueba descargado: " + c + " capítulos y " + p + " partidas, comprobado al volver a leerlo. Abridlo con Presto y decidnos si entra limpio.",
      bc3_err: m => "No se ha podido generar el BC3: " + m,
      caixa: "<b>Probadlo con un presupuesto vuestro.</b> Subid un BC3 con precios (un presupuesto que ya hayáis hecho) y sus partidas entran en esta base. Después, al subir una medición, se buscan aquí. No sale de vuestro ordenador.",
      boto_preus: "Cargar precios de un BC3",
      sense_preus: "Este BC3 no lleva precios (es una medición): para hacer la base hace falta un presupuesto con precios.",
      preus_ok: (n, c, f) => n + " precios nuevos y " + c + " actualizados desde «" + f + "». Ahora, si subís una medición, se buscarán también aquí.",
      preus_err: m => "No se ha podido leer el BC3: " + m,
      cercador: "<b>Buscador simplificado de la demo.</b> Aquí los precios se buscan comparando palabras. En la versión real lo hace una IA sobre vuestra base, que entiende que dos descripciones distintas son la misma partida. Por eso, las partidas a cero de esta demo no miden el acierto real.",
      tanca: "Entendido"
    }
  };
  const L = () => T[(typeof IDIOMA !== 'undefined' && IDIOMA === 'es') ? 'es' : 'ca'];
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
        cur = { codi: unic(codiNet(r.num) || 'C' + String(caps.length + 1).padStart(2, '0')), titol: net(r.desc).slice(0, 200) || 'CAPITOL', parts: [] };
        caps.push(cur);
      } else if (r.tipo === 'part') {
        if (!cur) { cur = { codi: unic('00'), titol: 'PARTIDES', parts: [] }; caps.push(cur); }
        const q = Math.round((+r.amid || 0) * 1000) / 1000;
        const tot = isNoSuma(r) ? 0 : rowTotal(arr, i, c, pb);
        const pu = q ? Math.round(tot / q * 100) / 100 : Math.round(tot * 100) / 100;
        const text = net(r.desc);
        cur.parts.push({ codi: unic(codiNet(r.num) || 'P' + String(i).padStart(4, '0')), ut: net(r.ut) || 'ut',
          resum: text.split(/ - /)[0].slice(0, 120), text, q: q || 1, pu });
      }
    });
    const d = new Date(), data = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0') + String(d.getFullYear()).slice(2);
    const totCap = k => Math.round(k.parts.reduce((t, p) => t + p.q * p.pu, 0) * 100) / 100;
    const totObra = Math.round(caps.reduce((t, k) => t + totCap(k), 0) * 100) / 100;
    const titol = net((document.getElementById('h_obra') || {}).value || (CURRENT && CURRENT.obra) || 'PRESSUPOST').slice(0, 120);
    const S = ['~V|PRACMATIK DEMO|FIEBDC-3/2016\\' + data + '|Pracmatik (demo)||ANSI||2|', '~K|\\2\\2\\3\\2\\2\\2\\2\\EUR\\|'];
    S.push('~C|OBRA##||' + titol + '|' + totObra.toFixed(2) + '|' + data + '|0|');
    S.push('~D|OBRA##|' + caps.map(k => k.codi + '#\\1\\1\\').join('') + '|');
    caps.forEach((k, ci) => {
      S.push('~C|' + k.codi + '#||' + k.titol.slice(0, 120) + '|' + totCap(k).toFixed(2) + '|' + data + '|0|');
      S.push('~D|' + k.codi + '#|' + k.parts.map(p => p.codi + '\\1\\' + p.q + '\\').join('') + '|');
      k.parts.forEach((p, pi) => {
        S.push('~C|' + p.codi + '|' + p.ut + '|' + p.resum + '|' + p.pu.toFixed(2) + '|' + data + '|0|');
        if (p.text) S.push('~T|' + p.codi + '|' + p.text + '|');
        /* amidament total de la partida dins del seu capítol (alguns programes el llegeixen d'aquí) */
        S.push('~M|' + k.codi + '#\\' + p.codi + '|' + (ci + 1) + '\\' + (pi + 1) + '\\|' + p.q + '|\\\\1\\' + p.q + '\\\\\\|');
      });
    });
    return { text: S.join('\r\n') + '\r\n\u001a', caps: caps.length, parts: caps.reduce((s, k) => s + k.parts.length, 0),
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
    b.innerHTML = '<span id="expBc3T"></span>';
    pdf.insertAdjacentElement('afterend', b);
    b.addEventListener('click', () => {
      try {
        const s = faBC3();
        if (!s.parts) { avisa(L().bc3_buit, true); return; }
        const c = comprova(s);
        if (!c.ok) { avisa(L().bc3_mal(c.parts, s.parts), true); return; }
        const nom = net((document.getElementById('h_obra') || {}).value || 'pressupost').replace(/[^\wÀ-ÿ·.-]+/g, '_').slice(0, 60) + '.bc3';
        baixa(aLatin1(s.text), nom);
        avisa(L().bc3_ok(s.caps, s.parts));
      } catch (e) { console.error(e); avisa(L().bc3_err(e.message), true); }
    });
  }

  /* ── 2 · base de preus a partir d'un pressupost vostre (BC3) ─────── */
  async function carregaPreus(file) {
    const text = await llegeixLatin1(file);
    const r = parseBC3(text);
    const parts = (r.rows || []).filter(x => x.tipo === 'part' && +x.preu > 0 && x.desc);
    if (!parts.length) { avisa(L().sense_preus, true); return; }
    const sb = window.DEMO_SB; let nous = 0, canviats = 0;
    for (const p of parts) {
      const codi = codiNet(p.num) || null;
      const desc = net(p.desc).slice(0, 400);
      const ja = codi ? window.DEMO_DB.precios.find(x => x.partida === codi) : null;
      if (ja) {
        if (Math.abs(+ja.precio - +p.preu) >= 0.005) { await sb.from('precios').update({ precio: +p.preu }).eq('id', ja.id); canviats++; }
      } else {
        await sb.from('precios').insert({ partida: codi || 'BC3-' + (window.DEMO_DB.precios.length + 1), descripcion: desc, descripcio_ca: desc,
          unidad: net(p.ut) || 'ut', amd: null, precio: +p.preu, notas: 'BC3: ' + file.name, marcas_ok: [], marcas_no: [],
          activo: true, updated_at: new Date().toISOString(), flag_consulta: null });
        nous++;
      }
    }
    try { await openPreus(); } catch (_) {}
    avisa(L().preus_ok(nous, canviats, file.name));
  }

  function botoPreus() {
    const modal = document.getElementById('preusModal');
    if (!modal || document.getElementById('demoCarregaPreus')) return;
    const llista = modal.querySelector('#prList');
    const caixa = document.createElement('div');
    caixa.id = 'demoCarregaPreus';
    caixa.style.cssText = 'margin:8px 0 12px;padding:12px 14px;border:1px dashed currentColor;border-radius:10px;font-size:13.5px;line-height:1.5';
    caixa.innerHTML = '<div id="demoCarregaT"></div><div style="margin-top:8px"><label class="btn" style="display:inline-flex;cursor:pointer"><input type="file" accept=".bc3" style="display:none"><span id="demoCarregaB"></span></label></div>';
    (llista ? llista.parentElement.insertBefore(caixa, llista) : modal.querySelector('.modal').appendChild(caixa));
    caixa.querySelector('input').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { await carregaPreus(f); } catch (err) { console.error(err); avisa(L().preus_err(err.message), true); }
    });
  }

  /* ── 3 · avís del cercador simplificat (un cop per sessió, es pot tancar) ── */
  window.DEMO_AVIS_CERCADOR = function () {
    if (sessionStorage.getItem('demo_avis_cercador') || document.getElementById('demoAvisCercador')) return;
    const d = document.createElement('div');
    d.id = 'demoAvisCercador';
    d.innerHTML = '<div id="demoAvisCercadorT"></div><button type="button" class="btn" id="demoAvisCercadorB"></button>';
    document.body.appendChild(d);
    pinta();
    d.querySelector('button').addEventListener('click', () => { try { sessionStorage.setItem('demo_avis_cercador', '1'); } catch (_) {} d.remove(); });
  };

  /* ── textos segons l'idioma de la pantalla ─────────────────────────── */
  function pinta() {
    const t = L();
    const c = document.getElementById('demo-cinta-text'); if (c) c.innerHTML = window.DEMO_DESA_ERROR ? t.cinta_err : t.cinta;
    const g = document.getElementById('demo-cinta-guia'); if (g) g.textContent = t.guia;
    const r = document.getElementById('demo-cinta-reinicia'); if (r) r.textContent = t.reinicia;
    const b = document.getElementById('expBc3T'); if (b) { b.textContent = t.bc3; b.parentElement.title = t.bc3_t; }
    const k = document.getElementById('demoCarregaT'); if (k) k.innerHTML = t.caixa;
    const kb = document.getElementById('demoCarregaB'); if (kb) kb.textContent = t.boto_preus;
    const a = document.getElementById('demoAvisCercadorT'); if (a) a.innerHTML = t.cercador;
    const ab = document.getElementById('demoAvisCercadorB'); if (ab) ab.textContent = t.tanca;
  }

  function arrenca() {
    botoBC3(); botoPreus(); pinta();
    ['langCa', 'langEs'].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener('click', () => setTimeout(pinta, 0)); });
    const r = document.getElementById('demo-cinta-reinicia');
    if (r) r.addEventListener('click', e => { e.preventDefault(); if (confirm(L().reinicia_q)) window.DEMO_REINICIA(); });
    if (window.DEMO_RECUPERAT) setTimeout(() => avisa(L().recuperat), 1200);
    let errAvisat = false;
    setInterval(() => { if (window.DEMO_DESA_ERROR && !errAvisat) { errAvisat = true; pinta(); } }, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrenca); else arrenca();
  window.DEMO_EXTRES = { faBC3, comprova, pinta };
})();
