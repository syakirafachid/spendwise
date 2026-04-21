// ── SUPABASE CLIENT ──────────────────────────────────────────
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── CATEGORIES ───────────────────────────────────────────────
const CATS = {
  income: [
    { label: 'Salary',     icon: '💼', color: '#639922' },
    { label: 'Freelance',  icon: '💻', color: '#3B6D11' },
    { label: 'Investment', icon: '📈', color: '#97C459' },
    { label: 'Gift',       icon: '🎁', color: '#C0DD97' },
    { label: 'Other',      icon: '💰', color: '#888780' },
  ],
  expense: [
    { label: 'Food',          icon: '🍜', color: '#D85A30' },
    { label: 'Coffee',        icon: '☕', color: '#BA7517' },
    { label: 'Transport',     icon: '🚗', color: '#378ADD' },
    { label: 'Shopping',      icon: '🛍️', color: '#D4537E' },
    { label: 'Entertainment', icon: '🎮', color: '#7F77DD' },
    { label: 'Skincare',      icon: '✨', color: '#ED93B1' },
    { label: 'Subscriptions', icon: '📱', color: '#534AB7' },
    { label: 'Rent',          icon: '🏠', color: '#5F5E5A' },
    { label: 'Health',        icon: '💊', color: '#1D9E75' },
    { label: 'Other',         icon: '💸', color: '#888780' },
  ],
}

// ── ROASTS ───────────────────────────────────────────────────
const ROASTS = {
  Coffee:        ["You're basically IV-dripping caffeine at this point ☕💀","Your blood type is espresso and your bank account hates it","Starbucks sends you a birthday card. That's not a flex."],
  Shopping:      ["Your cart trauma is real and so is your debt 🛍️💀","You don't have a shopping problem, you have a savings problem","Retail therapy hits different when you're actually broke"],
  Entertainment: ["Netflix, Spotify AND that thing you forgot to cancel 📱💀","You're funding Hollywood while eating instant noodles","Entertainment budget: thriving. Savings account: deceased."],
  Skincare:      ["10-step routine but 0 steps toward saving 💀✨","Your face is hydrated. Your wallet is not.","Glowing skin, empty bank. At least you're prettily broke."],
  Food:          ["You're basically paying rent at this restaurant 🍜💀","Cooking at home was right there... and you ignored it","Gordon Ramsay couldn't afford your food habits either"],
  Transport:     ["You could've bought a bike by now 🚗💀","Gas prices are up AND so are your Grab bills","Your commute costs more than actual therapy"],
  Subscriptions: ["Paying for 3 streaming apps and still say 'nothing to watch' 📱💀","Subscription creep is real and it found your credit card","Cancel one. You won't. But you really should."],
  Rent:          ["At least you have a roof. Just... maybe a cheaper roof?","Housing is expensive. Your landlord thanks you.","Rent's high but at least it's not coffee money. Oh wait."],
}

// ── STATE ─────────────────────────────────────────────────────
let txs         = []
let currentType = 'income'
let donutChart, barChart

// ── HELPERS ───────────────────────────────────────────────────
function fmt(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID') }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function getCatMeta(type, label) { return CATS[type].find(c => c.label === label) || { icon: '💸', color: '#888780' } }

function showToast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.remove('show'), 2200)
}

function setDbStatus(ok) {
  const el = document.getElementById('db-badge')
  if (ok) { el.textContent = '● connected'; el.className = 'db-badge' }
  else     { el.textContent = '● db error — check config.js'; el.className = 'db-badge error' }
}

// ── TYPE TOGGLE ───────────────────────────────────────────────
function setType(t) {
  currentType = t
  const sel = document.getElementById('tx-cat')
  sel.innerHTML = CATS[t].map(c => `<option value="${c.label}">${c.icon} ${c.label}</option>`).join('')
  document.getElementById('btn-income').className  = 'type-btn' + (t === 'income'  ? ' active-income'  : '')
  document.getElementById('btn-expense').className = 'type-btn' + (t === 'expense' ? ' active-expense' : '')
  document.getElementById('submit-btn').textContent = t === 'income' ? '+ Add Income' : '− Add Expense'
  document.getElementById('submit-btn').className   = 'submit-btn ' + (t === 'income' ? 'income-mode' : 'expense-mode')
}

// ── LOAD DATA ─────────────────────────────────────────────────
async function loadTxs() {
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { setDbStatus(false); console.error(error); return }
  setDbStatus(true)
  txs = data
  render()
}

// ── ADD TRANSACTION ───────────────────────────────────────────
async function addTx() {
  const desc = document.getElementById('tx-desc').value.trim()
  const amt  = parseFloat(document.getElementById('tx-amount').value)
  const cat  = document.getElementById('tx-cat').value
  if (!desc || !amt || amt <= 0) { showToast('Fill in all fields first!'); return }

  const { data, error } = await db
    .from('transactions')
    .insert([{ type: currentType, description: desc, amount: amt, category: cat }])
    .select()

  if (error) { showToast('Error: ' + error.message); return }

  document.getElementById('tx-desc').value   = ''
  document.getElementById('tx-amount').value = ''
  txs.unshift(data[0])
  showToast(currentType === 'income' ? '💰 Income added!' : '💸 Expense added!')
  render()
}

// ── DELETE TRANSACTION ────────────────────────────────────────
async function delTx(id) {
  if (!confirm('Delete this transaction?')) return

  const { error } = await db
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) { showToast('Error: ' + error.message); return }
  txs = txs.filter(t => t.id !== id)
  showToast('Transaction deleted')
  render()
}

// ── CLEAR ALL ─────────────────────────────────────────────────
async function clearAllData() {
  if (!confirm('Delete ALL transactions? This cannot be undone!')) return

  const { error } = await db
    .from('transactions')
    .delete()
    .neq('id', 0)   // delete everything

  if (error) { showToast('Error: ' + error.message); return }
  txs = []
  showToast('All data cleared')
  render()
}

// ── RENDER ────────────────────────────────────────────────────
function render() {
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const bal     = income - expense

  document.getElementById('total-income').textContent  = fmt(income)
  document.getElementById('total-expense').textContent = fmt(expense)
  const balEl = document.getElementById('balance')
  balEl.textContent = fmt(bal)
  balEl.className   = 'sum-val ' + (bal >= 0 ? 'purple' : 'danger')

  // Transaction list
  const listEl = document.getElementById('tx-list')
  if (txs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No transactions yet.<br>Add your first one! 👆</div>'
  } else {
    listEl.innerHTML = txs.map(t => {
      const m  = getCatMeta(t.type, t.category)
      const bg = t.type === 'income' ? '#EAF3DE' : '#FFF0F0'
      const d  = new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      return `<div class="tx-item">
        <div class="tx-cat-badge" style="background:${bg}">${m.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${esc(t.description)}</div>
          <div class="tx-meta">${t.category} · ${d}</div>
        </div>
        <div class="tx-amount ${t.type === 'income' ? 'inc' : 'exp'}">
          ${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}
        </div>
        <div class="tx-del" onclick="delTx('${t.id}')" title="Delete">×</div>
      </div>`
    }).join('')
  }

  // Category totals
  const expTxs    = txs.filter(t => t.type === 'expense')
  const catTotals = {}
  expTxs.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })
  const catKeys = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])

  if (donutChart) donutChart.destroy()
  if (barChart)   barChart.destroy()

  // Donut chart
  const ctx1 = document.getElementById('donut-chart').getContext('2d')
  if (catKeys.length > 0) {
    const colors = catKeys.map(k => getCatMeta('expense', k).color)
    donutChart = new Chart(ctx1, {
      type: 'doughnut',
      data: { labels: catKeys, datasets: [{ data: catKeys.map(k => Math.round(catTotals[k])), backgroundColor: colors, borderWidth: 3, borderColor: '#ffffff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const p = expense > 0 ? Math.round(c.parsed / expense * 100) : 0; return ` ${c.label}: ${fmt(c.parsed)} (${p}%)` } } } } }
    })
    document.getElementById('cat-legend').innerHTML = catKeys.map(k => {
      const m = getCatMeta('expense', k)
      const p = expense > 0 ? Math.round(catTotals[k] / expense * 100) : 0
      return `<span class="cat-item"><span class="cat-dot" style="background:${m.color}"></span>${m.icon} ${k} ${p}%</span>`
    }).join('')
  } else {
    donutChart = new Chart(ctx1, { type: 'doughnut', data: { labels: ['No expenses'], datasets: [{ data: [1], backgroundColor: ['#e0e0e0'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { enabled: false } } } })
    document.getElementById('cat-legend').innerHTML = ''
  }

  // Bar chart
  const ctx2 = document.getElementById('bar-chart').getContext('2d')
  barChart = new Chart(ctx2, {
    type: 'bar',
    data: { labels: ['Income', 'Expense'], datasets: [{ data: [Math.round(income), Math.round(expense)], backgroundColor: ['#639922', '#E24B4A'], borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.parsed)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#888', font: { size: 12 } } }, y: { grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: '#888', font: { size: 11 }, callback: v => 'Rp ' + Math.round(v / 1000) + 'k' } } } }
  })

  renderRoast(catTotals, expense, income)
}

// ── ROAST ENGINE ──────────────────────────────────────────────
function renderRoast(catTotals, expense, income) {
  const rb = document.getElementById('roast-box')
  const rt = document.getElementById('roast-text')
  const rs = document.getElementById('roast-sub')
  const ri = document.getElementById('roast-icon')

  const setStyle = (bg, border, tc, sc) => {
    rb.style.background = bg; rb.style.borderColor = border
    rt.style.color = tc; rs.style.color = sc
  }

  if (Object.keys(catTotals).length === 0) {
    ri.textContent = '🤖'
    rt.textContent = "Add some transactions and I'll roast your spending habits. Don't be shy 👀"
    rs.textContent = "financial honesty loading..."
    setStyle('#EEEDFE','#AFA9EC','#3C3489','#534AB7'); return
  }

  const topCat      = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0]
  const topPct      = expense > 0 ? Math.round(catTotals[topCat] / expense * 100) : 0
  const savingsRate = income  > 0 ? Math.round((income - expense) / income * 100) : 0
  const icon        = getCatMeta('expense', topCat).icon

  if (expense > income && income > 0) {
    ri.textContent = '😭'
    rt.textContent = "Spending more than you earn is not the 'treat yourself' era you think it is 💀"
    rs.textContent = `You're ${fmt(expense - income)} in the red. Maybe log off and reflect?`
    setStyle('#FCEBEB','#F09595','#791F1F','#A32D2D')
  } else if (savingsRate > 40) {
    ri.textContent = '🏆'
    rt.textContent = `Okay bestie, saving ${savingsRate}% of income? You're actually built different fr.`
    rs.textContent = `Income: ${fmt(income)} · Saved: ${fmt(income - expense)} · You ate AND left crumbs`
    setStyle('#EAF3DE','#97C459','#27500A','#3B6D11')
  } else if (topPct >= 50) {
    const pool = ROASTS[topCat] || [`${topPct}% of your money went to ${topCat}. No comment 💀`]
    ri.textContent = '💀'
    rt.textContent = pool[Math.floor(Math.random() * pool.length)]
    rs.textContent = `${icon} ${topPct}% of spending on ${topCat}. That's... a choice bestie.`
    setStyle('#FCEBEB','#F09595','#791F1F','#A32D2D')
  } else {
    ri.textContent = '👀'
    rt.textContent = `${icon} Most of your cash goes to ${topCat} (${topPct}%). Noted. No further comment.`
    rs.textContent = `Balance: ${fmt(income - expense)} · Savings rate: ${savingsRate}% · Could be worse, could be better`
    setStyle('#EEEDFE','#AFA9EC','#3C3489','#534AB7')
  }
}

// ── INIT ──────────────────────────────────────────────────────
const now = new Date()
document.getElementById('month-label').textContent =
  now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

setType('income')
loadTxs()
