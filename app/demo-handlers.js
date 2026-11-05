/* DEMOSTRACIÓ · el que a la versió real fan els automatismes amb IA, aquí ho fa el navegador.
   - Lectura d'amidaments: el BC3 i l'Excel ja els llegeix l'app sense IA. Per a un PDF o un Word
     que necessitaria la IA, la demo carrega l'amidament d'exemple i ho diu.
   - Cercador de preus: a la versió real és un cercador amb IA sobre la vostra base de preus.
     Aquí és un cercador simple de paraules sobre la base de preus inventada de la demo. */
(function () {
  'use strict';
  const SEED = window.DEMO_SEED || {};
  const BUIDES = new Set('de del dels la el els les l d i a al als amb en per per a o un una y con para los las lo e se sin sense segons segun según inclòs incluido inclosa incluida'.split(' '));
  const net = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[·']/g, ' ');
  const paraules = s => new Set(net(s).split(/[^a-z0-9+,x]+/).map(w => w.replace(/^,|,$/g, '')).filter(w => w && !BUIDES.has(w) && (w.length > 2 || /\d/.test(w))));
  const unitat = u => {
    const x = String(u || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
    if (['u', 'ud', 'ut', 'un', 'uds', 'uts'].includes(x)) return 'ut';
    if (x === 'm' || x === 'ml') return 'ml';
    return x;
  };
  const arrel = w => (/\d/.test(w) ? w : w.slice(0, 6));
  function semblanca(a, b) {
    const A = [...a].map(arrel), B = new Set([...b].map(arrel));
    if (!A.length || !B.size) return 0;
    const comuns = A.filter(w => B.has(w)).length;
    return (2 * comuns) / (A.length + B.size);
  }
  const PREUS = ((SEED.taules || {}).precios || []).map(p => ({ p, ca: paraules(p.descripcio_ca), es: paraules(p.descripcion), ut: unitat(p.unidad) }));

  function cerca(partida) {
    const P = paraules(partida.desc), ut = unitat(partida.ut);
    let millor = null, nota = 0;
    PREUS.forEach(x => {
      if (x.ut !== ut) return;
      const s = Math.max(semblanca(P, x.ca), semblanca(P, x.es));
      if (s > nota) { nota = s; millor = x.p; }
    });
    if (millor && nota >= 0.5) return { i: partida.i, estado: 'segur', preu: millor.precio, font: millor.partida + ' - ' + millor.descripcio_ca, cid: millor.id };
    if (millor && nota >= 0.34) return { i: partida.i, estado: 'dubte', preu: millor.precio, font: millor.partida + ' - ' + millor.descripcio_ca, cid: millor.id };
    return { i: partida.i, estado: 'sense_preu', preu: null, font: 'Cap partida semblant a la base de preus de la demo', cid: null };
  }

  const AVIS_LECTURA = 'DEMOSTRACIÓ · Aquest document s\'hauria de llegir amb la IA, que a la demo està apagada. Es mostra l\'amidament d\'exemple. Els BC3 (Presto, TCQ…) i els Excel amb columnes de codi, descripció, unitat i quantitat sí que es llegeixen de veritat.';
  window.DEMO_HANDLERS = {
    'casador': cos => ({ results: (cos.partides || []).map(cerca) }),
    'ingesta': cos => {
      const marques = cos || {};
      if (marques.excel_transcrit) return { rows: [], avisos: [], resum: '' };
      return { rows: JSON.parse(JSON.stringify((SEED.exemple || {}).rows || [])), avisos: [AVIS_LECTURA], resum: 'Amidament d\'exemple (demostració)' };
    }
  };
})();
