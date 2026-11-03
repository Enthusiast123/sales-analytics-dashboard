/**
 * OmniSales Analytics Dashboard
 * Vanilla JavaScript implementation
 * Storage: HTML5 localStorage
 * Styling: Zero CSS variables
 */

(function () {
  'use strict';

  // Storage key
  const STORAGE_KEY = 'omnisales_transactions_store_v1';
  const MONTHLY_TARGET = 120000; // $120,000 monthly quota

  // Application State
  const state = {
    transactions: [],
    timeframe: '30d',
    timelineMetric: 'revenue', // 'revenue' or 'orders'
    searchQuery: '',
    categoryFilter: 'all',
    statusFilter: 'all',
    sortBy: 'date-desc',
    currentPage: 1,
    pageSize: 8,
    charts: {
      timeline: null,
      category: null,
      channels: null,
      payment: null
    }
  };

  // Color constants (strictly direct colors - NO CSS variables used)
  const COLORS = {
    primary: '#2563eb',
    primaryAlpha: 'rgba(37, 99, 235, 0.15)',
    primaryDark: '#1d4ed8',
    success: '#059669',
    successAlpha: 'rgba(5, 150, 105, 0.15)',
    warning: '#d97706',
    danger: '#dc2626',
    purple: '#7c3aed',
    pink: '#db2777',
    cyan: '#0891b2',
    slateGrid: '#e2e8f0',
    slateText: '#64748b',
    slateDark: '#0f172a'
  };

  // --- Initial Mock Data Generator ---
  function generateSeedData() {
    const categories = ['Enterprise SaaS', 'Cloud Storage', 'Hardware', 'Consulting', 'Maintenance'];
    const paymentMethods = ['Stripe', 'Wire Transfer', 'PayPal', 'ACH'];
    const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Refunded'];
    
    const customers = [
      { name: 'Acme Corporation', email: 'billing@acmecorp.com' },
      { name: 'Sarah Jenkins', email: 's.jenkins@vanguard.io' },
      { name: 'Apex Logic Inc', email: 'finance@apexlogic.net' },
      { name: 'David Hoffman', email: 'david.h@fintechhub.co' },
      { name: 'Quantum Leap Labs', email: 'ops@quantumleap.tech' },
      { name: 'Elena Rostova', email: 'elena@novasystems.de' },
      { name: 'BluePeak Media', email: 'accounts@bluepeak.org' },
      { name: 'Marcus Chen', email: 'chen.m@synergycloud.io' },
      { name: 'Vertex Global Corp', email: 'purchasing@vertexglobal.com' },
      { name: 'Sophia Alverez', email: 'sophia@strataflow.co' },
      { name: 'Horizon Dynamics', email: 'info@horizondynamics.com' },
      { name: 'Lucas Wright', email: 'lucas@cybercraft.io' },
      { name: 'OmniSecure Security', email: 'sec@omnisecure.com' },
      { name: 'Kavita Patel', email: 'k.patel@datapulse.in' },
      { name: 'Silverstone Partners', email: 'finance@silverstone.uk' },
      { name: 'Oliver Twist Logistics', email: 'admin@twistlogistics.com' }
    ];

    const catalog = [
      { product: 'Enterprise Cloud Suite', category: 'Enterprise SaaS', price: 4800 },
      { product: 'Managed Kubernetes Cluster', category: 'Cloud Storage', price: 2400 },
      { product: 'Dedicated AI Inference Server', category: 'Hardware', price: 6200 },
      { product: 'Cybersecurity Threat Audit', category: 'Consulting', price: 5500 },
      { product: 'Annual 24/7 SLA Agreement', category: 'Maintenance', price: 3200 },
      { product: 'Team Collaboration Tier (100 seats)', category: 'Enterprise SaaS', price: 1500 },
      { product: 'High-Throughput NVMe SAN', category: 'Hardware', price: 7800 },
      { product: 'Hybrid Cloud Migration', category: 'Consulting', price: 8900 },
      { product: 'Encrypted Multi-Region Backup', category: 'Cloud Storage', price: 1100 },
      { product: 'Priority Hardware Replacement', category: 'Maintenance', price: 950 },
      { product: 'Single Sign-On (SSO) Add-on', category: 'Enterprise SaaS', price: 750 },
      { product: 'Custom API Gateway Setup', category: 'Consulting', price: 3400 }
    ];

    const records = [];
    const now = new Date();
    let invCounter = 1001;

    // Generate ~45 realistic transactions over past 85 days
    for (let i = 0; i < 48; i++) {
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.4) * 85);
      const itemDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const productObj = catalog[Math.floor(Math.random() * catalog.length)];
      const variance = (Math.random() * 0.3 - 0.15); // +/- 15% variation
      const amount = Math.round((productObj.price * (1 + variance)) * 100) / 100;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      records.push({
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        invoiceNumber: `INV-${itemDate.getFullYear()}-${invCounter++}`,
        customer: customer.name,
        email: customer.email,
        product: productObj.product,
        category: productObj.category,
        amount: amount,
        date: itemDate.toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        status: status
      });
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return records;
  }

  // --- Persistence Helpers ---
  function loadTransactions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse storage data:', err);
    }
    // Seed and persist if not found
    const freshData = generateSeedData();
    saveTransactions(freshData);
    return freshData;
  }

  function saveTransactions(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      showToast('Local storage limit exceeded or blocked.', 'danger');
    }
  }

  // --- Timeframe Filter Logic ---
  function filterByTimeframe(data, timeframe) {
    if (timeframe === 'all') return [...data];

    const now = new Date();
    // Normalize to start of today in local time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return data.filter(item => {
      const itemDate = new Date(item.date + 'T00:00:00');
      const diffTime = startOfToday.getTime() - itemDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (timeframe === 'today') {
        return diffDays === 0;
      }
      if (timeframe === '7d') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeframe === '30d') {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (timeframe === '90d') {
        return diffDays >= 0 && diffDays <= 90;
      }
      if (timeframe === 'this_year') {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  // Format currency
  function formatMoney(num) {
    return '$' + Number(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // --- KPI Updates ---
  function updateKPIs(filteredData) {
    let grossRevenue = 0;
    let netRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let refundsTotal = 0;

    filteredData.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.status === 'Completed') {
        grossRevenue += amt;
        netRevenue += amt;
        completedCount++;
      } else if (item.status === 'Pending') {
        grossRevenue += amt;
        pendingCount++;
      } else if (item.status === 'Refunded') {
        refundedCount++;
        refundsTotal += amt;
      }
    });

    const totalOrders = filteredData.length;
    const avgOrderValue = completedCount > 0 ? (netRevenue / completedCount) : 0;
    const fulfillmentRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;
    const refundRate = (grossRevenue + refundsTotal) > 0 
      ? ((refundsTotal / (grossRevenue + refundsTotal)) * 100).toFixed(1) 
      : '0.0';

    // Update DOM KPI elements
    document.getElementById('kpiGrossRevenue').textContent = formatMoney(grossRevenue);
    document.getElementById('kpiNetRevenue').textContent = formatMoney(netRevenue);
    document.getElementById('kpiTotalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('kpiAvgOrderValue').textContent = formatMoney(avgOrderValue);
    document.getElementById('kpiRefundsTotal').textContent = formatMoney(refundsTotal);

    // Subtext indicators
    document.getElementById('kpiNetMarginText').textContent = `${fulfillmentRate}%`;
    document.getElementById('kpiPendingText').textContent = `${pendingCount} pending`;
    document.getElementById('kpiRefundRate').textContent = `${refundRate}%`;

    // Monthly quota ribbon
    const quotaPct = Math.min(100, Math.round((netRevenue / MONTHLY_TARGET) * 100));
    document.getElementById('quotaDetails').textContent = `Current: ${formatMoney(netRevenue)} / Goal: ${formatMoney(MONTHLY_TARGET)}`;
    document.getElementById('quotaPercent').textContent = `${quotaPct}%`;
    document.getElementById('quotaProgressBar').style.width = `${quotaPct}%`;

    // Timeframe banner subtitle
    const timeframeNames = {
      all: 'All Time Historical Data',
      today: "Today's Live Performance",
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days (Trailing)',
      '90d': 'Last 90 Days (Quarterly)',
      this_year: `Calendar Year ${new Date().getFullYear()}`
    };
    document.getElementById('timeframeDescription').textContent = 
      `Displaying performance metrics for ${timeframeNames[state.timeframe] || state.timeframe}`;
  }

  // --- Charts Management (Chart.js) ---
  function renderTimelineChart(filteredData) {
    const canvas = document.getElementById('revenueTimelineChart');
    if (!canvas) return;

    if (state.charts.timeline) {
      state.charts.timeline.destroy();
    }

    // Group sales by date
    const dateMap = {};
    
    // Sort chronological
    const sorted = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(item => {
      const d = item.date;
      if (!dateMap[d]) {
        dateMap[d] = { revenue: 0, orders: 0 };
      }
      if (item.status === 'Completed' || item.status === 'Pending') {
        dateMap[d].revenue += Number(item.amount) || 0;
      }
      dateMap[d].orders += 1;
    });

    const labels = Object.keys(dateMap);
    const revenueValues = labels.map(l => Math.round(dateMap[l].revenue));
    const orderValues = labels.map(l => dateMap[l].orders);

    const isRevenue = state.timelineMetric === 'revenue';
    const activeValues = isRevenue ? revenueValues : orderValues;
    const activeLabel = isRevenue ? 'Gross Revenue ($)' : 'Order Volume (Units)';

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    state.charts.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No records'],
        datasets: [{
          label: activeLabel,
          data: activeValues.length > 0 ? activeValues : [0],
          borderColor: COLORS.primary,
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: COLORS.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: labels.length > 25 ? 2.5 : 4.5,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.slateDark,
            padding: 10,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (ctx) {
                return isRevenue ? `Revenue: ${formatMoney(ctx.raw)}` : `Orders: ${ctx.raw} transactions`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: COLORS.slateText,
              font: { size: 11 },
              maxTicksLimit: 9
            }
          },
          y: {
            grid: {
              color: COLORS.slateGrid,
              drawBorder: false
            },
            ticks: {
              color: COLORS.slateText,
              font: { size: 11 },
              callback: function (val) {
                return isRevenue ? '$' + val.toLocaleString() : val;
              }
            }
          }
        }
      }
    });
  }

  function renderCategoryChart(filteredData) {
    const canvas = document.getElementById('categoryDonutChart');
    if (!canvas) return;

    if (state.charts.category) {
      state.charts.category.destroy();
    }

    const categoryTotals = {};
    filteredData.forEach(item => {
      const cat = item.category || 'Other';
      if (item.status !== 'Refunded') {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(item.amount);
      }
    });

    const labels = Object.keys(categoryTotals);
    const data = labels.map(l => Math.round(categoryTotals[l]));

    const palette = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple, COLORS.pink];

    state.charts.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['None'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: palette.slice(0, Math.max(labels.length, 1)),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 12,
              font: { size: 11 },
              color: COLORS.slateDark
            }
          },
          tooltip: {
            backgroundColor: COLORS.slateDark,
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                return ` ${ctx.label}: ${formatMoney(ctx.raw)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderChannelsChart(filteredData) {
    const canvas = document.getElementById('channelsBarChart');
    if (!canvas) return;

    if (state.charts.channels) {
      state.charts.channels.destroy();
    }

    // Aggregate category revenue volume
    const catCounts = {};
    filteredData.forEach(item => {
      if (item.status === 'Completed') {
        catCounts[item.category] = (catCounts[item.category] || 0) + Number(item.amount);
      }
    });

    const labels = Object.keys(catCounts);
    const data = labels.map(l => Math.round(catCounts[l]));

    state.charts.channels = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['No data'],
        datasets: [{
          data: data.length > 0 ? data : [0],
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          barThickness: 18
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.slateDark,
            callbacks: {
              label: function (ctx) {
                return ` Completed: ${formatMoney(ctx.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: COLORS.slateText,
              font: { size: 10 }
            }
          },
          y: {
            grid: { color: COLORS.slateGrid },
            ticks: {
              color: COLORS.slateText,
              font: { size: 10 },
              callback: val => '$' + (val >= 1000 ? (val / 1000) + 'k' : val)
            }
          }
        }
      }
    });
  }

  function renderPaymentMethodsChart(filteredData) {
    const canvas = document.getElementById('paymentMethodsChart');
    if (!canvas) return;

    if (state.charts.payment) {
      state.charts.payment.destroy();
    }

    const methodCounts = {};
    filteredData.forEach(item => {
      const m = item.paymentMethod || 'Other';
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });

    const labels = Object.keys(methodCounts);
    const data = labels.map(l => methodCounts[l]);

    state.charts.payment = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['None'],
        datasets: [{
          data: data.length > 0 ? data : [0],
          backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'],
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bars
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.slateDark,
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.raw} transactions`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.slateGrid },
            ticks: {
              color: COLORS.slateText,
              font: { size: 10 },
              stepSize: 1
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: COLORS.slateText,
              font: { size: 11, weight: '500' }
            }
          }
        }
      }
    });
  }

  // --- Transactions Table Rendering & Filtering ---
  function getFilteredTableData(timeframeData) {
    let result = [...timeframeData];

    // Search query filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return (
          item.customer.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.product.toLowerCase().includes(q) ||
          item.invoiceNumber.toLowerCase().includes(q)
        );
      });
    }

    // Category filter
    if (state.categoryFilter !== 'all') {
      result = result.filter(item => item.category === state.categoryFilter);
    }

    // Status filter
    if (state.statusFilter !== 'all') {
      result = result.filter(item => item.status === state.statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (state.sortBy === 'date-desc') {
        return new Date(b.date) - new Date(a.date);
      }
      if (state.sortBy === 'date-asc') {
        return new Date(a.date) - new Date(b.date);
      }
      if (state.sortBy === 'amount-desc') {
        return Number(b.amount) - Number(a.amount);
      }
      if (state.sortBy === 'amount-asc') {
        return Number(a.amount) - Number(b.amount);
      }
      if (state.sortBy === 'customer-asc') {
        return a.customer.localeCompare(b.customer);
      }
      return 0;
    });

    return result;
  }

  function renderTable(timeframeData) {
    const tableBody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const tableElement = document.getElementById('salesTable');
    const recordCountEl = document.getElementById('tableRecordCount');
    const pageNumberList = document.getElementById('pageNumberList');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');

    const filtered = getFilteredTableData(timeframeData);
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / state.pageSize) || 1;

    // Boundary check for current page
    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }
    if (state.currentPage < 1) {
      state.currentPage = 1;
    }

    if (totalRecords === 0) {
      tableBody.innerHTML = '';
      emptyState.style.display = 'flex';
      tableElement.style.display = 'none';
      recordCountEl.textContent = 'Showing 0 records';
      pageNumberList.innerHTML = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    emptyState.style.display = 'none';
    tableElement.style.display = 'table';

    // Slice pagination
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalRecords);
    const pageItems = filtered.slice(startIndex, endIndex);

    recordCountEl.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} transactions`;

    // Render table rows
    let rowsHtml = '';
    pageItems.forEach(item => {
      const statusClass = 
        item.status === 'Completed' ? 'badge-completed' :
        item.status === 'Pending' ? 'badge-pending' : 'badge-refunded';

      rowsHtml += `
        <tr>
          <td><span class="inv-code">${escapeHtml(item.invoiceNumber)}</span></td>
          <td style="white-space: nowrap; color: #64748b; font-size: 12px;">${escapeHtml(item.date)}</td>
          <td>
            <div class="customer-name">${escapeHtml(item.customer)}</div>
            <div class="customer-email">${escapeHtml(item.email)}</div>
          </td>
          <td style="font-weight: 500;">${escapeHtml(item.product)}</td>
          <td><span style="color: #475569; font-size: 12px;">${escapeHtml(item.category)}</span></td>
          <td><span style="color: #64748b; font-size: 12px;">${escapeHtml(item.paymentMethod)}</span></td>
          <td><span class="amount-value">${formatMoney(item.amount)}</span></td>
          <td>
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span>
              ${escapeHtml(item.status)}
            </span>
          </td>
          <td style="text-align: right;">
            <button class="btn-delete-row" data-delete-id="${item.id}" title="Delete record">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });
    tableBody.innerHTML = rowsHtml;

    // Render pagination buttons
    prevBtn.disabled = state.currentPage === 1;
    nextBtn.disabled = state.currentPage === totalPages;

    let pageNumsHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      // Show up to 5 page tabs
      if (totalPages <= 6 || Math.abs(p - state.currentPage) <= 2 || p === 1 || p === totalPages) {
        pageNumsHtml += `
          <button class="page-num ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>
        `;
      }
    }
    pageNumberList.innerHTML = pageNumsHtml;
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Main Refresh Coordinator ---
  function refreshDashboard() {
    const timeframeData = filterByTimeframe(state.transactions, state.timeframe);

    // Refresh KPI Numbers
    updateKPIs(timeframeData);

    // Refresh Visual Charts
    renderTimelineChart(timeframeData);
    renderCategoryChart(timeframeData);
    renderChannelsChart(timeframeData);
    renderPaymentMethodsChart(timeframeData);

    // Refresh Table
    renderTable(timeframeData);
  }

  // --- CSV Export Utility ---
  function exportCSV() {
    const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
    const dataToExport = getFilteredTableData(timeframeData);

    if (dataToExport.length === 0) {
      showToast('No records to export.', 'danger');
      return;
    }

    const headers = ['Invoice ID', 'Date', 'Customer', 'Email', 'Product', 'Category', 'Payment Method', 'Amount', 'Status'];
    const rows = dataToExport.map(row => [
      `"${row.invoiceNumber}"`,
      `"${row.date}"`,
      `"${row.customer.replace(/"/g, '""')}"`,
      `"${row.email}"`,
      `"${row.product.replace(/"/g, '""')}"`,
      `"${row.category}"`,
      `"${row.paymentMethod}"`,
      row.amount,
      `"${row.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OmniSales_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${dataToExport.length} transactions to CSV.`, 'success');
  }

  // --- Event Listeners and Setup ---
  function initEventListeners() {
    // Timeframe selector
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    if (timeRangeSelect) {
      timeRangeSelect.addEventListener('change', (e) => {
        state.timeframe = e.target.value;
        state.currentPage = 1;
        refreshDashboard();
      });
    }

    // Timeline chart metric toggle (Revenue vs Orders)
    const metricButtons = document.querySelectorAll('[data-chart-metric]');
    metricButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        metricButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.timelineMetric = e.target.getAttribute('data-chart-metric');
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTimelineChart(timeframeData);
      });
    });

    // Table search input
    const tableSearchInput = document.getElementById('tableSearchInput');
    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      });
    }

    // Category filter dropdown
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
      filterCategory.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        state.currentPage = 1;
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      });
    }

    // Status filter dropdown
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        state.currentPage = 1;
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      });
    }

    // Sort orders dropdown
    const sortOrders = document.getElementById('sortOrders');
    if (sortOrders) {
      sortOrders.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      });
    }

    // Pagination controls
    document.getElementById('btnPrevPage').addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
      state.currentPage++;
      const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
      renderTable(timeframeData);
    });

    document.getElementById('pageNumberList').addEventListener('click', (e) => {
      if (e.target.classList.contains('page-num')) {
        state.currentPage = Number(e.target.getAttribute('data-page'));
        const timeframeData = filterByTimeframe(state.transactions, state.timeframe);
        renderTable(timeframeData);
      }
    });

    // Delete single transaction row handler
    document.getElementById('salesTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-row');
      if (btn) {
        const idToDelete = btn.getAttribute('data-delete-id');
        if (confirm('Are you sure you want to delete this sales record? This action will update analytics.')) {
          state.transactions = state.transactions.filter(t => t.id !== idToDelete);
          saveTransactions(state.transactions);
          showToast('Record deleted successfully.', 'success');
          refreshDashboard();
        }
      }
    });

    // Export CSV Button
    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);

    // Reset Data Button
    document.getElementById('btnResetData').addEventListener('click', () => {
      if (confirm('Reset to original sample sales records? Any custom added sales will be cleared.')) {
        state.transactions = generateSeedData();
        saveTransactions(state.transactions);
        state.currentPage = 1;
        showToast('Demo sales data reloaded.', 'success');
        refreshDashboard();
      }
    });

    // Modal open/close handling
    const modal = document.getElementById('saleModal');
    const openModalBtn = document.getElementById('btnOpenNewSaleModal');
    const closeModalBtn = document.getElementById('btnCloseModal');
    const cancelModalBtn = document.getElementById('btnCancelModal');
    const saleDateInput = document.getElementById('saleDate');
    const newSaleForm = document.getElementById('newSaleForm');

    function openModal() {
      // Default to today's date
      saleDateInput.value = new Date().toISOString().split('T')[0];
      modal.style.display = 'flex';
      document.getElementById('saleCustomer').focus();
    }

    function closeModal() {
      modal.style.display = 'none';
      newSaleForm.reset();
    }

    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // New Sale Form Submit
    newSaleForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const customer = document.getElementById('saleCustomer').value.trim();
      const email = document.getElementById('saleEmail').value.trim();
      const product = document.getElementById('saleProduct').value.trim();
      const category = document.getElementById('saleCategory').value;
      const amount = parseFloat(document.getElementById('saleAmount').value);
      const date = document.getElementById('saleDate').value;
      const paymentMethod = document.getElementById('salePaymentMethod').value;
      const status = document.getElementById('saleStatus').value;

      if (!customer || !email || !product || isNaN(amount) || amount <= 0 || !date) {
        showToast('Please fill out all required fields with valid values.', 'danger');
        return;
      }

      // Generate invoice ID
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${new Date(date).getFullYear()}-${randomCode}`;

      const newRecord = {
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        invoiceNumber,
        customer,
        email,
        product,
        category,
        amount: Math.round(amount * 100) / 100,
        date,
        paymentMethod,
        status
      };

      // Add to front of array
      state.transactions.unshift(newRecord);
      saveTransactions(state.transactions);

      closeModal();
      showToast(`Sale #${invoiceNumber} recorded successfully!`, 'success');

      // Refresh dashboard view
      refreshDashboard();
    });
  }

  // --- Bootstrap App ---
  function init() {
    state.transactions = loadTransactions();
    initEventListeners();
    refreshDashboard();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

