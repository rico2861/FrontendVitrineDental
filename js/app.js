// ═══ DENTAL — Vitrine (logique) ═══════════════════════════════════════
const API = (window.DL_API || '').replace(/\/+$/, '')
const DL = window.DL_DOWNLOAD || '#'
const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const api = async (p, body) => { const r = await fetch(API + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Erreur'); return j }
const money = (n, c = 'HTG') => new Intl.NumberFormat('fr-FR').format(n) + ' ' + c

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
async function loadPlans() {
  let pr = { '1m': 1500, '1y': 15000, currency: 'HTG' }
  try { pr = await api('/api/prices') } catch { /* valeurs par défaut */ }
  const plans = [
    { key: 'trial', name: 'Essai', price: 'Gratuit', unit: '15 jours', desc: 'Toutes les fonctionnalités, sans carte.', feats: ['Accès complet', 'Jusqu’à 2 postes', 'Support de démarrage'], cta: 'Commencer l’essai', hot: false },
    { key: '1m', name: 'Mensuel', price: money(pr['1m'], pr.currency), unit: '/ mois', desc: 'La souplesse du mois par mois.', feats: ['Tout l’essai, sans limite de temps', 'Sauvegarde en ligne', 'Mises à jour incluses'], cta: 'Choisir le mensuel', hot: true },
    { key: '1y', name: 'Annuel', price: money(pr['1y'], pr.currency), unit: '/ an', desc: 'Le meilleur tarif à l’année.', feats: ['2 mois offerts* vs mensuel', 'Sauvegarde en ligne', 'Priorité au support'], cta: 'Choisir l’annuel', hot: false }
  ]
  $('#plans').innerHTML = plans.map(p => `<div class="plan ${p.hot ? 'hot' : ''}">${p.hot ? '<span class="tag2">Le plus choisi</span>' : ''}
    <h3>${p.name}</h3><div class="price">${p.price} ${p.price !== 'Gratuit' ? `<small>${p.unit}</small>` : `<small>${p.unit}</small>`}</div>
    <p class="desc">${p.desc}</p><ul>${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>
    <button class="btn ${p.hot ? 'btn-brand' : 'btn-light'}" data-plan="${p.key}">${p.cta}</button></div>`).join('')
  document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => openSignup(b.dataset.plan))
}
loadPlans()

// ── Modal inscription d'essai + paiement ──
function modal(html) { const r = $('#modal-root'); r.innerHTML = `<div class="ov" id="ov"><div class="modal">${html}</div></div>`; $('#ov').onclick = e => { if (e.target.id === 'ov') r.innerHTML = '' }; return r }
function closeModal() { $('#modal-root').innerHTML = '' }

function openSignup(plan) {
  modal(`<h3>Démarrer votre essai</h3><p class="muted">15 jours gratuits. Vous recevrez un code d’activation à saisir dans le logiciel.</p>
    <div class="err" id="s-err" style="display:none"></div>
    <div class="field"><label>Nom de la clinique</label><input id="s-name"></div>
    <div class="field"><label>E-mail</label><input id="s-email" type="email"></div>
    <div class="field"><label>Téléphone</label><input id="s-phone"></div>
    <div class="field"><label>Ville</label><input id="s-city"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" id="s-go">Créer mon compte d’essai</button>
    <p class="muted" style="text-align:center;margin:12px 0 0">Déjà client ? <a href="#" id="to-resend" style="color:var(--brand);font-weight:600">Récupérer mon code</a></p>`)
  document.getElementById('to-resend').onclick = e => { e.preventDefault(); openResend() }
  $('#s-go').onclick = async e => {
    const err = $('#s-err'); err.style.display = 'none'; e.target.disabled = true
    try {
      const r = await api('/api/signup', { name: $('#s-name').value.trim(), email: $('#s-email').value.trim(), phone: $('#s-phone').value.trim(), city: $('#s-city').value.trim() })
      successView(r, plan)
    } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; e.target.disabled = false }
  }
}

function successView(r, plan) {
  const payBtns = (plan === '1m' || plan === '1y')
    ? `<p class="muted" style="margin-top:14px">Vous avez choisi la formule ${plan === '1y' ? 'annuelle' : 'mensuelle'}. Payez maintenant avec MonCash (ou plus tard depuis le logiciel) :</p>
       <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" id="pay-go">Payer avec MonCash</button>`
    : ''
  modal(`<div class="success"><h3 style="display:flex;align-items:center;gap:8px"><img src="img/check.png" width="24" height="24" alt=""> Votre essai est prêt</h3>
    <p class="muted">Voici le code d’activation de votre clinique. Entrez-le dans le logiciel pour débloquer vos 15 jours gratuits.</p>
    <div class="code">${esc(r.activation_code)}</div>
    <a class="btn btn-dark" style="width:100%;justify-content:center;gap:8px" href="${esc(DL)}"><img src="img/download.png" width="18" height="18" alt="">Télécharger le logiciel</a>
    ${payBtns}
    <p class="muted" style="margin-top:14px">Gardez ce code précieusement : il sert à activer chaque poste de votre clinique.</p>
    <button class="btn btn-light" style="width:100%;justify-content:center;margin-top:6px" onclick="document.getElementById('modal-root').innerHTML=''">Fermer</button></div>`)
  const pg = document.getElementById('pay-go')
  if (pg) pg.onclick = async () => {
    pg.disabled = true; pg.textContent = 'Redirection vers MonCash…'
    try { const p = await api('/api/pay/moncash', { clinic_id: r.clinic_id, plan }); location.href = p.redirectUrl }
    catch (ex) { pg.disabled = false; pg.textContent = 'Payer avec MonCash'; alert(ex.message) }
  }
}

function openResend() {
  modal(`<h3>Récupérer mon code</h3><p class="muted">Entrez l'e-mail de votre clinique : nous vous renvoyons votre code d'activation par e-mail.</p>
    <div class="err" id="r-err" style="display:none"></div>
    <div class="field"><label>E-mail de la clinique</label><input id="r-email" type="email"></div>
    <button class="btn btn-brand" style="width:100%;justify-content:center" id="r-go">Envoyer mon code</button>`)
  $('#r-go').onclick = async e => {
    const err = $('#r-err'); err.style.display = 'none'; e.target.disabled = true
    try { const r = await api('/api/resend-code', { email: $('#r-email').value.trim() }); modal(`<div class="success"><h3 style="display:flex;align-items:center;gap:8px"><img src="img/check.png" width="24" alt=""> C'est envoyé</h3><p class="muted">${esc(r.message || 'Vérifiez votre boîte e-mail.')}</p><button class="btn btn-light" style="width:100%;justify-content:center;margin-top:10px" onclick="document.getElementById('modal-root').innerHTML=''">Fermer</button></div>`) }
    catch (ex) { err.textContent = ex.message; err.style.display = 'block'; e.target.disabled = false }
  }
}

// ── Branchements ──
;['#hero-cta', '#final-cta', '#nav-cta', '#foot-cta'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); openSignup('trial') } })
;['#foot-dl', '#dl-main'].forEach(s => { const el = $(s); if (el) el.href = DL })
;['#dl-trial'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); openSignup('trial') } })
;['#foot-code'].forEach(s => { const el = $(s); if (el) el.onclick = e => { e.preventDefault(); openResend() } })
$('#burger').onclick = () => $('#menu').classList.toggle('open')
document.querySelectorAll('#menu a[href^="#"]').forEach(a => a.onclick = () => $('#menu').classList.remove('open'))
