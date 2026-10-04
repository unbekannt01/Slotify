/**
 * Slotify — Customer-Facing Live Availability Portal JS
 * Mobile-First Lovable UI Architecture with Real-Time Socket.io Streaming
 */

const RAILWAY_BACKEND_URL = 'https://slotify-production-937f.up.railway.app';

const API_BASE_URL = (() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('api')) return urlParams.get('api');
  if (typeof window !== 'undefined' && window.__SLOTIFY_API_URL__) {
    return window.__SLOTIFY_API_URL__;
  }
  // If served directly on Railway
  if (window.location.origin && window.location.origin.includes('railway.app')) {
    return window.location.origin;
  }
  // Production live backend for Vercel, mobile web & external visitors
  return RAILWAY_BACKEND_URL;
})();

// Curated Studio Photography & Meta Mapping
const STUDIO_PHOTO_MAP = {
  'The Foundry Barbers': {
    photo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
    distance: 1.2,
    rating: '4.9',
    reviews: '82 REVIEWS',
    tagline: 'Precision cuts & classic shaves',
    lat: 22.7196,
    lng: 75.8577,
  },
  'Luxe Salon & Studio': {
    photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    distance: 1.8,
    rating: '4.9',
    reviews: '96 REVIEWS',
    tagline: 'Luxury balayage, cut & scalp care',
    lat: 22.7244,
    lng: 75.8712,
  },
  'Apex Barbershop & Grooming': {
    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    distance: 0.9,
    rating: '4.9',
    reviews: '124 REVIEWS',
    tagline: 'Master fades & hot towel grooming',
    lat: 22.7180,
    lng: 75.8520,
  },
  'Apex Barber Co.': {
    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    distance: 0.9,
    rating: '4.9',
    reviews: '124 REVIEWS',
    tagline: 'Master fades & hot towel grooming',
    lat: 22.7180,
    lng: 75.8520,
  },
  'Glow Aesthetics Lounge': {
    photo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    distance: 2.7,
    rating: '4.8',
    reviews: '68 REVIEWS',
    tagline: 'Holistic skin rituals & facial glow',
    lat: 22.7350,
    lng: 75.8850,
  },
  'Glow Sanctuary': {
    photo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    distance: 3.1,
    rating: '4.7',
    reviews: '52 REVIEWS',
    tagline: 'Holistic organic skin & wellness',
    lat: 22.7350,
    lng: 75.8850,
  },
  'Lumina Skin Studio': {
    photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    distance: 2.4,
    rating: '4.8',
    reviews: '64 REVIEWS',
    tagline: 'Skin rituals & modern hair styling',
    lat: 22.7400,
    lng: 75.8900,
  },
};

const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80';

function getShopMeta(shop) {
  if (STUDIO_PHOTO_MAP[shop.name]) {
    return { ...STUDIO_PHOTO_MAP[shop.name], distanceStr: `${STUDIO_PHOTO_MAP[shop.name].distance} KM` };
  }

  // Case-insensitive / partial match
  const nameLower = (shop.name || '').toLowerCase();
  for (const [key, val] of Object.entries(STUDIO_PHOTO_MAP)) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) {
      return { ...val, distanceStr: `${val.distance} KM` };
    }
  }

  // Category based smart photo fallback
  const catLower = (shop.category || '').toLowerCase();
  let photo = DEFAULT_PHOTO;
  let tagline = `${shop.category || 'Studio'} • ${shop.area || 'Metro Area'}`;

  if (catLower.includes('barber')) {
    photo = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80';
    tagline = 'Classic cuts, fades & beard sculpt';
  } else if (catLower.includes('hair') || catLower.includes('salon')) {
    photo = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80';
    tagline = 'Artisanal styling, colors & treatments';
  } else if (catLower.includes('spa') || catLower.includes('skin') || catLower.includes('wellness')) {
    photo = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80';
    tagline = 'Relaxing massage, facials & body rituals';
  }

  return {
    photo,
    distance: 1.5,
    distanceStr: '1.5 KM',
    rating: '4.9',
    reviews: '74 REVIEWS',
    tagline,
    lat: 22.7196,
    lng: 75.8577,
  };
}

// State
let allShops = [];
let shopSlotsCache = {}; // shopId -> slots[]
let selectedShop = null;
let selectedSlot = null;
let activeCategory = 'all';
let searchQuery = '';
let activeTab = 'explore'; // 'explore' | 'bookings' | 'profile'
let socket = null;
let notificationsList = [];
let audioChimeEnabled = true;

// DOM Selectors
const liveHeaderText = document.getElementById('live-header-text');
const totalOpeningsCount = document.getElementById('total-openings-count');
const livePulseDot = document.getElementById('live-pulse-dot');
const studiosOnlineCount = document.getElementById('studios-online-count');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const geoBtn = document.getElementById('geo-btn');
const categoriesScroll = document.getElementById('categories-scroll');
const studiosFeed = document.getElementById('studios-feed');
const bellBtn = document.getElementById('bell-btn');
const bellBadge = document.getElementById('bell-badge');

// Views
const viewExplore = document.getElementById('view-explore');
const viewBookings = document.getElementById('view-bookings');
const viewProfile = document.getElementById('view-profile');
const bookingsFeed = document.getElementById('bookings-feed');

// Floating Dock
const dockExploreBtn = document.getElementById('dock-explore-btn');
const dockBookingsBtn = document.getElementById('dock-bookings-btn');
const dockProfileBtn = document.getElementById('dock-profile-btn');
const dockCtaBtn = document.getElementById('dock-cta-btn');
const dockCtaLabel = document.getElementById('dock-cta-label');

// Bottom Sheet
const bottomSheet = document.getElementById('bottom-sheet');
const sheetBackdrop = document.getElementById('sheet-backdrop');
const sheetCloseBtn = document.getElementById('sheet-close-btn');
const sheetCategoryTag = document.getElementById('sheet-category-tag');
const sheetShopName = document.getElementById('sheet-shop-name');
const sheetShopAddress = document.getElementById('sheet-shop-address');
const sheetSlotTime = document.getElementById('sheet-slot-time');
const sheetPhoneVal = document.getElementById('sheet-phone-val');
const sheetDirectCallBtn = document.getElementById('sheet-direct-call-btn');
const sheetReserveForm = document.getElementById('sheet-reserve-form');
const sheetSuccessBox = document.getElementById('sheet-success-box');
const customerNameInput = document.getElementById('customer-name-input');
const customerPhoneInput = document.getElementById('customer-phone-input');

// Notifications Drawer
const notifDrawer = document.getElementById('notif-drawer');
const notifBackdrop = document.getElementById('notif-backdrop');
const notifCloseBtn = document.getElementById('notif-close-btn');
const notifClearBtn = document.getElementById('notif-clear-btn');
const notifListEl = document.getElementById('notif-list');

// Profile Form & Elements
const profileForm = document.getElementById('profile-form');
const profileNameInput = document.getElementById('profile-name-input');
const profilePhoneInput = document.getElementById('profile-phone-input');
const profileCityInput = document.getElementById('profile-city-input');
const profileDisplayName = document.getElementById('profile-display-name');
const profileAvatarLetter = document.getElementById('profile-avatar-letter');
const settingSoundToggle = document.getElementById('setting-sound-toggle');
const statsBookingsCount = document.getElementById('stats-bookings-count');
const statsStudiosActive = document.getElementById('stats-studios-active');
const toastContainer = document.getElementById('toast-container');

// --------------------------------------------------------------------------
// Audio Chime Synthesizer (Web Audio API - No external asset dependencies)
// --------------------------------------------------------------------------
function playChime(type = 'open') {
  if (!audioChimeEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'success') {
      // Harmonic chord for successful booking
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    } else {
      // Gentle notification double chime
      [880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.08, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    }
  } catch (e) {
    // Audio contexts require user interaction in some browsers
  }
}

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.25s forwards';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// --------------------------------------------------------------------------
// Real-time Notifications Drawer
// --------------------------------------------------------------------------
function addNotification(text, type = 'info') {
  const notif = {
    id: 'notif_' + Date.now(),
    text,
    type,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  notificationsList.unshift(notif);
  if (notificationsList.length > 20) notificationsList.pop();

  renderNotifications();

  if (bellBadge) {
    bellBadge.style.display = 'block';
  }
}

function renderNotifications() {
  if (!notifListEl) return;
  if (notificationsList.length === 0) {
    notifListEl.innerHTML = `
      <div style="text-align: center; padding: 32px 10px; color: var(--text-muted); font-size: 13px;">
        <p>No activity alerts yet.</p>
        <p style="font-size: 11px; margin-top: 4px;">Live openings and reservation confirmations will appear here.</p>
      </div>
    `;
    return;
  }

  notifListEl.innerHTML = notificationsList
    .map((n) => {
      const icon = n.type === 'success' ? '✓' : n.type === 'alert' ? '⚡' : '●';
      return `
        <div class="notif-card ${n.type} new">
          <div class="notif-icon-box">${icon}</div>
          <div class="notif-body">
            <p class="notif-text">${n.text}</p>
            <span class="notif-time">${n.time}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function openNotificationsDrawer() {
  if (notifDrawer) {
    notifDrawer.classList.add('open');
    notifDrawer.setAttribute('aria-hidden', 'false');
    if (bellBadge) bellBadge.style.display = 'none';
  }
}

function closeNotificationsDrawer() {
  if (notifDrawer) {
    notifDrawer.classList.remove('open');
    notifDrawer.setAttribute('aria-hidden', 'true');
  }
}

// --------------------------------------------------------------------------
// Real-time Socket.io Connection
// --------------------------------------------------------------------------
function initSocket() {
  try {
    if (typeof io === 'undefined') {
      console.warn('Socket.io library not loaded from CDN.');
      return;
    }

    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to Slotify server:', socket.id);
      if (livePulseDot) {
        livePulseDot.style.background = '#34D399';
        livePulseDot.style.boxShadow = '0 0 10px #10B981';
      }

      // Join rooms for all known shops
      allShops.forEach((shop) => {
        socket.emit('join_shop', shop.id);
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      if (livePulseDot) {
        livePulseDot.style.background = '#F59E0B';
        livePulseDot.style.boxShadow = '0 0 10px #F59E0B';
      }
    });

    // Real-time slot update
    socket.on('slot_changed', (data) => {
      console.log('[Socket] Live slot_changed:', data);
      const targetShopId = data.shopId || (selectedShop && selectedShop.id);
      if (targetShopId && data.slots) {
        shopSlotsCache[targetShopId] = data.slots;
        refreshShopSlotPills(targetShopId);
        updateTotalOpenings();

        const shop = allShops.find((s) => s.id === targetShopId);
        const shopName = shop ? shop.name : 'Studio';
        addNotification(`Schedule updated live for ${shopName}`, 'info');
        playChime('open');
      }
    });

    // Real-time shop update
    socket.on('shop_updated', (updatedData) => {
      console.log('[Socket] Live shop_updated:', updatedData);
      if (updatedData.shop) {
        const idx = allShops.findIndex((s) => s.id === updatedData.shop.id);
        if (idx !== -1) {
          allShops[idx] = { ...allShops[idx], ...updatedData.shop, status: updatedData.status };
        }
        if (updatedData.slots) {
          shopSlotsCache[updatedData.shop.id] = updatedData.slots;
        }
        updateTotalOpenings();
        renderFeed();
      }
    });
  } catch (err) {
    console.error('Socket initialization failed:', err);
  }
}

// --------------------------------------------------------------------------
// Live Backend Data Fetching & Sync (100% Real Database Feed)
// --------------------------------------------------------------------------
let _backendReconnectTimer = null;

function renderBackendOfflineState(errorMessage) {
  if (!studiosFeed) return;

  if (livePulseDot) {
    livePulseDot.style.background = '#EF4444';
    livePulseDot.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
  }
  if (liveHeaderText) {
    liveHeaderText.innerHTML = `BACKEND OFFLINE • <span id="total-openings-count">0</span> OPENINGS`;
  }
  if (studiosOnlineCount) studiosOnlineCount.textContent = '0';
  if (totalOpeningsCount) totalOpeningsCount.textContent = '0';

  studiosFeed.innerHTML = `
    <div class="empty-state">
      <div style="font-size: 38px; margin-bottom: 10px;">🔌</div>
      <p style="font-weight: 800; color: #F8FAFC; font-size: 16px;">Connecting to Live Backend...</p>
      <p style="color: #94A3B8; font-size: 12.5px; margin-top: 6px; line-height: 1.5; max-width: 330px;">
        Backend server at <code style="color: #7DD3FC; background: rgba(125,211,252,0.12); padding: 2px 6px; border-radius: 4px;">${API_BASE_URL}</code> is currently unreachable.<br/>
        <span style="font-size: 11px; color: #64748B;">(${errorMessage || 'Connection failed'})</span>
      </p>
      <button onclick="fetchShops()" style="margin-top: 16px; background: #7DD3FC; border: none; color: #06090F; padding: 10px 22px; border-radius: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        ↻ Retry Live Connection
      </button>
    </div>
  `;

  // Auto-retry polling every 4s
  if (!_backendReconnectTimer) {
    _backendReconnectTimer = setInterval(() => {
      console.log('[Slotify Live] Attempting auto-reconnect to live backend...');
      fetchShops();
    }, 4000);
  }
}

async function fetchShops() {
  try {
    const res = await fetch(`${API_BASE_URL}/shops`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch shops`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No active shops configured in database');
    }

    // Successfully connected! Clear any retry timer
    if (_backendReconnectTimer) {
      clearInterval(_backendReconnectTimer);
      _backendReconnectTimer = null;
    }

    allShops = data;

    // Fetch live slot grids in parallel for each shop from PostgreSQL
    await Promise.all(
      allShops.map(async (shop) => {
        try {
          const statusRes = await fetch(`${API_BASE_URL}/shops/${shop.id}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            shopSlotsCache[shop.id] = statusData.slots || [];
          }
        } catch (e) {
          console.warn(`Failed to fetch live slots for shop ${shop.name}:`, e);
        }
      })
    );

    // Update real metrics
    updateTotalOpenings();
    renderFeed();

    // Auto-select first available slot for instant booking
    autoSelectFirstOpenSlot();

    // Re-join real-time socket rooms for all active shops
    if (socket && socket.connected) {
      allShops.forEach((s) => socket.emit('join_shop', s.id));
    }

    if (statsStudiosActive) {
      statsStudiosActive.textContent = allShops.length;
    }

    if (livePulseDot) {
      livePulseDot.style.background = '#34D399';
      livePulseDot.style.boxShadow = '0 0 10px #10B981';
    }
  } catch (err) {
    console.warn('[Slotify Live] Backend connection unavailable:', err.message);
    renderBackendOfflineState(err.message);
  }
}

function updateTotalOpenings() {
  let count = 0;
  let onlineStudios = 0;

  allShops.forEach((shop) => {
    const slots = shopSlotsCache[shop.id] || [];
    const available = slots.filter((s) => s.status === 'available').length;
    count += available;
    if (shop.status === 'available' || available > 0) {
      onlineStudios += 1;
    }
  });

  if (totalOpeningsCount) totalOpeningsCount.textContent = count;
  if (studiosOnlineCount) studiosOnlineCount.textContent = onlineStudios;
  if (liveHeaderText) {
    liveHeaderText.innerHTML = `LIVE NEAR INDORE • <span id="total-openings-count">${count}</span> OPENINGS`;
  }
}

function autoSelectFirstOpenSlot() {
  for (const shop of allShops) {
    const slots = shopSlotsCache[shop.id] || [];
    const openSlot = slots.find((s) => s.status === 'available');
    if (openSlot) {
      selectedShop = shop;
      selectedSlot = openSlot;
      updateDockCta();
      break;
    }
  }
}

function updateDockCta() {
  if (!dockCtaLabel) return;
  if (activeTab === 'bookings' || activeTab === 'profile') {
    dockCtaLabel.textContent = 'Browse Studios';
  } else if (selectedSlot && selectedShop) {
    dockCtaLabel.textContent = `Book ${selectedSlot.start}`;
  } else {
    dockCtaLabel.textContent = 'Explore Openings';
  }
}

// --------------------------------------------------------------------------
// Feed Rendering (Signature Lovable UI)
// --------------------------------------------------------------------------
function renderFeed() {
  if (!studiosFeed) return;

  const filtered = allShops.filter((shop) => {
    const catLower = (shop.category || '').toLowerCase();
    const activeLower = activeCategory.toLowerCase();

    let matchesCategory = activeCategory === 'all';
    if (!matchesCategory) {
      if (activeLower === 'barbershop') {
        matchesCategory = catLower.includes('barber');
      } else if (activeLower.includes('hair')) {
        matchesCategory = catLower.includes('hair') || catLower.includes('style') || catLower.includes('salon');
      } else if (activeLower.includes('spa')) {
        matchesCategory = catLower.includes('spa') || catLower.includes('wellness');
      } else if (activeLower.includes('skin')) {
        matchesCategory = catLower.includes('skin') || catLower.includes('facial') || catLower.includes('aesthetic');
      } else {
        matchesCategory = catLower.includes(activeLower);
      }
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (shop.name && shop.name.toLowerCase().includes(q)) ||
      (shop.category && shop.category.toLowerCase().includes(q)) ||
      (shop.area && shop.area.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    studiosFeed.innerHTML = `
      <div class="empty-state">
        <p style="font-weight: 700; color: #F8FAFC; font-size: 16px;">No live studios found</p>
        <p style="color: #64748B; margin-top: 4px;">Try selecting another category or clear your search term.</p>
        <button onclick="clearSearchAndCategory()" style="margin-top: 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 8px 16px; border-radius: 10px; font-weight: 700; cursor: pointer;">Show All Studios</button>
      </div>
    `;
    return;
  }

  studiosFeed.innerHTML = filtered
    .map((shop) => {
      const meta = getShopMeta(shop);
      const slots = shopSlotsCache[shop.id] || [];
      const isOpen = shop.status === 'available';

      return `
        <article class="studio-feed-card" data-shop-id="${shop.id}">
          <!-- Photo Banner with Badges -->
          <div class="card-media-wrapper">
            <img src="${meta.photo}" alt="${shop.name} interior" class="card-media-img" loading="lazy" />
            <div class="card-gradient-overlay"></div>

            <div class="card-distance-badge">${meta.distanceStr}</div>
            
            <div class="card-status-badge">
              <span class="card-status-dot"></span>
              <span class="card-status-label">${isOpen ? 'Open now' : 'Busy now'}</span>
            </div>
          </div>

          <!-- Studio Details -->
          <div class="card-body">
            <div class="card-title-row">
              <div class="card-info">
                <h3 class="card-studio-name">${shop.name}</h3>
                <p class="card-studio-desc">${meta.tagline}</p>
              </div>

              <div class="card-rating-block">
                <span class="card-rating-num">${meta.rating}</span>
                <span class="card-reviews-count">${meta.reviews}</span>
              </div>
            </div>

            <!-- Horizontal Live Slots Rail -->
            <div class="card-slots-rail" id="slots-rail-${shop.id}">
              ${renderSlotPillsHtml(shop, slots)}
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  attachSlotEventListeners();
}

function clearSearchAndCategory() {
  activeCategory = 'all';
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.style.display = 'none';
  document.querySelectorAll('.category-pill').forEach((p) => {
    p.classList.toggle('active', p.getAttribute('data-category') === 'all');
  });
  renderFeed();
}

function renderSlotPillsHtml(shop, slots) {
  if (!slots || slots.length === 0) {
    return `<span style="font-size: 11px; color: #64748B; padding: 6px 0;">No scheduled slots today</span>`;
  }

  // Pick up to 10 most relevant slots
  return slots
    .slice(0, 10)
    .map((s) => {
      const isSelected = selectedShop?.id === shop.id && selectedSlot?.id === s.id;
      const isBooked = s.status === 'booked' || s.status === 'closed';

      return `
        <button
          type="button"
          class="slot-time-pill ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}"
          data-shop-id="${shop.id}"
          data-slot-id="${s.id}"
          data-slot-start="${s.start}"
          data-slot-status="${s.status}"
          ${isBooked ? 'disabled' : ''}
          aria-label="${shop.name} ${s.start} slot"
        >
          ${s.start}
        </button>
      `;
    })
    .join('');
}

function refreshShopSlotPills(shopId) {
  const rail = document.getElementById(`slots-rail-${shopId}`);
  const shop = allShops.find((s) => s.id === shopId);
  if (rail && shop) {
    const slots = shopSlotsCache[shopId] || [];
    rail.innerHTML = renderSlotPillsHtml(shop, slots);
    attachSlotEventListeners();
  }
}

// --------------------------------------------------------------------------
// Slot Interaction & Selection
// --------------------------------------------------------------------------
function attachSlotEventListeners() {
  const slotButtons = document.querySelectorAll('.slot-time-pill:not(.booked)');

  slotButtons.forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const shopId = btn.getAttribute('data-shop-id');
      const slotId = btn.getAttribute('data-slot-id');

      const shop = allShops.find((s) => s.id === shopId);
      const slots = shopSlotsCache[shopId] || [];
      const slot = slots.find((s) => s.id === slotId);

      if (shop && slot) {
        selectSlot(shop, slot);
        openBookingSheet(shop, slot);
      }
    };
  });

  // Clicking a studio feed card outside slot pills selects that studio's first open slot
  document.querySelectorAll('.studio-feed-card').forEach((card) => {
    card.onclick = (e) => {
      if (e.target.closest('.slot-time-pill')) return;
      const shopId = card.getAttribute('data-shop-id');
      const shop = allShops.find((s) => s.id === shopId);
      if (!shop) return;

      const slots = shopSlotsCache[shopId] || [];
      const openSlot = slots.find((s) => s.status === 'available') || slots[0];
      if (openSlot) {
        selectSlot(shop, openSlot);
        if (openSlot.status === 'available') {
          openBookingSheet(shop, openSlot);
        }
      }
    };
  });
}

function selectSlot(shop, slot) {
  selectedShop = shop;
  selectedSlot = slot;

  // Highlight selected slot across all pills
  document.querySelectorAll('.slot-time-pill').forEach((pill) => {
    if (pill.getAttribute('data-slot-id') === slot.id) {
      pill.classList.add('selected');
    } else {
      pill.classList.remove('selected');
    }
  });

  updateDockCta();
}

// --------------------------------------------------------------------------
// Slide-Up Bottom Sheet Modal
// --------------------------------------------------------------------------
function openBookingSheet(shop, slot) {
  selectedShop = shop;
  selectedSlot = slot;

  const meta = getShopMeta(shop);
  if (sheetCategoryTag) sheetCategoryTag.textContent = shop.category || 'Barbershop';
  if (sheetShopName) sheetShopName.textContent = shop.name;
  if (sheetShopAddress) sheetShopAddress.textContent = `${shop.area || 'Indore'} • ${meta.distanceStr}`;
  if (sheetSlotTime) sheetSlotTime.textContent = `Today, ${slot.start} – ${slot.end}`;

  const phone = shop.phone || '+91 98260 12345';
  if (sheetPhoneVal) sheetPhoneVal.textContent = phone;
  if (sheetDirectCallBtn) sheetDirectCallBtn.href = `tel:${phone.replace(/[^\d+]/g, '')}`;

  // Pre-fill profile info if saved
  const profile = loadProfile();
  if (customerNameInput && !customerNameInput.value && profile.name) {
    customerNameInput.value = profile.name;
  }
  if (customerPhoneInput && !customerPhoneInput.value && profile.phone) {
    customerPhoneInput.value = profile.phone;
  }

  if (sheetSuccessBox) sheetSuccessBox.style.display = 'none';
  if (sheetReserveForm) sheetReserveForm.style.display = 'flex';

  if (bottomSheet) {
    bottomSheet.classList.add('open');
    bottomSheet.setAttribute('aria-hidden', 'false');
  }
}

function closeBookingSheet() {
  if (bottomSheet) {
    bottomSheet.classList.remove('open');
    bottomSheet.setAttribute('aria-hidden', 'true');
  }
}

// --------------------------------------------------------------------------
// Customer Bookings (LocalStorage & API Sync)
// --------------------------------------------------------------------------
const STORAGE_BOOKINGS_KEY = 'slotify_customer_bookings';
const STORAGE_PROFILE_KEY = 'slotify_user_profile';

function loadBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (e) {}
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : { name: '', phone: '', city: 'Indore, MP' };
  } catch (e) {
    return { name: '', phone: '', city: 'Indore, MP' };
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

function renderBookingsFeed() {
  if (!bookingsFeed) return;
  const bookings = loadBookings();

  if (statsBookingsCount) {
    statsBookingsCount.textContent = bookings.length;
  }

  if (bookings.length === 0) {
    bookingsFeed.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 32px; margin-bottom: 8px;">🗓️</div>
        <p style="font-weight: 700; color: #F8FAFC; font-size: 16px;">No upcoming reservations</p>
        <p style="color: #64748B; margin-top: 6px; font-size: 12.5px;">Browse live walk-in openings near you and reserve in 1 tap!</p>
        <button onclick="switchTab('explore')" style="margin-top: 16px; background: #7DD3FC; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; color: #06090F;">Find Live Openings</button>
      </div>
    `;
    return;
  }

  bookingsFeed.innerHTML = bookings
    .map((b) => {
      const meta = STUDIO_PHOTO_MAP[b.shopName] || {
        photo: DEFAULT_PHOTO,
        distanceStr: '1.2 KM',
      };

      return `
        <article class="booking-card" id="booking-item-${b.id}">
          <div class="booking-card-top">
            <img src="${b.shopPhoto || meta.photo}" alt="${b.shopName}" class="booking-thumb" />
            <div class="booking-shop-meta">
              <span class="booking-shop-cat">${b.shopCategory || 'Studio'}</span>
              <h4 class="booking-shop-name">${b.shopName}</h4>
              <p class="booking-shop-area">${b.shopArea || 'Indore'}</p>
            </div>
          </div>

          <div class="booking-time-badge">
            <div class="booking-time-left">
              <span class="booking-time-label">RESERVED TIME OPENING</span>
              <span class="booking-time-text">Today, ${b.slotStart} – ${b.slotEnd}</span>
            </div>
            <span class="booking-status-tag">● Confirmed</span>
          </div>

          <div class="booking-actions-row">
            <a href="tel:${(b.shopPhone || '+919826012345').replace(/[^\d+]/g, '')}" class="booking-btn-call">
              📞 Call Studio
            </a>
            <button class="booking-btn-cancel" onclick="cancelBooking('${b.id}', '${b.shopId}', '${b.slotId}')">
              Cancel
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function cancelBooking(bookingId, shopId, slotId) {
  if (!confirm('Are you sure you want to cancel this reservation? The slot will reopen for other customers.')) {
    return;
  }

  try {
    // Call backend public cancel endpoint
    const res = await fetch(`${API_BASE_URL}/shops/${shopId}/cancel-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Cancel failed on server (HTTP ${res.status})`);
    }

    // Remove from local storage
    const bookings = loadBookings().filter((b) => b.id !== bookingId);
    saveBookings(bookings);

    // Reopen slot locally in cache
    const slots = shopSlotsCache[shopId] || [];
    const target = slots.find((s) => s.id === slotId);
    if (target) {
      target.status = 'available';
      target.customerName = undefined;
      refreshShopSlotPills(shopId);
      updateTotalOpenings();
    }

    renderBookingsFeed();
    showToast('Reservation cancelled. Slot is now reopened live.', 'info');
    addNotification('Reservation cancelled. Opening reopened live.', 'info');
  } catch (err) {
    console.error('Error cancelling booking:', err);
    showToast(err.message || 'Could not cancel reservation on backend.', 'error');
  }
}

// --------------------------------------------------------------------------
// Reservation Form Submit Handler
// --------------------------------------------------------------------------
if (sheetReserveForm) {
  sheetReserveForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!selectedShop || !selectedSlot) return;

    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const submitBtn = document.getElementById('sheet-submit-btn');

    if (!name || !phone) {
      alert('Please enter your name and phone number.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Broadcasting to Studio...';

      // Send live customer booking reservation to backend PostgreSQL API
      const res = await fetch(`${API_BASE_URL}/shops/${selectedShop.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          customerName: name,
          customerPhone: phone,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('This slot was just booked by another customer. Please choose another opening.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to reserve slot (HTTP ${res.status})`);
      }

      // Update local state
      selectedSlot.status = 'booked';
      selectedSlot.customerName = `${name} (${phone})`;
      refreshShopSlotPills(selectedShop.id);
      updateTotalOpenings();

      // Save customer booking to localStorage
      const meta = getShopMeta(selectedShop);
      const newBooking = {
        id: 'book_' + Date.now(),
        confirmationCode: 'SLOT-IN-' + Math.floor(1000 + Math.random() * 9000),
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        shopCategory: selectedShop.category,
        shopArea: selectedShop.area,
        shopPhone: selectedShop.phone,
        shopPhoto: meta.photo,
        slotId: selectedSlot.id,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        customerName: name,
        customerPhone: phone,
        bookedAt: new Date().toISOString(),
        status: 'confirmed',
      };

      const existingBookings = loadBookings();
      existingBookings.unshift(newBooking);
      saveBookings(existingBookings);

      // Save user profile for 1-tap booking in the future
      saveProfile({ name, phone, city: 'Indore, MP' });
      initProfileUI();

      // Audio & Feedback
      playChime('success');
      showToast(`Reserved ${selectedSlot.start} at ${selectedShop.name}!`, 'success');
      addNotification(`Reserved opening at ${selectedShop.name} (${selectedSlot.start})`, 'success');

      sheetReserveForm.style.display = 'none';
      sheetSuccessBox.style.display = 'block';

      // Auto close modal after 2s and select next available slot
      setTimeout(() => {
        closeBookingSheet();
        autoSelectFirstOpenSlot();
      }, 2000);
    } catch (err) {
      showToast(err.message || 'Could not complete reservation', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Slot & Broadcast to Studio';
    }
  };
}

// --------------------------------------------------------------------------
// Navigation Tab Switching
// --------------------------------------------------------------------------
function switchTab(tab) {
  activeTab = tab;

  // View containers
  if (viewExplore) viewExplore.style.display = tab === 'explore' ? 'block' : 'none';
  if (viewBookings) viewBookings.style.display = tab === 'bookings' ? 'block' : 'none';
  if (viewProfile) viewProfile.style.display = tab === 'profile' ? 'block' : 'none';

  // Dock buttons
  if (dockExploreBtn) dockExploreBtn.classList.toggle('active', tab === 'explore');
  if (dockBookingsBtn) dockBookingsBtn.classList.toggle('active', tab === 'bookings');
  if (dockProfileBtn) dockProfileBtn.classList.toggle('active', tab === 'profile');

  // Trigger content updates
  if (tab === 'bookings') {
    renderBookingsFeed();
  } else if (tab === 'profile') {
    initProfileUI();
  }

  updateDockCta();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --------------------------------------------------------------------------
// Profile Form & UI
// --------------------------------------------------------------------------
function initProfileUI() {
  const profile = loadProfile();
  if (profileNameInput) profileNameInput.value = profile.name || '';
  if (profilePhoneInput) profilePhoneInput.value = profile.phone || '';
  if (profileCityInput) profileCityInput.value = profile.city || 'Indore, MP';

  if (profileDisplayName) {
    profileDisplayName.textContent = profile.name || 'Customer';
  }
  if (profileAvatarLetter) {
    profileAvatarLetter.textContent = profile.name ? profile.name.charAt(0).toUpperCase() : 'S';
  }

  const bookings = loadBookings();
  if (statsBookingsCount) statsBookingsCount.textContent = bookings.length;
  if (statsStudiosActive) statsStudiosActive.textContent = allShops.length;
}

if (profileForm) {
  profileForm.onsubmit = (e) => {
    e.preventDefault();
    const name = (profileNameInput?.value || '').trim();
    const phone = (profilePhoneInput?.value || '').trim();
    const city = (profileCityInput?.value || '').trim() || 'Indore, MP';

    saveProfile({ name, phone, city });
    initProfileUI();
    showToast('Profile information saved!', 'success');
  };
}

if (settingSoundToggle) {
  settingSoundToggle.addEventListener('change', (e) => {
    audioChimeEnabled = e.target.checked;
    showToast(audioChimeEnabled ? 'Audio alerts enabled' : 'Audio alerts muted', 'info');
    if (audioChimeEnabled) playChime('open');
  });
}

// --------------------------------------------------------------------------
// Geolocation & Distance Sorting
// --------------------------------------------------------------------------
function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'info');
    return;
  }

  showToast('Detecting your location in Indore...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      // Calculate approximate distance for each shop
      allShops.forEach((shop) => {
        const meta = getShopMeta(shop);
        const d = calculateDistanceKm(userLat, userLng, meta.lat, meta.lng);
        meta.distance = parseFloat(d.toFixed(1));
        meta.distanceStr = `${meta.distance} KM`;
        STUDIO_PHOTO_MAP[shop.name] = meta;
      });

      // Sort by closest first
      allShops.sort((a, b) => {
        const metaA = getShopMeta(a);
        const metaB = getShopMeta(b);
        return metaA.distance - metaB.distance;
      });

      renderFeed();
      showToast('Studios sorted by proximity to your current location!', 'success');

      if (liveHeaderText) {
        liveHeaderText.innerHTML = `📍 NEAR YOUR LOCATION • <span id="total-openings-count">${totalOpeningsCount ? totalOpeningsCount.textContent : '6'}</span> OPENINGS`;
      }
    },
    (err) => {
      console.warn('Geolocation error or denied:', err);
      // Fallback location simulation (Indore Rajwada)
      showToast('Set to Indore Central (Rajwada)', 'info');
      if (liveHeaderText) {
        liveHeaderText.innerHTML = `📍 LIVE NEAR INDORE • <span id="total-openings-count">${totalOpeningsCount ? totalOpeningsCount.textContent : '6'}</span> OPENINGS`;
      }
    },
    { timeout: 8000, enableHighAccuracy: false }
  );
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --------------------------------------------------------------------------
// Event Listeners
// --------------------------------------------------------------------------
if (sheetBackdrop) sheetBackdrop.onclick = closeBookingSheet;
if (sheetCloseBtn) sheetCloseBtn.onclick = closeBookingSheet;

if (notifBackdrop) notifBackdrop.onclick = closeNotificationsDrawer;
if (notifCloseBtn) notifCloseBtn.onclick = closeNotificationsDrawer;
if (bellBtn) bellBtn.onclick = openNotificationsDrawer;
if (notifClearBtn) {
  notifClearBtn.onclick = () => {
    notificationsList = [];
    renderNotifications();
    if (bellBadge) bellBadge.style.display = 'none';
    showToast('Activity alerts cleared', 'info');
  };
}

if (dockExploreBtn) dockExploreBtn.onclick = () => switchTab('explore');
if (dockBookingsBtn) dockBookingsBtn.onclick = () => switchTab('bookings');
if (dockProfileBtn) dockProfileBtn.onclick = () => switchTab('profile');

if (dockCtaBtn) {
  dockCtaBtn.onclick = () => {
    if (activeTab !== 'explore') {
      switchTab('explore');
      return;
    }

    if (selectedShop && selectedSlot && selectedSlot.status === 'available') {
      openBookingSheet(selectedShop, selectedSlot);
    } else {
      autoSelectFirstOpenSlot();
      if (selectedShop && selectedSlot && selectedSlot.status === 'available') {
        openBookingSheet(selectedShop, selectedSlot);
      } else {
        showToast('Scanning live openings...', 'info');
      }
    }
  };
}

// Category filter click
if (categoriesScroll) {
  categoriesScroll.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-pill');
    if (!btn) return;

    document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');

    activeCategory = btn.getAttribute('data-category');
    renderFeed();
  });
}

// Search input
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    if (searchClearBtn) {
      searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
    }
    renderFeed();
  });
}

if (searchClearBtn) {
  searchClearBtn.onclick = () => {
    searchQuery = '';
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    renderFeed();
    searchInput.focus();
  };
}

// Geo locate button
if (geoBtn) {
  geoBtn.onclick = handleGeolocation;
}

// Expose helper to global window for inline onclick handlers
window.cancelBooking = cancelBooking;
window.switchTab = switchTab;
window.clearSearchAndCategory = clearSearchAndCategory;
window.fetchShops = fetchShops;

// --------------------------------------------------------------------------
// Start Application
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initSocket();
  fetchShops();
});
