// ═══ Dental Assist — Vitrine (logique multi-pages) ════════════════════════
// Parcours : compte (mot de passe) → plan → paiement → licence. La vitrine ne
// parle jamais à la base : tout passe par le backend. Jeton en localStorage.
// « Mon espace » (espace.html) affiche connexion/portail en pleine page.
const API = (window.DL_API || '').replace(/\/+$/, '')
const DL = window.DL_DOWNLOAD || '#'
const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = (n, c = 'HTG') => new Intl.NumberFormat('fr-FR').format(n) + ' ' + c
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '—'
const planLabel = p => p === '1y' ? 'Abonnement 1 an' : p === '1m' ? 'Abonnement 1 mois' : 'Essai 15 jours'

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

// ── Fonctionnalités (page fonctionnalites.html) ──
const FEATURES = [
  ['patients', 'Patients & dossiers', 'Fiches complètes, antécédents, schéma dentaire (odontogramme), documents et consentements.'],
  ['calendar', 'Rendez-vous & salle d’attente', 'Agenda, file d’attente en temps réel, rappels et suivi des présences.'],
  ['billing', 'Facturation multi-devises', 'Devis, factures, encaissements, taux du jour, dettes et relances.'],
  ['caisse', 'Caisse', 'Mouvements, transferts, clôture de caisse et dépenses, par compte.'],
  ['stock', 'Stock & prothèses', 'Suivi du matériel, commandes, et gestion des travaux de laboratoire.'],
  ['payroll', 'Paie & commissions', 'Salaires, commissions par praticien, déductions et révisions.'],
  ['reports', 'Rapports PDF & Excel', 'Tableaux de bord, statistiques, exports pour la comptabilité.'],
  ['security', 'Sécurité renforcée', 'Rôles, permissions, 2FA, journal d’audit, chiffrement des données.'],
  ['backups', 'Sauvegardes', 'Copies automatiques locales et en ligne, récupérables en un clic.']
]
function renderFeatures() {
  const g = $('#feat-grid'); if (!g) return
  g.innerHTML = FEATURES.map(([i, t, d]) => `<div class="feat"><div class="ic"><img src="img/${i}.png" width="26" height="26" alt=""></div><h3>${t}</h3><p>${d}</p></div>`).join('')
}

// ── Tarifs ──
let PRICES = { '1m': 1500, '1y': 15000, currency: 'HTG' }
async function loadPlans() {
  try { PRICES = await api('/api/prices') } catch { }
  const el = $('#plans'); if (!el) return
  const plans = [
    { key: 'trial', name: 'Essai', price: 'Gratuit', unit: '15 jours', desc: 'Toutes les fonctionnalités, sans carte.', feats: ['Accès complet', 'Jusqu’à 2 postes', 'Support de démarrage'], cta: 'Commencer l’essai', hot: false },
    { key: '1m', name: 'Mensuel', price: money(PRICES['1m'], PRICES.currency), unit: '/ mois', desc: 'La souplesse du mois par mois.', feats: ['Tout l’essai, sans limite de temps', 'Sauvegarde en ligne', 'Mises à jour incluses'], cta: 'Choisir le mensuel', hot: true },
    { key: '1y', name: 'Annuel', price: money(PRICES['1y'], PRICES.currency), unit: '/ an', desc: 'Le meilleur tarif à l’année.', feats: ['2 mois offerts* vs mensuel', 'Sauvegarde en ligne', 'Priorité au support'], cta: 'Choisir l’annuel', hot: false }
  ]
  el.innerHTML = plans.map(p => `<div class="plan ${p.hot ? 'hot' : ''}">${p.hot ? '<span class="tag2">Le plus choisi</span>' : ''}
    <h3>${p.name}</h3><div class="price">${p.price} <small>${p.unit}</small></div>
    <p class="desc">${p.desc}</p><ul>${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>
    <a class="btn ${p.hot ? 'btn-brand' : 'btn-light'}" href="espace.html?cta=register&plan=${p.key}">${p.cta}</a></div>`).join('')
}

// ── Affichage : modal (pages marketing) OU inline (page Mon espace) ──
let MOUNT = null
function modal(html) { const r = $('#modal-root'); if (!r) { alert('…'); return } r.innerHTML = `<div class="ov" id="ov"><div class="modal">${html}</div></div>`; $('#ov').onclick = e => { if (e.target.id === 'ov') r.innerHTML = '' }; return r }
function closeModal() { const r = $('#modal-root'); if (r) r.innerHTML = '' }
function paint(html) { if (MOUNT) { MOUNT.innerHTML = `<div class="espace-card">${html}</div>`; return MOUNT } return modal(html) }
const showErr = (id, msg) => { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block' } }

// ── Point d'entrée ──
async function enter(plan) {
  if (token()) { try { return await openPortal(plan) } catch (e) { if (e.status === 401) clearToken(); else { alert(e.message); return } } }
  openAuth('register', plan)
}

function openAuth(tab, plan) {
  paint(`<div class="tabs"><button class="tab ${tab === 'register' ? 'on' : ''}" id="t-reg">Créer un compte</button><button class="tab ${tab === 'login' ? 'on' : ''}" id="t-log">Se connecter</button></div>
    <div class="err" id="a-err" style="display:none"></div><div id="pane"></div>`)
  const paneReg = () => `<p class="muted">Créez votre compte clinique. Vous choisirez votre formule juste après.</p>
    <div class="field"><label>Nom de la clinique</label><input id="a-name" autocomplete="organization"></div>
    <div class="field"><label>E-mail</label><input id="a-email" type="email" autocomplete="email"></div>
    <div class="field"><label>Mot de passe</label><input id="a-pass" type="password" autocomplete="new-password" placeholder="6 caractères minimum"></div>
    <div class="row2"><div class="field"><label>Téléphone</label><input id="a-phone"></div><div class="field"><label>Ville</label><input id="a-city"></div></div>
    <div class="field"><label>Adresse de la clinique</label><input id="a-address" autocomplete="street-address" placeholder="rue, quartier…"></div>
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
          const r = await api('/api/account/register', { body: { name: $('#a-name').value.trim(), email: $('#a-email').value.trim(), password: $('#a-pass').value, phone: $('#a-phone').value.trim(), city: $('#a-city').value.trim(), address: $('#a-address').value.trim() } })
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

async function openPortal(preselect) {
  const me = await api('/api/account/me', { auth: true })
  const sub = me.subscription
  const statusBadge = sub ? `<span class="badge ${sub.status === 'expired' ? 'bad' : sub.status === 'grace' ? 'warn' : 'ok'}">${sub.status === 'trial' ? 'Essai en cours' : sub.status === 'active' ? 'Abonnement actif' : sub.status === 'grace' ? 'Période de grâce' : 'Expiré'}</span>` : `<span class="badge warn">Aucun plan</span>`
  const licHtml = me.licenses.length ? me.licenses.map(l => `<div class="lic">
      <div class="lic-top"><span class="lic-plan">${planLabel(l.plan)}</span><span class="badge ${l.status === 'active' ? 'ok' : 'bad'}">${l.status === 'active' ? 'Active' : l.status === 'revoked' ? 'Révoquée' : 'Expirée'}</span></div>
      <div class="lic-key"><code>${esc(l.key)}</code><button class="copy" data-k="${esc(l.key)}">Copier</button></div>
      <div class="lic-meta">Du ${fdate(l.starts_at)} au ${fdate(l.ends_at)}</div></div>`).join('')
    : `<p class="muted">Aucune licence pour l’instant. Choisissez une formule ci-dessous — clé immédiate pour l’essai, ou après paiement pour un abonnement.</p>`
  const payHtml = (me.payments || []).length ? `<h4 class="p-ttl">Mes paiements</h4><div class="paylist">${me.payments.map(p => `<div class="payrow"><span>${fdate(p.created_at)} · ${p.method}</span><strong>${money(p.amount, p.currency)}</strong><span class="badge ${p.status === 'confirmed' ? 'ok' : p.status === 'rejected' || p.status === 'failed' ? 'bad' : 'warn'}">${p.status === 'confirmed' ? 'Confirmé' : p.status === 'pending' ? 'En attente' : p.status === 'failed' ? 'Échoué' : 'Rejeté'}</span></div>`).join('')}</div>` : ''
  const cur = PRICES
  const trialBtn = me.trial_used ? '' : `<button class="pbtn" data-p="trial"><strong>Essai gratuit</strong><span>15 jours · immédiat</span></button>`
  const appUrl = (window.DL_APP || '').replace(/\/+$/, '')
  const hasLic = (me.licenses || []).some(l => l.status === 'active')
  const saHtml = hasLic ? `<h4 class="p-ttl">Mon compte super-admin</h4>
    <div class="sa-card">
      <p class="muted" style="margin:0 0 14px">Créez le compte <b>propriétaire (super-admin)</b> de votre clinique. Vous vous connecterez ensuite au logiciel web avec votre <b>clé de licence</b> et un <b>code reçu par e-mail</b>.</p>
      <div class="err" id="sa-err" style="display:none"></div>
      <div class="field"><label>E-mail du super-admin</label><input id="sa-email" type="email" value="${esc(me.clinic.email || '')}"></div>
      <div class="field"><label>Mot de passe</label><input id="sa-pw" type="password" placeholder="12 caractères minimum"></div>
      <div class="field"><label>Confirmer le mot de passe</label><input id="sa-pw2" type="password"></div>
      <button class="btn btn-brand wfull" id="sa-go">Créer mon super-admin</button>
    </div>` : ''
  paint(`<div class="portal">
    <div class="p-head"><div><h3>${esc(me.clinic.name)}</h3><p class="muted">${esc(me.clinic.email)} ${statusBadge}</p></div><button class="lnk" id="logout">Déconnexion</button></div>
    <div class="err" id="p-err" style="display:none"></div>
    <h4 class="p-ttl">Mes licences</h4><div id="lic-list">${licHtml}</div>
    ${saHtml}
    <h4 class="p-ttl">Choisir une formule</h4>
    <div class="portal-plans">${trialBtn}
      <button class="pbtn" data-p="1m"><strong>Mensuel</strong><span>${money(cur['1m'], cur.currency)} / mois</span></button>
      <button class="pbtn hot" data-p="1y"><strong>Annuel</strong><span>${money(cur['1y'], cur.currency)} / an</span></button></div>
    ${payHtml}
    <a class="btn btn-dark wfull mt" href="${esc(DL)}"><img src="img/download.png" width="18" height="18" alt="">Télécharger le logiciel</a></div>`)
  $('#logout').onclick = () => { clearToken(); if (MOUNT) openAuth('login'); else closeModal() }
  document.querySelectorAll('.copy').forEach(b => b.onclick = () => { navigator.clipboard?.writeText(b.dataset.k); b.textContent = 'Copié ✓'; setTimeout(() => b.textContent = 'Copier', 1500) })
  document.querySelectorAll('.pbtn').forEach(b => b.onclick = () => choosePlan(b.dataset.p))
  const saGo = $('#sa-go'); if (saGo) saGo.onclick = async () => {
    const email = $('#sa-email').value.trim(), pw = $('#sa-pw').value, pw2 = $('#sa-pw2').value
    $('#sa-err').style.display = 'none'
    if (pw.length < 12) return showErr('sa-err', 'Mot de passe : 12 caractères minimum.')
    if (pw !== pw2) return showErr('sa-err', 'Les deux mots de passe ne correspondent pas.')
    saGo.disabled = true
    try {
      const r = await api('/api/account/provision-admin', { auth: true, body: { email, password: pw } })
      paint(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" alt=""> Super-admin ${r.created ? 'créé' : 'déjà actif'}</h3>
        <p class="muted">Connectez-vous au logiciel web avec votre <b>clé de licence</b> et le <b>code reçu par e-mail</b> (${esc(email)}).</p>
        <div class="field"><label>Votre clé de licence</label><div class="code">${esc(r.license_key)}</div></div>
        ${appUrl ? `<a class="btn btn-brand wfull" href="${esc(appUrl)}" target="_blank" rel="noopener">Ouvrir le logiciel</a>` : ''}
        <button class="btn btn-light wfull mt" id="sa-back">Retour à mon espace</button></div>`)
      const bk = document.getElementById('sa-back'); if (bk) bk.onclick = () => openPortal()
    } catch (e) { saGo.disabled = false; showErr('sa-err', e.message) }
  }
  if (preselect && (preselect === '1m' || preselect === '1y' || (preselect === 'trial' && !me.trial_used))) choosePlan(preselect)
}

async function choosePlan(plan) {
  try {
    const r = await api('/api/account/plan', { auth: true, body: { plan } })
    if (r.license_key) return licenseReady(r.license_key, r.plan || plan, r.starts_at, r.ends_at)
    if (r.needs_payment) return openPay(plan, r.amount, r.currency)
  } catch (e) { if (e.status === 401) { clearToken(); openAuth('login', plan) } else showErr('p-err', e.message) }
}

function openPay(plan, amount, currency) {
  paint(`<h3>Paiement — ${planLabel(plan)}</h3>
    <p class="muted">Montant : <strong>${money(amount, currency)}</strong>. Votre clé est générée dès le paiement confirmé, jamais avant.</p>
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
  $('#pay-vir').onclick = async () => { try { const v = await api('/api/account/pay/virement', { auth: true, body: { plan } }); bankView(v) } catch (ex) { showErr('pay-err', ex.message) } }
}

async function bankView(v) {
  paint(`<h3>Virement bancaire</h3><p class="muted">Chargement des comptes…</p>`)
  let accounts = []
  try { accounts = await api('/api/bank-accounts') } catch { }
  const accHtml = accounts.length ? accounts.map(b => `<div class="bank">
      <div><span>${esc(b.bank_name)}</span><strong>${esc(b.number)}</strong></div>
      <div><span>Titulaire</span><strong>${esc(b.holder)}</strong></div>
      <div><span>Devise</span><strong>${esc(b.currency)}</strong></div>
      ${b.note ? `<div><span>Note</span><strong>${esc(b.note)}</strong></div>` : ''}</div>`).join('')
    : `<p class="muted">Les coordonnées bancaires seront communiquées par notre équipe. Contactez <a class="lnk" href="mailto:dentalassist@gmail.com">dentalassist@gmail.com</a>.</p>`
  paint(`<h3>Virement bancaire</h3>
    <p class="muted">Montant : <strong>${money(v.amount, v.currency)}</strong> · Référence : <strong>${esc(v.reference)}</strong></p>
    <p class="muted">Virez le montant sur l'un de ces comptes en indiquant la référence <strong>${esc(v.reference)}</strong>, puis téléversez votre preuve :</p>
    ${accHtml}
    <div class="err" id="pf-err" style="display:none"></div>
    <div class="field"><label>Preuve de virement (image ou PDF)</label><input type="file" id="pf-file" accept="image/*,application/pdf"></div>
    <button class="btn btn-primary wfull" id="pf-go">Envoyer la preuve</button>
    <p class="muted center mt"><a href="#" class="lnk" id="back-portal2">← Retour à mon espace</a></p>`)
  document.getElementById('back-portal2').onclick = e => { e.preventDefault(); openPortal() }
  $('#pf-go').onclick = async e => {
    const f = $('#pf-file').files[0]
    if (!f) return showErr('pf-err', 'Choisissez un fichier.')
    if (f.size > 8 * 1024 * 1024) return showErr('pf-err', 'Fichier trop lourd (8 Mo maximum).')
    e.target.disabled = true; $('#pf-err').style.display = 'none'
    try {
      const dataBase64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f) })
      await api('/api/account/pay/proof', { auth: true, body: { payment_id: v.payment_id, filename: f.name, contentType: f.type, dataBase64 } })
      paint(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" alt=""> Preuve envoyée</h3>
        <p class="muted">Merci ! Notre équipe valide votre virement (réf <strong>${esc(v.reference)}</strong>) et votre clé de licence vous sera envoyée par e-mail dès confirmation.</p>
        <button class="btn btn-light wfull mt" id="toportal2">Voir mon espace</button></div>`)
      document.getElementById('toportal2').onclick = () => openPortal()
    } catch (ex) { showErr('pf-err', ex.message); e.target.disabled = false }
  }
}

function licenseReady(key, plan, starts, ends) {
  paint(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" height="24" alt=""> Votre clé est prête</h3>
    <p class="muted">${planLabel(plan)}${ends ? ` · valable jusqu’au ${fdate(ends)}` : ''}. Saisissez-la dans le logiciel pour activer vos postes.</p>
    <div class="code">${esc(key)}</div>
    <button class="btn btn-brand wfull" id="cp">Copier la clé</button>
    <a class="btn btn-dark wfull mt" href="${esc(DL)}"><img src="img/download.png" width="18" height="18" alt="">Télécharger le logiciel</a>
    <button class="btn btn-light wfull mt" id="to-portal">Voir mon espace</button></div>`)
  $('#cp').onclick = () => { navigator.clipboard?.writeText(key); $('#cp').textContent = 'Copié ✓' }
  $('#to-portal').onclick = () => openPortal()
}

function openResend() {
  paint(`<h3>Recevoir ma clé par e-mail</h3><p class="muted">Entrez l'e-mail de votre compte : nous renvoyons votre clé de licence active.</p>
    <div class="err" id="r-err" style="display:none"></div>
    <div class="field"><label>E-mail du compte</label><input id="r-email" type="email"></div>
    <button class="btn btn-brand wfull" id="r-go">Envoyer ma clé</button>
    <p class="muted center mt"><a href="#" class="lnk" id="r-back">← Retour</a></p>`)
  const rb = document.getElementById('r-back'); if (rb) rb.onclick = e => { e.preventDefault(); openAuth('login') }
  $('#r-go').onclick = async e => {
    e.target.disabled = true; $('#r-err').style.display = 'none'
    try { const r = await api('/api/resend-code', { body: { email: $('#r-email').value.trim() } }); paint(`<div class="success"><h3 class="ic-h"><img src="img/check.png" width="24" alt=""> C'est envoyé</h3><p class="muted">${esc(r.message || 'Vérifiez votre boîte e-mail.')}</p><button class="btn btn-light wfull mt" id="rok">OK</button></div>`); document.getElementById('rok').onclick = () => openAuth('login') }
    catch (ex) { showErr('r-err', ex.message); e.target.disabled = false }
  }
}

// ── Initialisation selon la page ──
renderFeatures()
loadPlans()
document.querySelectorAll('[data-dl]').forEach(a => a.href = DL)
// Menu mobile
const burger = $('#burger'); if (burger) burger.onclick = () => $('#menu')?.classList.toggle('open')
document.querySelectorAll('#menu a[href]').forEach(a => a.onclick = () => $('#menu')?.classList.remove('open'))
// Page « Mon espace »
const espaceRoot = document.getElementById('espace-root')
if (espaceRoot) {
  MOUNT = espaceRoot
  const params = new URLSearchParams(location.search)
  if (token()) openPortal(params.get('plan'))
  else openAuth(params.get('cta') === 'login' ? 'login' : 'register', params.get('plan'))
}
