/**
 * Slotify — Customer-Facing Live Availability Portal JS
 * Mobile-First Lovable UI Architecture with Real-Time Socket.io Streaming
 */

const API_BASE_URL = (() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('api')) return urlParams.get('api');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return `http://${window.location.hostname}:5000`;
})();

// Curated Studio Photography & Meta Mapping
const STUDIO_PHOTO_MAP = {
  'The Foundry Barbers': {
    photo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
    distance: '1.2 KM',
    rating: '4.9',
    reviews: '82 REVIEWS',
    tagline: 'Precision cuts & classic shaves',
  },
  'Lumina Skin Studio': {
    photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    distance: '2.4 KM',
    rating: '4.8',
    reviews: '64 REVIEWS',
    tagline: 'Skin rituals & modern hair styling',
  },
  'Luxe Salon & Studio': {
    photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    distance: '1.8 KM',
    rating: '4.9',
    reviews: '96 REVIEWS',
    tagline: 'Luxury balayage, cut & scalp care',
  },
  'Apex Barber Co.': {
    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    distance: '0.9 KM',
    rating: '4.9',
    reviews: '124 REVIEWS',
    tagline: 'Master fades & hot towel grooming',
  },
  'Glow Sanctuary': {
    photo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    distance: '3.1 KM',
    rating: '4.7',
    reviews: '52 REVIEWS',
    tagline: 'Holistic organic skin & wellness',
  },
};

const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80';

// State
let allShops = [];
let shopSlotsCache = {}; // shopId -> slots[]
let selectedShop = null;
let selectedSlot = null;
let activeCategory = 'all';
let searchQuery = '';
let socket = null;

// DOM Selectors
const liveHeaderText = document.getElementById('live-header-text');
const totalOpeningsCount = document.getElementById('total-openings-count');
const livePulseDot = document.getElementById('live-pulse-dot');
const studiosOnlineCount = document.getElementById('studios-online-count');
const searchInput = document.getElementById('search-input');
const geoBtn = document.getElementById('geo-btn');
const categoriesScroll = document.getElementById('categories-scroll');
const studiosFeed = document.getElementById('studios-feed');

// Floating Dock
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
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to Slotify server:', socket.id);
      if (livePulseDot) livePulseDot.style.background = '#34D399';

      // Join rooms for all known shops
      allShops.forEach((shop) => {
        socket.emit('join_shop', shop.id);
      });
    });

    socket.on('disconnect', () => {
      if (livePulseDot) livePulseDot.style.background = '#EF4444';
    });

    // Real-time slot update
    socket.on('slot_changed', (data) => {
      console.log('[Socket] Live slot_changed:', data);
      if (data.shopId && data.slots) {
        shopSlotsCache[data.shopId] = data.slots;
        refreshShopSlotPills(data.shopId);
        updateTotalOpenings();
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
        renderFeed();
      }
    });
  } catch (err) {
    console.error('Socket initialization failed:', err);
  }
}

// --------------------------------------------------------------------------
// API Fetching & Cache
// --------------------------------------------------------------------------
async function fetchShops() {
  try {
    const res = await fetch(`${API_BASE_URL}/shops`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allShops = data;

    // Fetch slot grids in parallel for each shop
    await Promise.all(
      allShops.map(async (shop) => {
        try {
          const statusRes = await fetch(`${API_BASE_URL}/shops/${shop.id}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            shopSlotsCache[shop.id] = statusData.slots || [];
          }
        } catch (e) {
          console.warn(`Failed to fetch slots for shop ${shop.name}:`, e);
        }
      })
    );

    updateTotalOpenings();
    renderFeed();

    // Auto-select first available slot for instant booking
    autoSelectFirstOpenSlot();

    // Re-join socket rooms
    if (socket && socket.connected) {
      allShops.forEach((s) => socket.emit('join_shop', s.id));
    }
  } catch (err) {
    console.error('Error fetching shops:', err);
    studiosFeed.innerHTML = `
      <div class="empty-state">
        <p style="color: #EF4444; font-weight: 700;">Could not connect to live API at ${API_BASE_URL}</p>
        <p style="margin-top: 8px; color: #94A3B8;">Ensure backend server is running on port 5000.</p>
        <button onclick="fetchShops()" style="margin-top: 14px; background: #7DD3FC; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 800; cursor: pointer;">Retry Connection</button>
      </div>
    `;
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
  if (selectedSlot && selectedShop) {
    dockCtaLabel.textContent = `Book ${selectedSlot.start}`;
  } else {
    dockCtaLabel.textContent = 'Explore Openings';
  }
}

// --------------------------------------------------------------------------
// Feed Rendering (Signature Lovable UI)
// --------------------------------------------------------------------------
function renderFeed() {
  const filtered = allShops.filter((shop) => {
    const matchesCategory =
      activeCategory === 'all' ||
      shop.category.toLowerCase().includes(activeCategory.toLowerCase());

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      shop.name.toLowerCase().includes(q) ||
      shop.category.toLowerCase().includes(q) ||
      (shop.area && shop.area.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    studiosFeed.innerHTML = `
      <div class="empty-state">
        <p style="font-weight: 700; color: #F8FAFC; font-size: 16px;">No live studios found</p>
        <p style="color: #64748B; margin-top: 4px;">Try selecting another category or clear search filter.</p>
      </div>
    `;
    return;
  }

  studiosFeed.innerHTML = filtered
    .map((shop) => {
      const meta = STUDIO_PHOTO_MAP[shop.name] || {
        photo: DEFAULT_PHOTO,
        distance: '1.5 KM',
        rating: '4.8',
        reviews: '70 REVIEWS',
        tagline: `${shop.category} • ${shop.area || 'Metro Area'}`,
      };

      const slots = shopSlotsCache[shop.id] || [];
      const isOpen = shop.status === 'available';

      return `
        <article class="studio-feed-card" data-shop-id="${shop.id}">
          <!-- Photo Banner with Badges -->
          <div class="card-media-wrapper">
            <img src="${meta.photo}" alt="${shop.name} interior" class="card-media-img" loading="lazy" />
            <div class="card-gradient-overlay"></div>

            <div class="card-distance-badge">${meta.distance}</div>
            
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

function renderSlotPillsHtml(shop, slots) {
  if (!slots || slots.length === 0) {
    return `<span style="font-size: 11px; color: #64748B; padding: 6px 0;">No scheduled slots today</span>`;
  }

  // Pick up to 8 most relevant slots
  return slots
    .slice(0, 8)
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
// Slide-Up Bottom Sheet Modal (Image 5 & Image 7 Reference)
// --------------------------------------------------------------------------
function openBookingSheet(shop, slot) {
  selectedShop = shop;
  selectedSlot = slot;

  const meta = STUDIO_PHOTO_MAP[shop.name] || {};
  sheetCategoryTag.textContent = shop.category || 'Barbershop';
  sheetShopName.textContent = shop.name;
  sheetShopAddress.textContent = `${shop.area || 'Indore'} • ${meta.distance || '1.2 KM'}`;
  sheetSlotTime.textContent = `Today, ${slot.start} – ${slot.end}`;

  const phone = shop.phone || '+91 98260 12345';
  sheetPhoneVal.textContent = phone;
  sheetDirectCallBtn.href = `tel:${phone.replace(/\s+/g, '')}`;

  sheetSuccessBox.style.display = 'none';
  sheetReserveForm.style.display = 'flex';

  bottomSheet.classList.add('open');
  bottomSheet.setAttribute('aria-hidden', 'false');
}

function closeBookingSheet() {
  bottomSheet.classList.remove('open');
  bottomSheet.setAttribute('aria-hidden', 'true');
}

// Handle Reservation Form Submit
if (sheetReserveForm) {
  sheetReserveForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!selectedShop || !selectedSlot) return;

    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const submitBtn = document.getElementById('sheet-submit-btn');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Broadcasting to Studio...';

      // Call Express API to reserve slot
      const res = await fetch(`${API_BASE_URL}/shops/${selectedShop.id}/slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIds: [selectedSlot.id],
          status: 'booked',
          customerName: `${name} (${phone})`,
        }),
      });

      if (!res.ok) throw new Error('Failed to reserve slot');

      // Update local cache
      selectedSlot.status = 'booked';
      refreshShopSlotPills(selectedShop.id);
      updateTotalOpenings();

      sheetReserveForm.style.display = 'none';
      sheetSuccessBox.style.display = 'block';

      // Auto close after 2.5s
      setTimeout(() => {
        closeBookingSheet();
      }, 2500);
    } catch (err) {
      alert('Could not complete reservation: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Slot & Broadcast to Studio';
    }
  };
}

// --------------------------------------------------------------------------
// Event Listeners
// --------------------------------------------------------------------------
if (sheetBackdrop) sheetBackdrop.onclick = closeBookingSheet;
if (sheetCloseBtn) sheetCloseBtn.onclick = closeBookingSheet;

if (dockCtaBtn) {
  dockCtaBtn.onclick = () => {
    if (selectedShop && selectedSlot) {
      openBookingSheet(selectedShop, selectedSlot);
    } else {
      autoSelectFirstOpenSlot();
      if (selectedShop && selectedSlot) {
        openBookingSheet(selectedShop, selectedSlot);
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
    renderFeed();
  });
}

// Geo locate button
if (geoBtn) {
  geoBtn.onclick = () => {
    if (liveHeaderText) {
      liveHeaderText.textContent = '📍 LOCATED NEAR RAJWADA, INDORE';
      setTimeout(() => {
        liveHeaderText.innerHTML = `LIVE NEAR INDORE • <span id="total-openings-count">${totalOpeningsCount.textContent}</span> OPENINGS`;
      }, 4000);
    }
  };
}

// --------------------------------------------------------------------------
// Start Application
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  fetchShops();
});
