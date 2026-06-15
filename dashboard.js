/**
 * Crimea News Publics Dashboard Interactivity Logic
 */

// Global toggle helper for card detail drawer
window.toggleDetails = function(btn) {
  const drawer = btn.nextElementSibling;
  const isOpen = drawer.classList.contains("open");
  if (isOpen) {
    drawer.classList.remove("open");
    btn.classList.remove("open");
  } else {
    drawer.classList.add("open");
    btn.classList.add("open");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Check if data is loaded
  if (typeof SCRAPED_DATA === 'undefined') {
    console.error("Scraped data not loaded. Please ensure data.js is created and loaded.");
    return;
  }

  // State Variables
  let currentData = [...SCRAPED_DATA];
  let filterPlatform = 'all';
  let filterCity = 'all';
  let searchQuery = '';
  let currentSort = 'audience'; // default

  // DOM Elements
  const searchInput = document.getElementById("search-input");
  const platformSelect = document.getElementById("platform-select");
  const citySelect = document.getElementById("city-select");
  const sortButtons = document.querySelectorAll(".sort-btn");
  const cardsGrid = document.getElementById("cards-grid");
  const resultsCountText = document.getElementById("results-count-text");
  
  // Stats summary elements
  const totalChannelsEl = document.getElementById("stat-total-channels");
  const totalAudienceEl = document.getElementById("stat-total-audience");
  const avgViewsEl = document.getElementById("stat-avg-views");
  const maxEngagementEl = document.getElementById("stat-max-engagement");

  // Charts elements
  const topAudienceChart = document.getElementById("chart-top-audience");
  const platformShareChart = document.getElementById("chart-platform-share");

  // Init Application
  initFilters();
  computeGlobalStats();
  applyFiltersAndSort();
  renderCharts();

  // Initialize dropdown options from data
  function initFilters() {
    // Collect unique cities
    const cities = new Set();
    SCRAPED_DATA.forEach(item => {
      if (item.city) cities.add(item.city);
    });

    // Populate City dropdown
    cities.forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });

    // Add event listeners
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFiltersAndSort();
    });

    platformSelect.addEventListener("change", (e) => {
      filterPlatform = e.target.value;
      applyFiltersAndSort();
    });

    citySelect.addEventListener("change", (e) => {
      filterCity = e.target.value;
      applyFiltersAndSort();
    });

    sortButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        sortButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentSort = btn.dataset.sort;
        applyFiltersAndSort();
      });
    });
  }

  // Number Formatter Utility
  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString('ru-RU');
  }

  // Compute stats across all loaded data
  function computeGlobalStats() {
    const totalChannels = SCRAPED_DATA.length;
    
    // Aggregated Audience
    const totalAudience = SCRAPED_DATA.reduce((acc, curr) => acc + (curr.audience || 0), 0);
    
    // Average views (only where views are tracked/non-zero)
    const channelsWithViews = SCRAPED_DATA.filter(item => item.avg_views > 0);
    const sumViews = channelsWithViews.reduce((acc, curr) => acc + curr.avg_views, 0);
    const avgViews = channelsWithViews.length > 0 ? Math.round(sumViews / channelsWithViews.length) : 0;
    
    // Highest engagement
    const maxEngagement = SCRAPED_DATA.reduce((max, curr) => curr.engagement_rate > max ? curr.engagement_rate : max, 0);

    // Render Stats
    totalChannelsEl.textContent = totalChannels;
    totalAudienceEl.textContent = formatNumber(totalAudience);
    avgViewsEl.textContent = formatNumber(avgViews);
    maxEngagementEl.textContent = maxEngagement.toFixed(1) + '%';
  }

  // Filter & Sort Logic
  function applyFiltersAndSort() {
    // 1. Filter
    currentData = SCRAPED_DATA.filter(item => {
      // Platform filter
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      
      // City filter
      if (filterCity !== 'all' && item.city !== filterCity) return false;
      
      // Search query filter (matches name, handle, category, city)
      if (searchQuery) {
        const matchesName = item.name.toLowerCase().includes(searchQuery);
        const matchesHandle = item.handle.toLowerCase().includes(searchQuery);
        const matchesCat = item.category.toLowerCase().includes(searchQuery);
        const matchesCity = item.city.toLowerCase().includes(searchQuery);
        if (!matchesName && !matchesHandle && !matchesCat && !matchesCity) return false;
      }
      
      return true;
    });

    // 2. Sort
    currentData.sort((a, b) => {
      if (currentSort === 'audience') {
        return (b.audience || 0) - (a.audience || 0);
      } else if (currentSort === 'views') {
        return (b.avg_views || 0) - (a.avg_views || 0);
      } else if (currentSort === 'likes') {
        return (b.avg_likes || 0) - (a.avg_likes || 0);
      } else if (currentSort === 'engagement') {
        return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      }
      return 0;
    });

    // 3. Update count and render
    resultsCountText.textContent = `Найдено пабликов: ${currentData.length}`;
    renderCards();
  }

  // Render cards to grid
  function renderCards() {
    cardsGrid.innerHTML = '';
    
    if (currentData.length === 0) {
      cardsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Ничего не найдено</div>
          <div class="empty-state-text">Попробуйте изменить параметры фильтрации или поисковый запрос.</div>
        </div>
      `;
      return;
    }

    currentData.forEach(item => {
      const card = document.createElement("div");
      // Add featured class for high audience accounts (> 80K)
      const isFeatured = item.audience >= 80000;
      card.className = `channel-card${isFeatured ? ' featured' : ''}`;
      
      // Platform logo character or name
      let platformLabel = item.platform.toUpperCase();
      if (item.platform === 'x') platformLabel = 'X (Twitter)';
      
      // Link generators
      let link = '#';
      if (item.platform === 'telegram') link = `https://t.me/${item.handle}`;
      else if (item.platform === 'vk') link = `https://vk.com/${item.handle}`;
      else if (item.platform === 'instagram') link = `https://instagram.com/${item.handle}`;
      else if (item.platform === 'x') link = `https://x.com/${item.handle}`;

      const likesDisplay = item.platform === 'telegram' ? 'Н/Д' : formatNumber(item.avg_likes);
      const viewsDisplay = item.avg_views > 0 ? formatNumber(item.avg_views) : 'Н/Д';

      // 1. Calculate Audience Tier & Progress
      const maxScale = 250000;
      const audiencePct = Math.min((item.audience / maxScale) * 100, 100);
      let audienceTier = "Локальный паблик";
      let audienceDesc = "Ресурс местного масштаба с фокусом на городские события.";
      if (item.audience >= 100000) {
        audienceTier = "Крупнейшее медиа";
        audienceDesc = "Охватывает значительную часть населения Крыма, имеет высокий уровень влияния.";
      } else if (item.audience >= 30000) {
        audienceTier = "Региональный паблик";
        audienceDesc = "Широкий охват по нескольким городам полуострова.";
      }

      // 2. Reach Rate (Views/Audience)
      const reachRate = item.audience > 0 ? Math.round((item.avg_views / item.audience) * 100) : 0;
      let reachDesc = "Умеренная видимость. Посты читаются по мере необходимости.";
      if (reachRate >= 35) {
        reachDesc = "Сверхвысокий интерес! Читатели мгновенно реагируют на новые посты.";
      } else if (reachRate >= 15) {
        reachDesc = "Хороший уровень видимости. Активное ядро подписчиков читает регулярно.";
      }

      // 3. Like Rate (Likes/Views)
      const likeRate = item.avg_views > 0 ? parseFloat(((item.avg_likes / item.avg_views) * 100).toFixed(1)) : 0;
      let likeDesc = "Низкая активность в лайках (характерно для новостных инцидент-пабликов).";
      if (likeRate >= 8) {
        likeDesc = "Высокая эмоциональная связь! Читатели активно одобряют контент.";
      } else if (likeRate >= 3) {
        likeDesc = "Нормальная вовлеченность. Стабильный отклик на интересный материал.";
      }

      // 4. Default Avatar
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`;
      const avatarUrl = item.avatar ? item.avatar : defaultAvatar;

      card.innerHTML = `
        <div>
          <div class="card-header">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <span class="platform-badge ${item.platform}">${platformLabel}</span>
              ${isFeatured ? '<span class="featured-badge">Популярное</span>' : ''}
            </div>
            <span class="city-badge">${item.city}</span>
          </div>

          <div class="channel-info-wrapper">
            <img class="channel-avatar" src="${avatarUrl}" alt="${item.name}" onerror="this.src='${defaultAvatar}'" style="width: 54px; height: 54px; border-radius: 50%;">
            <div style="min-width: 0;">
              <h3 class="channel-name" title="${item.name}" style="margin-bottom: 0.2rem; height: auto; display: block; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; font-size: 1.15rem;">${item.name}</h3>
              <a href="${link}" target="_blank" class="channel-handle" style="margin-bottom: 0;">@${item.handle}</a>
            </div>
          </div>
        </div>
        
        <div class="metrics-row">
          <div class="metric-item">
            <span class="metric-label">Подписчики</span>
            <span class="metric-value">${formatNumber(item.audience)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Категория</span>
            <span class="metric-value" style="font-size: 0.95rem; font-weight: 500; color: var(--text-secondary); margin-top: 0.25rem;">
              ${item.category}
            </span>
          </div>
          <div class="metric-item" style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <span class="metric-label">Ср. просмотры</span>
            <span class="metric-value">${viewsDisplay}</span>
          </div>
          <div class="metric-item" style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <span class="metric-label">Ср. лайки</span>
            <span class="metric-value">${likesDisplay}</span>
          </div>
          <div class="er-badge">
            <span class="er-label">Уровень вовлеченности (ER)</span>
            <span class="er-value">${item.engagement_rate}%</span>
          </div>
        </div>

        <div class="details-toggle-btn" onclick="toggleDetails(this)">
          <span>Подробный анализ</span>
          <svg class="chevron-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>

        <div class="channel-details-drawer">
          <div class="detail-section">
            <div class="detail-header">
              <span class="detail-label">Категория размера</span>
              <span class="detail-value">${audienceTier}</span>
            </div>
            <div class="detail-progress-track">
              <div class="detail-progress-fill" style="width: ${audiencePct}%; background-color: var(--accent-primary);"></div>
            </div>
            <span class="detail-desc">${audienceDesc}</span>
          </div>

          <div class="detail-section">
            <div class="detail-header">
              <span class="detail-label">Индекс охвата (Reach Rate)</span>
              <span class="detail-value">${reachRate > 0 ? reachRate + '%' : 'Н/Д'}</span>
            </div>
            <div class="detail-progress-track">
              <div class="detail-progress-fill" style="width: ${Math.min(reachRate, 100)}%; background-color: hsl(145, 75%, 50%);"></div>
            </div>
            <span class="detail-desc">${reachDesc}</span>
          </div>

          <div class="detail-section">
            <div class="detail-header">
              <span class="detail-label">Индекс лайков (Like-to-View)</span>
              <span class="detail-value">${likeRate > 0 ? likeRate + '%' : 'Н/Д'}</span>
            </div>
            <div class="detail-progress-track">
              <div class="detail-progress-fill" style="width: ${Math.min(likeRate * 8, 100)}%; background-color: hsl(200, 85%, 55%);"></div>
            </div>
            <span class="detail-desc">${likeDesc}</span>
          </div>
        </div>
      `;
      
      cardsGrid.appendChild(card);
    });
  }

  // Render Charts section
  function renderCharts() {
    // 1. Top 5 by Audience
    const sortedByAudience = [...SCRAPED_DATA]
      .sort((a, b) => b.audience - a.audience)
      .slice(0, 5);
      
    const maxAudience = sortedByAudience[0]?.audience || 1;
    
    let audienceHtml = '<div class="bar-chart-list">';
    sortedByAudience.forEach(item => {
      const percentage = (item.audience / maxAudience) * 100;
      audienceHtml += `
        <div class="bar-chart-item">
          <div class="bar-chart-label" title="${item.name}">${item.name}</div>
          <div class="bar-chart-track">
            <div class="bar-chart-fill" style="width: ${percentage}%; background-color: var(--color-${item.platform});"></div>
          </div>
          <div class="bar-chart-value">${formatNumber(item.audience)}</div>
        </div>
      `;
    });
    audienceHtml += '</div>';
    topAudienceChart.innerHTML = audienceHtml;

    // 2. Platform Share (Subscribers by platform)
    const platformSum = {};
    SCRAPED_DATA.forEach(item => {
      platformSum[item.platform] = (platformSum[item.platform] || 0) + item.audience;
    });

    const totalAudienceSum = Object.values(platformSum).reduce((a, b) => a + b, 0);
    
    let shareHtml = '<div class="bar-chart-list">';
    Object.keys(platformSum).forEach(platform => {
      const val = platformSum[platform];
      const sharePct = totalAudienceSum > 0 ? (val / totalAudienceSum * 100) : 0;
      let label = platform.toUpperCase();
      if (platform === 'x') label = 'X (Twitter)';
      
      shareHtml += `
        <div class="bar-chart-item">
          <div class="bar-chart-label">${label}</div>
          <div class="bar-chart-track">
            <div class="bar-chart-fill" style="width: ${sharePct}%; background-color: var(--color-${platform});"></div>
          </div>
          <div class="bar-chart-value">${sharePct.toFixed(1)}%</div>
        </div>
      `;
    });
    shareHtml += '</div>';
    platformShareChart.innerHTML = shareHtml;
  }
});
