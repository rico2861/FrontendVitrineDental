// ═══ DENTAL — Vitrine (logique) ═══════════════════════════════════════
// Parcours : créer un compte (mot de passe) → choisir un plan → payer →
// licence générée APRÈS paiement. La vitrine ne parle jamais à la base :
// tout passe par le backend (API). Le jeton de session reste en localStorage.
const API = (window.DL_API || '').replace(/\/+$/, '')
const DL = window.DL_DOWNLOAD || '#'
const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = (n, c = 'HTG') => new Intl.NumberFormat('fr-FR').format(n) + ' ' + c
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '—'
const planLabel = p => p === '1y' ? 'Abonnement 1 an' : p === '1m' ? 'Abonnement 1 mois' : 'Essai 15 jours'

// ── Session ──
const TKEY = 'dl_token'
const token = () => localStorage.getItem(TKEY) || ''
const setToken = t => localStorage.setItem(TKEY, t)
const clearToken = () => localStorage.removeItem(TKEY)

const api = async (p, { body, auth, method } = {}) => {
  const h = { 'Content-Type': 'application/json' }
  if (auth && token()) h.Authorization = 'Bearer ' + token()
  const r = await fetch(API + p, { method: method || (body ? 'POST' : 'GET'), headers: h, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(j.error || 'Erreur'); e.status = r.status; if (r.status === 401 && auth) clearToken(); throw e }
  return j
}

// ── Fonctionnalités ──
const FEATURES = [
  ['patients', 'Patients & dossiers', 'Fiches complètes, antécédents, schéma dentaire (odontogramme), documents et consentements.'],
  ['calendar', 'Rendez-vous & salle d’attente', 'Agenda, file d’attente en temps réel, rappels et suivi des présences.'],
  ['billing', 'Facturation multi-devises', 'Devis, factures, encaissements, taux du jour, dettes et relances.'],
  ['caisse', 'Caisse', 'Mouvements, transferts, clôture de caisse et dépenses, par compte.'],
  ['stock', 'Stock & prothèses', 'Suivi du matériel, commandes, et gestion des travaux de laboratoire.'],
  ['payroll', 'Paie & commissions', 'Salaires, commissions par praticien, déductions et revisions.'],
  ['reports', 'Rapports PDF & Excel', 'Tableaux de bord, statistiques, exports pour la comptabilité.'],
  ['security', 'Sécurité renforcée', 'Rôles, permissions, 2FA, journal d’audit, chiffrement des données.'],
  ['backups', 'Sauvegardes', 'Copies automatiques locales et en ligne, récupérables en un clic.']
]
$('#feat-grid').innerHTML = FEATURES.map(([i, t, d]) => `<div class="feat"><div class="ic"><img src="img/${i}.png" width="26" height="26" alt=""></div><h3>${t}</h3><p>${d}</p></div>`).join('')

// ── Tarifs (depuis le backend) ──
let PRICES = { '1m': 1500, '1y': 15000, currency: 'HTG' }
async function loadPlans() {
  try { PRICES = await api('/api/prices') } catch { /* valeurs par défaut */ }
  const plans = [
    { key: 'trial', name: 'Essai', price: 'Gratuit', unit: '15 jours', desc: 'Toutes les fonctionnalités, sans carte.', feats: ['Accès complet', 'Jusqu’à 2 postes', 'Support de démarrage'], cta: 'Commencer l’essai', hot: false },
    { key: '1m', name: 'Mensuel', price: money(PRICES['1m'], PRICES.currency), unit: '/ mois', desc: 'La souplesse du mois par mois.', feats: ['Tout l’essai, sans limite de temps', 'Sauvegarde en ligne', 'Mises à jour incluses'], cta: 'Choisir le mensuel', hot: true },
    { key: '1y', name: 'Annuel', price: money(PRICES['1y'], PRICES.currency), unit: '/ an', desc: 'Le meilleur tarif à l’année.', feats: ['2 mois offerts* vs mensuel', 'Sauvegarde en ligne', 'Priorité au support'], cta: 'Choisir l’annuel', hot: false }
  ]
  $('#plans').innerHTML = plans.map(p => `<div class="plan ${p.hot ? 'hot' : ''}">${p.hot ? '<span class="tag2">Le plus choisi</span>' : ''}
    <h3>${p.name}</h3><div class="price">${p.price} <small>${p.unit}</small></div>
    <p class="desc">${p.desc}</p><ul>${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>
    <button class="btn ${p.hot ? 'btn-brand' : 'btn-light'}" data-plan="${p.key}">${p.cta}</button></div>`).join('')
  document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => enter(b.dataset.plan))
}
loadPlans()

// ── Modal ──
function modal(html) { const r = $('#modal-root'); r.innerHTML = `<div class="ov" id="ov"><div class="modal">${html}</div></div>`; $('#ov').onclick = e => { if (e.target.id === 'ov') r.innerHTML = '' }; return r }
function closeModal() { $('#modal-root').innerHTML = '' }
const showErr = (id, msg) => { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block' } }

// ── Point d'entrée : connecté → espace ; sinon → compte / connexion ──
async function enter(plan) {
  if (token()) { try { return await openPortal(plan) } catch (e) { if (e.status === 401) clearToken(); else { alert(e.message); return } } }
  openAuth('register', plan)
}

// ── Création de compte / connexion (onglets) ──
function openAuth(tab, plan) {
  modal(`<div class="tabs"><button class="tab ${tab === 'register' ? 'on' : ''}" id="t-reg">Créer un compte</button><button class="tab ${tab === 'login' ? 'on' : ''}" id="t-log">Se connecter</button></div>
    <div class="err" id="a-err" style="display:none"></div>
    <div id="pane"></div>`)
  const paneReg = () => `<p class="muted">Créez votre compte clinique. Vous choisirez votre formule juste après.</p>
    <div class="field"><label>Nom de la clinique</label><input id="a-name" autocomplete="organization"></div>
    <div class="field"><label>E-mail</label><input id="a-email" type="email" autocomplete="email"></div>
    <div class="field"><label>Mot de passe</label><input id="a-pass" type="password" autocomplete="new-password" placeholder="6 caractères minimum"></div>
    <div class="row2"><div class="field"><label>Téléphone</label><input id="a-phone"></div><div class="field"><label>Ville</label><input id="a-city"></div></div>
    <button class="btn btn-primary wfull" id="a-go">Créer mon compte</button>`
  const paneLog = () => `<p class="muted">Connectez-vous pour choisir un plan, payer et retrouver vos licences.</p>
    <div class="field"><label>E-mail</label><input id="a-email" type="email" autocomplete="email"></div>
    <div class="field"><label>Mot de passe</label><input id="a-pass" type="password" autocomplete="current-password"></div>
    <button class="btn btn-brand wfull" id="a-go">Se connecter</button>
    <p class="muted center mt"><a href="#" id="to-resend" class="lnk">Mot de passe oublié ? Recevoir ma clé par e-mail</a></p>`
  const render = t => {
    $('#pane').innerHTML = t === 'register' ? paneReg() : paneLog()
    $('#t-reg').classList.toggle('on', t === 'register'); $('#t-log').classList.toggle('on', t === 'login')
    const rs = document.getElementById('to-resend'); if (rs) rs.onclick = e => { e.preventDefault(); openResend() }
    $('#a-go').onclick = async e => {
      e.target.disabled = true; $('#a-err').style.display = 'none'
      try {
        if (t === 'register') {
          const r = await api('/api/account/register', { body: { name: $('#a-name').value.trim(), email: $('#a-email').value.trim(), password: $('#a-pass').value, phone: $('#a-phone').value.trim(), city: $('#a-city').value.trim() } })
          setToken(r.token)
        } else {
          const r = await api('/api/account/login', { body: { email: $('#a-email').value.trim(), password: $('#a-pass').value } })
          setToken(r.token)
        }
        await openPortal(plan)
      } catch (ex) { showErr('a-err', ex.message); e.target.disabled = false }
    }
  }
  $('#t-reg').onclick = () => render('register'); $('#t-log').onclick = () => render('login')
  render(tab)
}

// ── Espace client ──
async function openPortal(preselect) {
  const me = await api('/api/account/me', { auth: true })
  const sub = me.subscription
  const statusBadge = sub ? `<span class="badge ${sub.status === 'expired' ? 'bad' : sub.status === 'grace' ? 'warn' : 'ok'}">${sub.status === 'trial' ? 'Essai en cours' : sub.status === 'active' ? 'Abonnement actif' : sub.status === 'grace' ? 'Période de grâce' : 'Expiré'}</span>`
    : `<span class="badge warn">Aucun plan</span>`
  const licHtml = me.licenses.length ? me.licenses.map(l => `<div class="lic">
      <div class="lic-top"><span class="lic-plan">${planLabel(l.plan)}</span><span class="badge ${l.status === 'active' ? 'ok' : 'bad'}">${l.status === 'active' ? 'Active' : l.status === 'revoked' ? 'Révoquée' : 'Expirée'}</span></div>
      <div class="lic-key"><code>${esc(l.key)}</code><button class="copy" data-k="${esc(l.key)}">Copier</button></div>
      <div class="lic-meta">Du ${fdate(l.starts_at)} au ${fdate(l.ends_at)}</div></div>`).join('')
    : `<p class="muted">Aucune licence pour l’instant. Choisissez une formule ci-dessous — votre clé sera générée immédiatement pour l’essai, ou après paiement pour un abonnement.</p>`
  const cur = PRICES
  const trialBtn = me.trial_used ? '' : `<button class="pbtn" data-p="trial"><strong>Essai gratuit</strong><span>15 jours · immédiat</span></button>`
  modal(`<div class="portal">
    <div class="p-head"><div><h3>${esc(me.clinic.name)}</h3><p class="muted">${esc(me.clinic.email)} ${statusBadge}</p></div><button class="lnk" id="logout">Déconnexion</button></div>
    <div class="err" id="p-err" style="display:none"></div>
    <h4 class="p-ttl">Mes licences</h4>
    <div id="lic-list">${licHtml}</div>
    <h4 class="p-ttl">Choisir une formule</h4>
    <div class="portal-plans">
      ${trialBtn}
      <button class="pbtn" data-p="1m"><strong>Mensuel</strong><span>${money(cur['1m'], cur.currency)} / mois</span></button>
      <button class="pbtn hot" data-p="1y"><strong>Annuel</strong><span>${money(cur['1y'], cur.currency)} / an</span></button>
    </div>
    <a class="btn btn-dark wfull mt" href="${esc(DL)}"><img src="img/download.png" width="18" height="18" alt="">Télécharger le logiciel</a>
  </div>`)
  $('#logout').onclick = () => { clearToken(); closeModal() }
  document.querySelectorAll('.copy').forEach(b => b.onclick = () => { navigator.clipboard?.writeText(b.dataset.k); b.textContent = 'Copié ✓'; setTimeout(() => b.textContent = 'Copier', 1500) })
  document.querySelectorAll('.pbtn').forEach(b => b.onclick = () => choosePlan(b.dataset.p))
  if (preselect && (preselect === '1m' || preselect === '1y' || (preselect === 'trial' && !me.trial_used))) choosePlan(preselect)
}

async function choosePlan(plan) {
  try {
    const r = await api('/api/account/plan', { auth: true, body: { plan } })
    if (r.license_key) return licenseReady(r.license_key, r.plan || plan, r.starts_at, r.ends_at)   // essai : clé immédiate
    if (r.needs_payment) return openPay(plan, r.amount, r.currency)                                   // payant : payer d'abord
  } catch (e) { if (e.status === 401) { clearToken(); openAuth('login', plan) } else showErr('p-err', e.message) }
}

// ── Paiement (licence générée seulement après confirmation) ──
function openPay(plan, amount, currency) {
  modal(`<h3>Paiement — ${planLabel(plan)}</h3>
    <p class="muted">Montant : <strong>${money(amount, currency)}</strong>. Votre clé de licence sera générée dès le paiement confirmé, jamais avant.</p>
    <div class="err" id="pay-err" style="display:none"></div>
    <button class="btn btn-primary wfull" id="pay-mc"><img src="img/key.png" width="18" height="18" alt="">Payer avec MonCash</button>
    <button class="btn btn-light wfull mt" id="pay-vir">Payer par virement bancaire</button>
    <p class="muted center mt"><a href="#" class="lnk" id="back-portal">← Retour à mon espace</a></p>`)
  document.getElementById('back-portal').onclick = e => { e.preventDefault(); openPortal() }
  $('#pay-mc').onclick = async e => {
    e.target.disabled = true; e.target.textContent = 'Redirection vers MonCash…'
    try { const p = await api('/api/account/pay/moncash', { auth: true, body: { plan } }); location.href = p.redirectUrl }
    catch (ex) { showErr('pay-err', ex.message); e.target.disabled = false; e.target.textContent = 'Payer avec MonCash' }
  }
  $('#pay-vir').onclick = async () => {
    try { const v = await api('/api/account/pay/virement', { auth: true, body: { plan } }); bankView(v) }
    catch (ex) { showErr('pay-err', ex.message) }
  }
}

function bankView(v) {
  modal(`<h3>Virement bancaire</h3>
    <p class="muted">Effectuez le virement puis envoyez la preuve. Dès réception, nous confirmons et votre clé est générée automatiquement.</p>
    <div class="bank">
      <div><span>Montant</span><strong>${money(v.amount, v.currency)}</strong></div>
      <div><span>Référence à indiquer</span><strong>${esc(v.reference)}</strong></div>
    </div>
    <p class="muted">Envoyez la preuve de virement à <a class="lnk" href="mailto:support@dealpam.com?subject=Virement%20${esc(v.reference)}">support@dealpam.com</a> en précisant la référence <strong>${esc(v.reference)}</strong>.</p>
    <button class="btn btn-light wfull mt" onclick="document.getElementById('modal-root').innerHTML=''">Fermer</button>`)
}

function licenseReady(key, plan, starts, ends) {
  modal(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" height="24" alt=""> Votre clé est prête</h3>
    <p class="muted">${planLabel(plan)}${ends ? ` · valable jusqu’au ${fdate(ends)}` : ''}. Saisissez-la dans le logiciel pour activer vos postes.</p>
    <div class="code">${esc(key)}</div>
    <button class="btn btn-brand wfull" id="cp">Copier la clé</button>
    <a class="btn btn-dark wfull mt" href="${esc(DL)}"><img src="img/download.png" width="18" height="18" alt="">Télécharger le logiciel</a>
    <button class="btn btn-light wfull mt" id="to-portal">Voir mon espace</button></div>`)
  $('#cp').onclick = () => { navigator.clipboard?.writeText(key); $('#cp').textContent = 'Copié ✓' }
  $('#to-portal').onclick = () => openPortal()
}

// ── Récupérer sa clé par e-mail ──
function openResend() {
  modal(`<h3>Recevoir ma clé par e-mail</h3><p class="muted">Entrez l'e-mail de votre compte : nous renvoyons votre clé de licence active.</p>
    <div class="err" id="r-err" style="display:none"></div>
    <div class="field"><label>E-mail du compte</label><input id="r-email" type="email"></div>
    <button class="btn btn-brand wfull" id="r-go">Envoyer ma clé</button>`)
  $('#r-go').onclick = async e => {
    e.target.disabled = true; $('#r-err').style.display = 'none'
    try { const r = await api('/api/resend-code', { body: { email: $('#r-email').value.trim() } }); modal(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" alt=""> C'est envoyé</h3><p class="muted">${esc(r.message || 'Vérifiez votre boîte e-mail.')}</p><button class="btn btn-light wfull mt" onclick="document.getElementById('modal-root').innerHTML=''">Fermer</button></div>`) }
    catch (ex) { showErr('r-err', ex.message); e.target.disabled = false }
  }
}

// ── Branchements ──
;['#hero-cta', '#final-cta', '#nav-cta', '#foot-cta'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); enter('trial') } })
;['#foot-dl', '#dl-main'].forEach(s => { const el = $(s); if (el) el.href = DL })
;['#dl-trial'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); enter('trial') } })
;['#foot-code'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); openResend() } })
// Si déjà connecté, le bouton principal mène à l'espace
if (token()) { const c = $('#nav-cta'); if (c) c.textContent = 'Mon espace' }
$('#burger').onclick = () => $('#menu').classList.toggle('open')
document.querySelectorAll('#menu a[href^="#"]').forEach(a => a.onclick = () => $('#menu').classList.remove('open'))
