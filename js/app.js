/* ============================================================
   STATE & CONFIG
   ============================================================ */
let appState = {
  incomes:  [],
  expenses: [],
  viewYear:  new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-indexed
  incomeFilter: 'all',
  expenseFilter: 'all',
  charts: {},
  incomeRecurring: false,
  expenseRecurring: false,
  expensePaid: true,
};

const EXPENSE_CATS_COLORS = {
  'Kira':       '#1b4f8a',
  'Fatura':     '#0891b2',
  'Market':     '#059669',
  'Ulaşım':     '#7c3aed',
  'Sağlık':     '#dc2626',
  'Eğitim':     '#d97706',
  'Eğlence':    '#ec4899',
  'Giyim':      '#14b8a6',
  'Teknoloji':  '#6366f1',
  'Abonelik':   '#f59e0b',
  'Sigorta':    '#64748b',
  'Diğer':      '#94a3b8',
};

const INCOME_CATS_COLORS = {
  'Maaş':           '#059669',
  'Serbest Meslek': '#0891b2',
  'Yatırım':        '#1b4f8a',
  'Kira Geliri':    '#7c3aed',
  'Satış':          '#d97706',
  'Diğer':          '#94a3b8',
};

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

/* ============================================================
   INIT
   ============================================================ */
window.initApp = async function(user) {
  updateUserUI(user);
  updateMonthLabel();
  setupRealtime(user.uid);
  checkAndGenerateRecurring(user.uid);
};

function updateUserUI(user) {
  const email = user.email || '';
  const name  = user.displayName || email.split('@')[0] || 'Kullanıcı';
  const initials = name.slice(0,2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = name;
  document.getElementById('userEmail').textContent = email;
}

function updateMonthLabel() {
  document.getElementById('currentMonthLabel').textContent =
    MONTHS_TR[appState.viewMonth] + ' ' + appState.viewYear;
}

/* ============================================================
   REALTIME DATA
   ============================================================ */
function setupRealtime(uid) {
  const { collection, query, where, onSnapshot } = window._firebase;
  const db = window._db;

  // Incomes — orderBy kaldırıldı (composite index gerektiriyordu)
  const incQ = query(collection(db,'incomes'), where('uid','==',uid));
  onSnapshot(incQ, (snap) => {
    appState.incomes = snap.docs.map(d => ({id:d.id, ...d.data()}));
    appState.incomes.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    refreshAll();
  }, (err) => {
    console.error('Incomes error:', err);
    showToast('Gelir verisi yüklenemedi: ' + err.message, 'error');
  });

  // Expenses — orderBy kaldırıldı
  const expQ = query(collection(db,'expenses'), where('uid','==',uid));
  onSnapshot(expQ, (snap) => {
    appState.expenses = snap.docs.map(d => ({id:d.id, ...d.data()}));
    appState.expenses.sort((a,b) => (b.dueDate||'').localeCompare(a.dueDate||''));
    refreshAll();
  }, (err) => {
    console.error('Expenses error:', err);
    showToast('Gider verisi yüklenemedi: ' + err.message, 'error');
  });
}

function refreshAll() {
  renderDashboard();
  renderIncomeList();
  renderExpenseList();
  renderAnalysis();
  renderReports();
  renderNotifications();
}

/* ============================================================
   FILTERING HELPERS
   ============================================================ */
function getMonthIncomesExpenses(year, month) {
  const pad = (n) => String(n).padStart(2,'0');
  const prefix = `${year}-${pad(month+1)}`;

  // Sadece o aya ait kayıtları göster
  // recurring:true olan şablon kayıtlar ayrıca filtrelenmiyor (her ayda kopyası oluşturuluyor)
  const incomes  = appState.incomes.filter(i => (i.date||'').startsWith(prefix));
  const expenses = appState.expenses.filter(e => (e.dueDate||'').startsWith(prefix));
  return { incomes, expenses };
}

function getCurrentMonthData() {
  return getMonthIncomesExpenses(appState.viewYear, appState.viewMonth);
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  const { incomes, expenses } = getCurrentMonthData();

  const totalIncome  = incomes.reduce((s,i) => s + (Number(i.amount)||0), 0);
  const totalExpense = expenses.reduce((s,e) => s + (Number(e.amount)||0), 0);
  const net          = totalIncome - totalExpense;
  const paidExpenses = expenses.filter(e => e.paid).reduce((s,e) => s+(Number(e.amount)||0),0);
  const unpaidExpenses = expenses.filter(e => !e.paid).reduce((s,e) => s+(Number(e.amount)||0),0);
  const today = new Date().toISOString().slice(0,10);
  const upcoming = expenses.filter(e => !e.paid && e.dueDate >= today).length;

  // Stats
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-card-income">
      <div class="stat-card-header">
        <div class="stat-card-icon icon-income">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
      </div>
      <div class="stat-card-label">Toplam Gelir</div>
      <div class="stat-card-value income-val">${fmt(totalIncome)}</div>
      <div class="stat-card-change"><span class="change-up">↑</span> ${incomes.length} işlem</div>
    </div>
    <div class="stat-card stat-card-expense">
      <div class="stat-card-header">
        <div class="stat-card-icon icon-expense">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
      </div>
      <div class="stat-card-label">Toplam Gider</div>
      <div class="stat-card-value expense-val">${fmt(totalExpense)}</div>
      <div class="stat-card-change"><span class="change-down">↓</span> ${expenses.length} işlem</div>
    </div>
    <div class="stat-card stat-card-net">
      <div class="stat-card-header">
        <div class="stat-card-icon icon-net">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <span class="${net>=0?'badge-kar':'badge-zarar'}">${net>=0?'Kâr':'Zarar'}</span>
      </div>
      <div class="stat-card-label">Net Durum</div>
      <div class="stat-card-value ${net>=0?'income-val':'expense-val'}">${net>=0?'+':''}${fmt(net)}</div>
      <div class="stat-card-change text-muted">Tasarruf: ${totalIncome>0?Math.round((net/totalIncome)*100):0}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon icon-paid">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div></div>
      <div class="stat-card-label">Ödenen</div>
      <div class="stat-card-value" style="color:var(--accent-teal)">${fmt(paidExpenses)}</div>
      <div class="stat-card-change text-muted">${expenses.filter(e=>e.paid).length} işlem tamamlandı</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon icon-unpaid">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div></div>
      <div class="stat-card-label">Kalan Ödemeler</div>
      <div class="stat-card-value" style="color:var(--accent-orange)">${fmt(unpaidExpenses)}</div>
      <div class="stat-card-change text-muted">${expenses.filter(e=>!e.paid).length} ödenmemiş</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon icon-upcoming">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div></div>
      <div class="stat-card-label">Yaklaşan Ödeme</div>
      <div class="stat-card-value" style="color:var(--accent-purple)">${upcoming}</div>
      <div class="stat-card-change text-muted">7 gün içinde</div>
    </div>
  `;

  // Recent transactions
  const allTx = [
    ...incomes.map(i => ({...i, type:'income'})),
    ...expenses.map(e => ({...e, type:'expense'}))
  ].sort((a,b) => {
    const da = a.date || a.dueDate || '';
    const db2 = b.date || b.dueDate || '';
    return db2.localeCompare(da);
  }).slice(0,8);

  const recentEl = document.getElementById('recentTransactions');
  if (!allTx.length) {
    recentEl.innerHTML = emptyState('Henüz işlem yok', 'Gelir veya gider ekleyin');
    return;
  }
  recentEl.innerHTML = allTx.map(tx => renderTxItem(tx)).join('');

  // Charts
  renderCharts(incomes, expenses);
}

function renderTxItem(tx) {
  const isIncome = tx.type === 'income';
  const emoji = getCatEmoji(tx.category, isIncome);
  const bgColor = isIncome ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)';
  const date = tx.date || tx.dueDate || '';
  const statusHtml = !isIncome ? getStatusBadge(tx) : '';
  const recBadge = tx.recurring ? `<span class="status-badge status-recurring">↻ Aylık</span>` : '';

  return `
    <div class="transaction-item">
      <div class="tx-icon" style="background:${bgColor}">${emoji}</div>
      <div class="tx-info">
        <div class="tx-name">${esc(tx.title)}</div>
        <div class="tx-meta">${esc(tx.category||'—')} · ${formatDate(date)}</div>
      </div>
      ${statusHtml}
      ${recBadge}
      <div class="tx-amount ${isIncome?'income':'expense'}">${isIncome?'+':'-'}${fmt(tx.amount)}</div>
      <div class="tx-actions">
        <button class="btn-action" onclick="editItem('${tx.type}','${tx.id}')" title="Düzenle">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${!isIncome && !tx.paid ? `<button class="btn-action" onclick="markPaid('${tx.id}')" title="Ödendi İşaretle">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </button>` : ''}
        <button class="btn-action danger" onclick="deleteItem('${tx.type}','${tx.id}')" title="Sil">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
}

function getStatusBadge(tx) {
  const today = new Date().toISOString().slice(0,10);
  if (tx.paid) return `<span class="status-badge status-paid">✓ Ödendi</span>`;
  if (tx.dueDate && tx.dueDate < today) return `<span class="status-badge status-overdue">⚠ Gecikmiş</span>`;
  if (tx.dueDate === today) return `<span class="status-badge status-today">⚡ Bugün</span>`;
  return `<span class="status-badge status-unpaid">○ Bekliyor</span>`;
}

/* ============================================================
   CHARTS
   ============================================================ */
function renderCharts(incomes, expenses) {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8baed4' : '#8a9bb0';

  Chart.defaults.font.family = "'Sora', sans-serif";
  Chart.defaults.font.size = 11;

  // --- Income vs Expense Bar Chart ---
  const incCatTotals = {};
  const expCatTotals = {};
  incomes.forEach(i => incCatTotals[i.category] = (incCatTotals[i.category]||0) + Number(i.amount||0));
  expenses.forEach(e => expCatTotals[e.category] = (expCatTotals[e.category]||0) + Number(e.amount||0));

  destroyChart('incomeExpenseChart');
  const ctx1 = document.getElementById('incomeExpenseChart').getContext('2d');
  appState.charts.ie = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Toplam Gelir', 'Toplam Gider'],
      datasets: [{
        data: [incomes.reduce((s,i)=>s+Number(i.amount||0),0), expenses.reduce((s,e)=>s+Number(e.amount||0),0)],
        backgroundColor: ['rgba(5,150,105,0.75)', 'rgba(220,38,38,0.7)'],
        borderColor: ['#059669','#dc2626'],
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ y:{ grid:{color:gridColor}, ticks:{color:textColor, callback:v=>'₺'+fmtShort(v)} }, x:{grid:{display:false},ticks:{color:textColor}} } }
  });

  // --- Category Pie Chart ---
  const catLabels = Object.keys(expCatTotals);
  const catValues = Object.values(expCatTotals);
  const catColors = catLabels.map(c => EXPENSE_CATS_COLORS[c] || '#94a3b8');

  destroyChart('categoryPieChart');
  const ctx2 = document.getElementById('categoryPieChart').getContext('2d');
  appState.charts.pie = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 0, spacing: 2, borderRadius: 4 }] },
    options: { responsive:true, maintainAspectRatio:false, cutout:'65%',
      plugins:{ legend:{ position:'right', labels:{ color:textColor, padding:10, boxWidth:10, font:{size:10} } } } }
  });

  // --- 6 Month Trend ---
  renderTrendChart(gridColor, textColor);
}

function renderTrendChart(gridColor, textColor) {
  const months = [];
  const incData = [], expData = [], netData = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(appState.viewYear, appState.viewMonth - i, 1);
    const { incomes, expenses } = getMonthIncomesExpenses(d.getFullYear(), d.getMonth());
    const inc = incomes.reduce((s,x)=>s+Number(x.amount||0),0);
    const exp = expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    months.push(MONTHS_TR[d.getMonth()].slice(0,3));
    incData.push(inc);
    expData.push(exp);
    netData.push(inc-exp);
  }

  destroyChart('trendChart');
  const ctx3 = document.getElementById('trendChart').getContext('2d');
  appState.charts.trend = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label:'Gelir',  data:incData, borderColor:'#059669', backgroundColor:'rgba(5,150,105,0.08)', borderWidth:2, tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#059669' },
        { label:'Gider',  data:expData, borderColor:'#dc2626', backgroundColor:'rgba(220,38,38,0.06)', borderWidth:2, tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#dc2626' },
        { label:'Net',    data:netData, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.06)', borderWidth:2, tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#2563eb', borderDash:[4,3] },
      ]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:textColor, usePointStyle:true, pointStyleWidth:8 } } },
      scales:{ y:{ grid:{color:gridColor}, ticks:{color:textColor,callback:v=>'₺'+fmtShort(v)} }, x:{grid:{display:false},ticks:{color:textColor}} } }
  });
}

function destroyChart(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

/* ============================================================
   INCOME LIST
   ============================================================ */
function renderIncomeList() {
  const { incomes } = getCurrentMonthData();
  const search = (document.getElementById('incomeSearchInput')?.value||'').toLowerCase();
  const filter = appState.incomeFilter;

  let list = incomes.filter(i => {
    if (search && !i.title?.toLowerCase().includes(search) && !i.category?.toLowerCase().includes(search)) return false;
    if (filter === 'one-time' && i.recurring) return false;
    if (filter === 'recurring' && !i.recurring) return false;
    return true;
  });

  const el = document.getElementById('incomeList');
  if (!list.length) { el.innerHTML = emptyState('Gelir bulunamadı', 'Yeni gelir ekleyin'); return; }
  el.innerHTML = list.map(i => renderTxItem({...i, type:'income'})).join('');
}

/* ============================================================
   EXPENSE LIST
   ============================================================ */
function renderExpenseList() {
  const { expenses } = getCurrentMonthData();
  const search = (document.getElementById('expenseSearchInput')?.value||'').toLowerCase();
  const filter = appState.expenseFilter;
  const today = new Date().toISOString().slice(0,10);

  let list = expenses.filter(e => {
    if (search && !e.title?.toLowerCase().includes(search) && !e.category?.toLowerCase().includes(search)) return false;
    if (filter === 'paid'      && !e.paid) return false;
    if (filter === 'unpaid'    && (e.paid || (e.dueDate && e.dueDate < today))) return false;
    if (filter === 'overdue'   && (e.paid || !e.dueDate || e.dueDate >= today)) return false;
    if (filter === 'recurring' && !e.recurring) return false;
    return true;
  });

  const el = document.getElementById('expenseList');
  if (!list.length) { el.innerHTML = emptyState('Gider bulunamadı', 'Yeni gider ekleyin'); return; }
  el.innerHTML = list.map(e => renderTxItem({...e, type:'expense'})).join('');
}

/* ============================================================
   ANALYSIS
   ============================================================ */
function renderAnalysis() {
  const { incomes, expenses } = getCurrentMonthData();
  const totalInc = incomes.reduce((s,i)=>s+Number(i.amount||0),0);
  const totalExp = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const net = totalInc - totalExp;
  const savingsRate = totalInc > 0 ? Math.round((net/totalInc)*100) : 0;

  // Previous month
  let prevMonth = appState.viewMonth - 1;
  let prevYear  = appState.viewYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  const { incomes:pInc, expenses:pExp } = getMonthIncomesExpenses(prevYear, prevMonth);
  const pNet = pInc.reduce((s,i)=>s+Number(i.amount||0),0) - pExp.reduce((s,e)=>s+Number(e.amount||0),0);
  const netChange = pNet !== 0 ? Math.round(((net - pNet)/Math.abs(pNet))*100) : 0;

  // Top category
  const catTotals = {};
  expenses.forEach(e => catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount||0));
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('analysisCards').innerHTML = `
    <div class="analysis-card">
      <div class="analysis-card-label">Aylık Net Kâr/Zarar</div>
      <div class="analysis-card-value ${net>=0?'text-green':'text-red'}">${net>=0?'+':''}${fmt(net)}</div>
      <div class="analysis-card-detail">Geçen aya göre: <span class="${netChange>=0?'text-green':'text-red'}">${netChange>=0?'+':''}${netChange}%</span></div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-label">Tasarruf Oranı</div>
      <div class="analysis-card-value">${savingsRate}%</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,savingsRate))}%"></div></div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-label">Toplam Gelir</div>
      <div class="analysis-card-value text-green">${fmt(totalInc)}</div>
      <div class="analysis-card-detail">${incomes.length} kayıt</div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-label">Toplam Gider</div>
      <div class="analysis-card-value text-red">${fmt(totalExp)}</div>
      <div class="analysis-card-detail">${expenses.length} kayıt</div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-label">En Yüksek Harcama</div>
      <div class="analysis-card-value" style="font-size:16px">${topCat ? topCat[0] : '—'}</div>
      <div class="analysis-card-detail">${topCat ? fmt(topCat[1]) : 'Veri yok'}</div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-label">Gider/Gelir Oranı</div>
      <div class="analysis-card-value">${totalInc>0?Math.round((totalExp/totalInc)*100):0}%</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,totalInc>0?(totalExp/totalInc)*100:0)}%;background:linear-gradient(90deg,#059669,#dc2626)"></div></div>
    </div>
  `;

  // Analysis charts
  const isDark = document.documentElement.dataset.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8baed4' : '#8a9bb0';

  // Net trend
  const months = [];
  const netData = [];
  for (let i=5; i>=0; i--) {
    let d = new Date(appState.viewYear, appState.viewMonth-i, 1);
    const {incomes:mi, expenses:me} = getMonthIncomesExpenses(d.getFullYear(), d.getMonth());
    months.push(MONTHS_TR[d.getMonth()].slice(0,3));
    netData.push(mi.reduce((s,x)=>s+Number(x.amount||0),0)-me.reduce((s,x)=>s+Number(x.amount||0),0));
  }
  destroyChart('netTrendChart');
  const ctx = document.getElementById('netTrendChart').getContext('2d');
  new Chart(ctx, {
    type:'bar',
    data:{ labels:months, datasets:[{ data:netData, backgroundColor:netData.map(v=>v>=0?'rgba(5,150,105,0.7)':'rgba(220,38,38,0.7)'), borderRadius:6, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ y:{ grid:{color:gridColor}, ticks:{color:textColor,callback:v=>'₺'+fmtShort(v)} }, x:{grid:{display:false},ticks:{color:textColor}} } }
  });

  // Income pie
  const incCats = {};
  incomes.forEach(i => incCats[i.category]=(incCats[i.category]||0)+Number(i.amount||0));
  destroyChart('incomePieChart');
  const ctx2 = document.getElementById('incomePieChart').getContext('2d');
  new Chart(ctx2, {
    type:'doughnut',
    data:{ labels:Object.keys(incCats), datasets:[{ data:Object.values(incCats), backgroundColor:Object.keys(incCats).map(c=>INCOME_CATS_COLORS[c]||'#94a3b8'), borderWidth:0, spacing:2, borderRadius:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{legend:{position:'right',labels:{color:textColor,padding:10,boxWidth:10,font:{size:10}}}} }
  });

  // Top categories bars
  const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxVal = sorted[0]?.[1] || 1;
  document.getElementById('topCategoriesBar').innerHTML = sorted.map(([cat,val]) => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${getCatEmoji(cat,false)} ${cat}</span>
        <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--accent-red)">${fmt(val)}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round((val/maxVal)*100)}%;background:${EXPENSE_CATS_COLORS[cat]||'#94a3b8'}"></div></div>
    </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">Henüz gider verisi yok</p>';
}

/* ============================================================
   REPORTS
   ============================================================ */
function renderReports() {
  const { incomes, expenses } = getCurrentMonthData();
  const totalInc = incomes.reduce((s,i)=>s+Number(i.amount||0),0);
  const totalExp = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const net = totalInc - totalExp;

  document.getElementById('reportSummary').innerHTML = `
    <h3 style="margin-bottom:16px;font-size:15px;font-weight:700;color:var(--text-primary)">
      ${MONTHS_TR[appState.viewMonth]} ${appState.viewYear} — Özet Rapor
    </h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="padding:16px;background:var(--bg-input);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-muted);margin-bottom:4px">Gelir</div>
        <div style="font-size:20px;font-weight:700;color:var(--accent-green);font-family:'DM Mono',monospace">${fmt(totalInc)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${incomes.length} işlem</div>
      </div>
      <div style="padding:16px;background:var(--bg-input);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-muted);margin-bottom:4px">Gider</div>
        <div style="font-size:20px;font-weight:700;color:var(--accent-red);font-family:'DM Mono',monospace">${fmt(totalExp)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${expenses.length} işlem</div>
      </div>
      <div style="padding:16px;background:var(--bg-input);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-muted);margin-bottom:4px">Net</div>
        <div style="font-size:20px;font-weight:700;color:${net>=0?'var(--accent-green)':'var(--accent-red)'};font-family:'DM Mono',monospace">${net>=0?'+':''}${fmt(net)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${net>=0?'Kâr':'Zarar'} durumu</div>
      </div>
    </div>
    <p style="font-size:12px;color:var(--text-muted)">Detaylı raporu PDF veya Excel olarak indirmek için yukarıdaki butonları kullanın.</p>
  `;
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function renderNotifications() {
  const { expenses } = getCurrentMonthData();
  const today = new Date().toISOString().slice(0,10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7str = in7.toISOString().slice(0,10);

  const notifs = [];
  expenses.forEach(e => {
    if (!e.paid) {
      if (e.dueDate && e.dueDate < today) notifs.push({ text: `${e.title} ödemesi gecikmiş!`, color: '#dc2626', time: formatDate(e.dueDate) });
      else if (e.dueDate === today) notifs.push({ text: `${e.title} bugün son gün!`, color: '#d97706', time: 'Bugün' });
      else if (e.dueDate && e.dueDate <= in7str) notifs.push({ text: `${e.title} — ${formatDate(e.dueDate)} tarihinde ödeme`, color: '#7c3aed', time: formatDate(e.dueDate) });
    }
  });

  const el = document.getElementById('notifList');
  document.getElementById('notifDot').style.display = notifs.length ? 'block' : 'none';

  if (!notifs.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-muted)">Bekleyen bildirim yok ✓</div>';
    return;
  }

  el.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <div class="notif-dot-indicator" style="background:${n.color}"></div>
      <div>
        <div class="notif-text">${esc(n.text)}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`).join('');
}

/* ============================================================
   CRUD — INCOME
   ============================================================ */
function openModal(type, item=null) {
  if (type === 'income') {
    document.getElementById('incomModalTitle').textContent = item ? 'Geliri Düzenle' : 'Gelir Ekle';
    document.getElementById('incomeEditId').value = item?.id || '';
    document.getElementById('incomeTitle').value = item?.title || '';
    document.getElementById('incomeAmount').value = item?.amount || '';
    document.getElementById('incomeCategory').value = item?.category || 'Maaş';
    document.getElementById('incomeDate').value = item?.date || new Date().toISOString().slice(0,10);
    document.getElementById('incomeDesc').value = item?.description || '';
    appState.incomeRecurring = item?.recurring || false;
    updateToggle('incomRecurOff', 'incomRecurOn', !appState.incomeRecurring);
    document.getElementById('incomeModal').classList.add('open');
  } else {
    document.getElementById('expenseModalTitle').textContent = item ? 'Gideri Düzenle' : 'Gider Ekle';
    document.getElementById('expenseEditId').value = item?.id || '';
    document.getElementById('expenseTitle').value = item?.title || '';
    document.getElementById('expenseAmount').value = item?.amount || '';
    document.getElementById('expenseCategory').value = item?.category || 'Kira';
    document.getElementById('expenseDueDate').value = item?.dueDate || new Date().toISOString().slice(0,10);
    document.getElementById('expenseDesc').value = item?.description || '';
    appState.expenseRecurring = item?.recurring || false;
    appState.expensePaid = item?.paid !== undefined ? item.paid : true;
    updateToggle('expRecurOff','expRecurOn', !appState.expenseRecurring);
    updateToggle('expPaidOff','expPaidOn', appState.expensePaid);
    document.getElementById('expenseModal').classList.add('open');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function setIncomeRecur(v) {
  appState.incomeRecurring = v;
  updateToggle('incomRecurOff','incomRecurOn', !v);
}
function setExpenseRecur(v) {
  appState.expenseRecurring = v;
  updateToggle('expRecurOff','expRecurOn', !v);
}
function setExpensePaid(v) {
  appState.expensePaid = v;
  updateToggle('expPaidOff','expPaidOn', v);
}
function updateToggle(offId, onId, isOff) {
  document.getElementById(offId).classList.toggle('active', isOff);
  document.getElementById(onId).classList.toggle('active', !isOff);
}

async function saveIncome() {
  const title  = document.getElementById('incomeTitle').value.trim();
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const cat    = document.getElementById('incomeCategory').value;
  const date   = document.getElementById('incomeDate').value;
  const desc   = document.getElementById('incomeDesc').value.trim();
  const editId = document.getElementById('incomeEditId').value;

  if (!title) { showToast('Başlık zorunludur', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Geçerli bir tutar girin', 'error'); return; }

  const uid = window._currentUser?.uid;
  if (!uid) { showToast('Oturum bulunamadı, tekrar giriş yapın', 'error'); return; }

  const data = { title, amount, category:cat, date, description:desc, recurring:appState.incomeRecurring, uid, updatedAt: new Date().toISOString() };

  try {
    const db = window._db;
    const { collection, addDoc, doc, updateDoc } = window._firebase;
    if (editId) {
      await updateDoc(doc(db,'incomes',editId), data);
      showToast('Gelir güncellendi ✓', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      const ref = await addDoc(collection(db,'incomes'), data);
      console.log('Gelir eklendi:', ref.id);
      showToast('Gelir eklendi ✓', 'success');
    }
    closeModal('incomeModal');
  } catch(e) {
    console.error('saveIncome error:', e);
    showToast('Hata: ' + e.message, 'error');
  }
}

async function saveExpense() {
  const title   = document.getElementById('expenseTitle').value.trim();
  const amount  = parseFloat(document.getElementById('expenseAmount').value);
  const cat     = document.getElementById('expenseCategory').value;
  const dueDate = document.getElementById('expenseDueDate').value;
  const desc    = document.getElementById('expenseDesc').value.trim();
  const editId  = document.getElementById('expenseEditId').value;

  if (!title) { showToast('Başlık zorunludur', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Geçerli bir tutar girin', 'error'); return; }

  const uid = window._currentUser?.uid;
  if (!uid) { showToast('Oturum bulunamadı, tekrar giriş yapın', 'error'); return; }

  const data = { title, amount, category:cat, dueDate, description:desc, recurring:appState.expenseRecurring, paid:appState.expensePaid, uid, updatedAt: new Date().toISOString() };

  try {
    const db = window._db;
    const { collection, addDoc, doc, updateDoc } = window._firebase;
    if (editId) {
      await updateDoc(doc(db,'expenses',editId), data);
      showToast('Gider güncellendi ✓', 'success');
    } else {
      data.createdAt = new Date().toISOString();
      const ref = await addDoc(collection(db,'expenses'), data);
      console.log('Gider eklendi:', ref.id);
      showToast('Gider eklendi ✓', 'success');
    }
    closeModal('expenseModal');
  } catch(e) {
    console.error('saveExpense error:', e);
    showToast('Hata: '+e.message, 'error');
  }
}

async function deleteItem(type, id) {
  if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
  try {
    const { doc, deleteDoc } = window._firebase;
    await deleteDoc(doc(window._db, type==='income'?'incomes':'expenses', id));
    showToast('Kayıt silindi', 'success');
  } catch(e) { showToast('Hata: '+e.message, 'error'); }
}

async function markPaid(id) {
  try {
    const { doc, updateDoc } = window._firebase;
    await updateDoc(doc(window._db,'expenses',id), { paid:true, updatedAt: new Date().toISOString() });
    showToast('Ödendi olarak işaretlendi', 'success');
  } catch(e) { showToast('Hata: '+e.message, 'error'); }
}

function editItem(type, id) {
  const list = type==='income' ? appState.incomes : appState.expenses;
  const item = list.find(x => x.id === id);
  if (item) openModal(type, item);
}

/* ============================================================
   RECURRING — Auto generate for current month
   ============================================================ */
async function checkAndGenerateRecurring(uid) {
  // Check if we already generated for this month
  const key = `ft_recurring_${uid}_${appState.viewYear}_${appState.viewMonth}`;
  if (localStorage.getItem(key)) return;

  const pad = n => String(n).padStart(2,'0');
  const monthPrefix = `${appState.viewYear}-${pad(appState.viewMonth+1)}`;

  try {
    const { collection, addDoc } = window._firebase;
    const db = window._db;

    // Get all recurring incomes not yet in this month
    const recurInc = appState.incomes.filter(i => i.recurring);
    for (const ri of recurInc) {
      const alreadyExists = appState.incomes.some(x => x.title===ri.title && !x.recurring && (x.date||'').startsWith(monthPrefix));
      if (!alreadyExists) {
        await addDoc(collection(db,'incomes'), {
          ...ri, id:undefined, date:`${monthPrefix}-01`, recurring:false,
          createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
          generatedFromRecurring: true
        });
      }
    }

    // Get all recurring expenses
    const recurExp = appState.expenses.filter(e => e.recurring);
    for (const re of recurExp) {
      const alreadyExists = appState.expenses.some(x => x.title===re.title && !x.recurring && (x.dueDate||'').startsWith(monthPrefix));
      if (!alreadyExists) {
        const day = re.dueDate ? re.dueDate.slice(8,10) : '01';
        await addDoc(collection(db,'expenses'), {
          ...re, id:undefined, dueDate:`${monthPrefix}-${day}`, recurring:false, paid:false,
          createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
          generatedFromRecurring: true
        });
      }
    }

    localStorage.setItem(key,'1');
  } catch(e) { console.warn('Recurring gen error:', e); }
}

/* ============================================================
   AUTH ACTIONS
   ============================================================ */
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const btn   = document.getElementById('loginBtn');
  const txt   = document.getElementById('loginBtnText');

  if (!email || !pass) { showLoginAlert('E-posta ve şifre zorunludur','error'); return; }
  btn.disabled = true;
  txt.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const { signInWithEmailAndPassword } = window._firebase;
    await signInWithEmailAndPassword(window._auth, email, pass);
  } catch(e) {
    showLoginAlert(getAuthError(e.code), 'error');
    btn.disabled = false;
    txt.textContent = 'Giriş Yap';
  }
}

async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  const btn   = document.getElementById('regBtn');
  const txt   = document.getElementById('regBtnText');

  if (!name || !email || !pass) { showLoginAlert('Tüm alanlar zorunludur','error'); return; }
  if (pass.length < 6) { showLoginAlert('Şifre en az 6 karakter olmalıdır','error'); return; }
  btn.disabled = true;
  txt.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const { createUserWithEmailAndPassword } = window._firebase;
    await createUserWithEmailAndPassword(window._auth, email, pass);
    showLoginAlert('Hesap oluşturuldu! Giriş yapılıyor...','success');
  } catch(e) {
    showLoginAlert(getAuthError(e.code), 'error');
    btn.disabled = false;
    txt.textContent = 'Hesap Oluştur';
  }
}

async function showForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { showLoginAlert('Şifre sıfırlama için e-posta adresinizi girin','error'); return; }
  try {
    const { sendPasswordResetEmail } = window._firebase;
    await sendPasswordResetEmail(window._auth, email);
    showLoginAlert('Şifre sıfırlama e-postası gönderildi','success');
  } catch(e) { showLoginAlert(getAuthError(e.code),'error'); }
}

async function doLogout() {
  const { signOut } = window._firebase;
  await signOut(window._auth);
}

function getAuthError(code) {
  const map = {
    'auth/invalid-email':        'Geçersiz e-posta adresi',
    'auth/user-not-found':       'Bu e-posta ile kayıtlı hesap bulunamadı',
    'auth/wrong-password':       'Şifre hatalı',
    'auth/email-already-in-use': 'Bu e-posta zaten kullanımda',
    'auth/weak-password':        'Şifre çok zayıf',
    'auth/too-many-requests':    'Çok fazla deneme. Lütfen bekleyin',
    'auth/invalid-credential':   'E-posta veya şifre hatalı',
  };
  return map[code] || 'Bir hata oluştu: ' + code;
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(page+'Page').classList.add('active');
  document.querySelector(`.nav-item[onclick="navigateTo('${page}')"]`)?.classList.add('active');

  const titles = { dashboard:'Dashboard', income:'Gelir Yönetimi', expenses:'Gider Yönetimi', analysis:'Akıllı Analiz', reports:'Raporlar' };
  const subs   = { dashboard:'Finansal Özet', income:'Gelir Kayıtları', expenses:'Gider Kayıtları', analysis:'Detaylı Analiz', reports:'İndir & Paylaş' };
  document.getElementById('pageTitle').textContent = titles[page]||page;
  document.getElementById('pageSubtitle').textContent = subs[page]||'';

  if (window.innerWidth < 768) toggleSidebar(false);
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.contains('open');
  const newState = force !== undefined ? force : !isOpen;
  sidebar.classList.toggle('open', newState);
  overlay.classList.toggle('open', newState);
}

function toggleDark() {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  document.getElementById('darkIcon').innerHTML = isDark
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  // Re-render charts with new theme colors
  setTimeout(() => refreshAll(), 100);
}

function toggleNotifPanel() {
  document.getElementById('notifPanel').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const toggle = document.getElementById('notifToggle');
  if (panel.classList.contains('open') && !panel.contains(e.target) && !toggle.contains(e.target)) {
    panel.classList.remove('open');
  }
});

function prevMonth() {
  if (appState.viewMonth === 0) { appState.viewMonth = 11; appState.viewYear--; }
  else appState.viewMonth--;
  updateMonthLabel();
  refreshAll();
}

function nextMonth() {
  if (appState.viewMonth === 11) { appState.viewMonth = 0; appState.viewYear++; }
  else appState.viewMonth++;
  updateMonthLabel();
  refreshAll();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById('loginForm').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab==='register' ? 'block' : 'none';
  clearLoginAlert();
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  const hide = inp.type === 'text';
  btn.innerHTML = hide
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

function showLoginAlert(msg, type) {
  const el = document.getElementById('loginAlert');
  el.textContent = msg;
  el.className = `alert show alert-${type}`;
}

function clearLoginAlert() {
  document.getElementById('loginAlert').className = 'alert';
}

function setFilter(el, type) {
  const row = el.closest('.filter-row');
  row.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  if (type === 'income') appState.incomeFilter = el.dataset.filter;
  else appState.expenseFilter = el.dataset.filter;
  type === 'income' ? renderIncomeList() : renderExpenseList();
}

function filterTransactions(type) {
  type === 'income' ? renderIncomeList() : renderExpenseList();
}

function showToast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type==='success'?'✓':type==='error'?'✕':'⚠'}</span> ${esc(msg)}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),300); }, 3000);
}

/* ============================================================
   EXPORT
   ============================================================ */
function exportExcel(type) {
  let data = [];
  if (type === 'income' || type === 'all') {
    data = data.concat(appState.incomes.map(i => ({
      Tür:'Gelir', Başlık:i.title, Tutar:i.amount, Kategori:i.category,
      Tarih:i.date, Tekrarlı:i.recurring?'Evet':'Hayır', Açıklama:i.description||''
    })));
  }
  if (type === 'expense' || type === 'all') {
    data = data.concat(appState.expenses.map(e => ({
      Tür:'Gider', Başlık:e.title, Tutar:e.amount, Kategori:e.category,
      'Son Ödeme':e.dueDate, Ödendi:e.paid?'Evet':'Hayır', Tekrarlı:e.recurring?'Evet':'Hayır', Açıklama:e.description||''
    })));
  }
  if (!data.length) { showToast('Dışa aktarılacak veri yok','warning'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Finans Takip');
  XLSX.writeFile(wb, `finans-takip-${MONTHS_TR[appState.viewMonth]}-${appState.viewYear}.xlsx`);
  showToast('Excel indirildi', 'success');
}

function exportPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { incomes, expenses } = getCurrentMonthData();
    const totalInc = incomes.reduce((s,i)=>s+Number(i.amount||0),0);
    const totalExp = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const net = totalInc - totalExp;

    doc.setFont('helvetica','bold');
    doc.setFontSize(18);
    doc.text('FINANS TAKIP RAPORU', 20, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica','normal');
    doc.text(`${MONTHS_TR[appState.viewMonth]} ${appState.viewYear}`, 20, 30);
    doc.text(`Olusturulma: ${new Date().toLocaleDateString('tr-TR')}`, 20, 38);

    doc.line(20, 42, 190, 42);

    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('OZET', 20, 50);
    doc.setFont('helvetica','normal');
    doc.text(`Toplam Gelir: ${fmt(totalInc)}`, 20, 58);
    doc.text(`Toplam Gider: ${fmt(totalExp)}`, 20, 65);
    doc.setFont('helvetica','bold');
    doc.text(`Net Durum: ${net>=0?'+':''}${fmt(net)} (${net>=0?'KAR':'ZARAR'})`, 20, 72);

    doc.line(20, 78, 190, 78);

    let y = 86;
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('GELIRLER', 20, y); y += 8;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    incomes.forEach(i => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i.title}  |  ${i.category}  |  ${fmt(i.amount)}  |  ${i.date}`, 20, y); y += 7;
    });

    y += 4;
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('GIDERLER', 20, y); y += 8;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    expenses.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${e.title}  |  ${e.category}  |  ${fmt(e.amount)}  |  ${e.paid?'Odendi':'Bekliyor'}`, 20, y); y += 7;
    });

    doc.save(`finans-rapor-${MONTHS_TR[appState.viewMonth]}-${appState.viewYear}.pdf`);
    showToast('PDF indirildi', 'success');
  } catch(e) { showToast('PDF oluşturma hatası: '+e.message, 'error'); }
}

/* ============================================================
   UTILITY
   ============================================================ */
function fmt(n) {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', minimumFractionDigits:0, maximumFractionDigits:0 }).format(Number(n)||0);
}

function fmtShort(n) {
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(0)+'K';
  return String(Math.round(n));
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' });
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function emptyState(title, desc) {
  return `<div class="empty-state">
    <div class="empty-state-icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
    </div>
    <div class="empty-state-title">${title}</div>
    <div class="empty-state-desc">${desc}</div>
  </div>`;
}

function getCatEmoji(cat, isIncome) {
  const map = {
    'Maaş':'💼','Serbest Meslek':'💻','Yatırım':'📈','Kira Geliri':'🏠','Satış':'🛒',
    'Kira':'🏢','Fatura':'⚡','Market':'🛍','Ulaşım':'🚗','Sağlık':'💊','Eğitim':'📚',
    'Eğlence':'🎭','Giyim':'👔','Teknoloji':'💻','Abonelik':'📱','Sigorta':'🛡','Diğer':'📦'
  };
  return map[cat] || (isIncome ? '💰' : '💸');
}

// Set default dates on page load
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().slice(0,10);
  const el1 = document.getElementById('incomeDate');
  const el2 = document.getElementById('expenseDueDate');
  if (el1) el1.value = today;
  if (el2) el2.value = today;
});
