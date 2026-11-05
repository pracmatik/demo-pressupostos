/* ══════════════════════════════════════════════════════════════════════
   DEMOSTRACIÓ · base de dades en memòria, sense servidor
   Substitueix la connexió real. Tot el que es veu és inventat i viu només
   al navegador de qui obre la pàgina. El que hi feu es desa en aquest mateix
   navegador (no surt de l'ordinador) i es pot reiniciar quan vulgueu.
   No hi ha cap adreça ni cap clau de cap servidor.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const SEED = window.DEMO_SEED || {};
  const CLAU = 'pracmatik_demo_pressupostos_' + (SEED.versio || '1');
  let guardat = null;
  try { guardat = JSON.parse(localStorage.getItem(CLAU) || 'null'); } catch (_) { guardat = null; }
  const DB = {};
  const origen = guardat && typeof guardat === 'object' && guardat.precios ? guardat : SEED.taules || {};
  Object.keys(origen).forEach(t => { DB[t] = JSON.parse(JSON.stringify(origen[t])); });
  window.DEMO_DB = DB;
  window.DEMO_RECUPERAT = !!(guardat && guardat.precios);

  /* es desa cada canvi al navegador; si no es pot (navegació privada, espai), es diu */
  let _t = null;
  function desa() {
    clearTimeout(_t);
    _t = setTimeout(() => {
      try { localStorage.setItem(CLAU, JSON.stringify(DB)); window.DEMO_DESA_ERROR = null; }
      catch (e) { window.DEMO_DESA_ERROR = e && e.name || 'error'; console.warn('[demo] no s\'ha pogut desar al navegador:', e); }
    }, 250);
  }
  window.DEMO_REINICIA = function () { try { localStorage.removeItem(CLAU); } catch (_) {} location.reload(); };

  const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@constructora.demo',
    app_metadata: { role: 'admin' }, user_metadata: { nombre: 'Usuari demo' } };
  const SESSION = { access_token: 'demo', refresh_token: 'demo', user: USER, expires_at: 4102444800 };

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'd' + Date.now().toString(16) + Math.random().toString(16).slice(2));
  const ara = () => new Date().toISOString();
  const taula = t => (DB[t] = DB[t] || []);
  const norm = v => (v == null ? '' : String(v));

  /* ── comparacions de filtres ─────────────────────────────────────── */
  function compara(op, a, b) {
    switch (op) {
      case 'eq': return a === b || norm(a) === norm(b);
      case 'neq': return !(a === b || norm(a) === norm(b));
      case 'gt': return a > b; case 'gte': return a >= b;
      case 'lt': return a < b; case 'lte': return a <= b;
      case 'in': return (Array.isArray(b) ? b : String(b).replace(/^\(|\)$/g, '').split(',')).map(norm).includes(norm(a));
      case 'is': return b === null || b === 'null' ? a == null : a === (b === 'true' ? true : b === 'false' ? false : b);
      case 'like': case 'ilike': {
        const re = new RegExp('^' + norm(b).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/\*/g, '.*') + '$', op === 'ilike' ? 'i' : '');
        return re.test(norm(a));
      }
      case 'contains':
        if (Array.isArray(a)) return [].concat(b).every(x => a.includes(x));
        if (a && typeof a === 'object') return Object.keys(b || {}).every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));
        return false;
      default: throw new Error('[demo] filtre no implementat: ' + op);
    }
  }
  function valor(fila, col) {
    if (col.includes('->')) { const p = col.split(/->>?/); let v = fila[p[0]]; for (let i = 1; i < p.length; i++) v = v == null ? v : v[p[i].replace(/'/g, '')]; return v; }
    return fila[col];
  }
  function projecta(fila, cols) {
    if (!cols || cols === '*' || /\*/.test(cols)) return Object.assign({}, fila);
    const o = {};
    cols.split(',').map(c => c.trim()).filter(Boolean).forEach(c => {
      const alias = c.split(':'); const nom = alias.length > 1 ? alias[1].trim() : c; const clau = alias[0].trim();
      if (/\(/.test(nom)) return;
      o[clau] = fila[nom.split('::')[0]];
    });
    return o;
  }

  /* ── constructor de consultes, amb la mateixa forma que el client real ── */
  function Consulta(t) {
    this.t = t; this.op = 'select'; this.filtres = []; this.ordres = []; this.lim = null; this.rang = null;
    this.cols = '*'; this.un = null; this.payload = null; this.opts = {}; this.retorna = false;
  }
  const P = Consulta.prototype;
  P.select = function (cols, opts) { if (this.op === 'select') { this.cols = cols || '*'; this.opts = opts || {}; } else { this.retorna = true; this.cols = cols || '*'; } return this; };
  ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains'].forEach(op => {
    P[op] = function (col, v) { this.filtres.push(f => compara(op, valor(f, col), v)); return this; };
  });
  P.not = function (col, op, v) { this.filtres.push(f => !compara(op, valor(f, col), v)); return this; };
  P.filter = function (col, op, v) { this.filtres.push(f => compara(op, valor(f, col), v)); return this; };
  P.match = function (obj) { Object.keys(obj || {}).forEach(k => this.eq(k, obj[k])); return this; };
  P.or = function (expr) {
    const parts = String(expr).split(/,(?![^(]*\))/).map(p => { const [c, o, ...r] = p.split('.'); return { c, o, v: r.join('.') }; });
    this.filtres.push(f => parts.some(p => compara(p.o, valor(f, p.c), p.v.replace(/^\(|\)$/g, ''))));
    return this;
  };
  P.order = function (col, o) { this.ordres.push({ col, asc: !o || o.ascending !== false }); return this; };
  P.limit = function (n) { this.lim = n; return this; };
  P.range = function (a, b) { this.rang = [a, b]; return this; };
  P.single = function () { this.un = 'single'; return this; };
  P.maybeSingle = function () { this.un = 'maybe'; return this; };
  P.insert = function (rows) { this.op = 'insert'; this.payload = rows; return this; };
  P.upsert = function (rows, opts) { this.op = 'upsert'; this.payload = rows; this.opts = opts || {}; return this; };
  P.update = function (obj) { this.op = 'update'; this.payload = obj; return this; };
  P.delete = function () { this.op = 'delete'; return this; };
  P.abortSignal = function () { return this; };
  P.then = function (ok, ko) { let r; try { r = this._executa(); } catch (e) { console.error(e); r = { data: null, error: { message: e.message } }; } return Promise.resolve(r).then(ok, ko); };
  P.catch = function (ko) { return this.then(x => x, ko); };

  P._files = function () { return taula(this.t).filter(f => this.filtres.every(fn => fn(f))); };
  P._executa = function () {
    const T = taula(this.t);
    let files;
    if (this.op === 'select') files = this._files();
    else if (this.op === 'insert' || this.op === 'upsert') {
      const rows = [].concat(this.payload).map(r => Object.assign({}, r));
      const clau = this.op === 'upsert' ? (this.opts.onConflict || (rows[0] && 'id' in rows[0] ? 'id' : Object.keys(rows[0] || {})[0])) : null;
      files = rows.map(r => {
        if (clau) {
          const claus = clau.split(',').map(s => s.trim());
          const ex = T.find(f => claus.every(k => norm(f[k]) === norm(r[k])));
          if (ex) { Object.assign(ex, r); return ex; }
        }
        const nova = Object.assign({ id: r.id || (typeof (T[0] || {}).id === 'number' ? T.reduce((m, f) => Math.max(m, +f.id || 0), 0) + 1 : uuid()),
          created_at: ara(), creado_at: ara() }, r);
        T.push(nova); return nova;
      });
    } else if (this.op === 'update') {
      files = this._files();
      files.forEach(f => {
        /* a la base real, cada canvi de preu el registra la mateixa base de dades: aquí es fa igual */
        if (this.t === 'precios' && 'precio' in this.payload && +f.precio !== +this.payload.precio) {
          const H = taula('precios_historial');
          H.push({ id: H.reduce((m, h) => Math.max(m, +h.id || 0), 0) + 1, precio_id: f.id, partida: f.partida, descripcion: f.descripcion,
            precio_antes: +f.precio, precio_despues: +this.payload.precio, usuario_id: USER.id, usuario_nombre: 'Usuari demo', ts: ara() });
        }
        Object.assign(f, this.payload, { actualizado_at: ara(), updated_at: ara() });
      });
    }
    else if (this.op === 'delete') { files = this._files(); DB[this.t] = T.filter(f => !files.includes(f)); }
    if (this.op !== 'select') desa();
    files = files.slice();
    this.ordres.slice().reverse().forEach(o => files.sort((a, b) => { const x = valor(a, o.col), y = valor(b, o.col); if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * (o.asc ? 1 : -1); }));
    const total = files.length;
    if (this.rang) files = files.slice(this.rang[0], this.rang[1] + 1);
    if (this.lim != null) files = files.slice(0, this.lim);
    if (this.op !== 'select' && !this.retorna) return { data: null, error: null, count: total };
    let data = files.map(f => projecta(f, this.cols));
    if (this.opts && this.opts.head) data = null;
    if (this.un === 'single') { if (data.length !== 1) return { data: null, error: { message: 'demo: ' + data.length + ' files', code: 'PGRST116' } }; data = data[0]; }
    if (this.un === 'maybe') data = data[0] || null;
    return { data: data, error: null, count: total };
  };

  /* ── canal de presència (qui més té obert el pressupost): a la demo, ningú ── */
  function Canal() { this.cb = []; }
  Canal.prototype.on = function () { return this; };
  Canal.prototype.subscribe = function (fn) { if (fn) setTimeout(() => fn('SUBSCRIBED'), 0); return this; };
  Canal.prototype.track = function () { return Promise.resolve('ok'); };
  Canal.prototype.untrack = function () { return Promise.resolve('ok'); };
  Canal.prototype.presenceState = function () { return {}; };
  Canal.prototype.unsubscribe = function () { return Promise.resolve('ok'); };

  const RPC = {
    ind_coeficient: () => 1,
    activitat_batec: () => null,
    activitat_connexions: () => []
  };

  window.DEMO_SB = {
    from: t => new Consulta(t),
    rpc: (nom, args) => {
      if (!(nom in RPC)) return Promise.resolve({ data: null, error: { message: 'demo: funció no disponible (' + nom + ')' } });
      return Promise.resolve({ data: RPC[nom](args), error: null });
    },
    channel: () => new Canal(),
    removeChannel: () => Promise.resolve('ok'),
    auth: {
      getSession: async () => ({ data: { session: SESSION }, error: null }),
      getUser: async () => ({ data: { user: USER }, error: null }),
      refreshSession: async () => ({ data: { session: SESSION }, error: null }),
      signInWithPassword: async () => ({ data: { session: SESSION, user: USER }, error: null }),
      signOut: async () => { location.reload(); return { error: null }; },
      updateUser: async () => ({ data: {}, error: { message: 'Desactivat a la demostració.' } }),
      resetPasswordForEmail: async () => ({ data: {}, error: { message: 'Desactivat a la demostració.' } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };

  /* ── les crides als automatismes: aquí no surten enlloc ──────────── */
  const resposta = (cos, status) => ({ ok: (status || 200) < 400, status: status || 200, json: async () => cos, text: async () => JSON.stringify(cos), clone() { return this; } });
  window.DEMO_WEBHOOK = async function (url, cos) {
    await new Promise(r => setTimeout(r, 450));
    const nom = String(url).replace('demo://', '');
    const H = window.DEMO_HANDLERS || {};
    if (H[nom]) return resposta(await H[nom](cos || {}));
    return resposta({ error: 'demo', detail: 'Aquesta funció no està activa a la demostració.' }, 503);
  };

  /* ── xarxa: res surt cap a cap servidor que no sigui de llibreries públiques ── */
  const PERMESOS = /^(https:\/\/(cdn\.jsdelivr\.net|cdn\.sheetjs\.com|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\/|data:|blob:)/;
  const fetchReal = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('demo://') === 0) return window.DEMO_WEBHOOK(url, init && init.body ? JSON.parse(init.body) : {});
    if (/\/(rest|functions|auth|storage)\/v1\//.test(url)) return Promise.resolve(resposta({}, 200));
    const absoluta = new URL(url, location.href);
    if (absoluta.origin === location.origin || PERMESOS.test(absoluta.href)) return fetchReal(input, init);
    console.warn('[demo] bloquejada una connexió a', absoluta.host);
    return Promise.reject(new Error('Connexió desactivada a la demostració'));
  };
})();
