(() => {
// --- data.js ---
/**
 * THE GEMNASIUM — Data Module
 * Cleaned up inventory with eBay-style items.
 * Rarities removed.
 */

let allItems = [];
let tcgItems = [];
let comicItems = [];

const gameInfo = {
  'Pokemon': {
    description: 'The world\'s most popular trading card game, featuring iconic characters like Charizard and Pikachu.',
    sets: ['Base Set', 'Jungle', 'Fossil', 'Team Rocket', 'Neo Genesis']
  },
  'Magic: The Gathering': {
    description: 'The original trading card game with complex mechanics and rich lore.',
    sets: ['Alpha', 'Beta', 'Unlimited', 'Arabian Nights', 'Antiquities']
  },
  'Yu-Gi-Oh!': {
    description: 'Duel Monsters card game based on the legendary anime series.',
    sets: ['Legend of Blue Eyes', 'Metal Raiders', 'Magic Ruler', 'Pharaoh\'s Servant']
  }
};

const publisherInfo = {
  'Marvel': {
    description: 'Home to Spider-Man, X-Men, Avengers, and the Marvel Cinematic Universe source material.',
    eras: ['Golden Age', 'Silver Age', 'Bronze Age', 'Modern Age']
  },
  'DC': {
    description: 'The legendary publisher of Batman, Superman, Wonder Woman, and the Justice League.',
    eras: ['Golden Age', 'Silver Age', 'Bronze Age', 'Modern Age']
  },
  'Image': {
    description: 'Creator-owned powerhouse featuring Spawn, The Walking Dead, and Saga.',
    eras: ['1990s', 'Modern Age']
  }
};

async function fetchInventory() {
  if (typeof supabase === 'undefined') return [];
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Error fetching products:", error);
      return [];
    }
    
    // Convert SQL rows to expected item format
    allItems = data.map(row => ({
      ...row,
      gradingCompany: row.grading_company,
      certNumber: row.cert_number
    }));
    
    tcgItems = allItems.filter(i => i.category === 'tcg');
    comicItems = allItems.filter(i => i.category === 'comic');
    return allItems;
  } catch(e) {
    console.warn("Failed to fetch products:", e);
    return [];
  }
}

const dashboardMetrics = [
  { id: 'revenue', title: 'Total Revenue', value: '...', trend: '+0%', status: 'positive' },
  { id: 'orders', title: 'Total Orders', value: '...', trend: '+0%', status: 'positive' },
  { id: 'portfolio', title: 'Portfolio Value', value: '...', trend: '+0%', status: 'positive' },
  { id: 'users', title: 'Total Users', value: '...', trend: '+0%', status: 'neutral' },
];

function getPlaceholderStyle(item) {
  const hash = item.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { bg: '#1a1a2e', accent: '#4a4e69' },
    { bg: '#221f1f', accent: '#e50914' },
    { bg: '#1c1c1c', accent: '#fca311' },
    { bg: '#0d1b2a', accent: '#415a77' }
  ];
  return colors[hash % colors.length];
}

// --- components.js ---
/**
 * THE GEMNASIUM — Shared Component Rendering Functions
 * Modular HTML generators for product cards, badges, navigation, and more
 */




/* ── Cart State (shared across pages via localStorage) ─────── */
const cart = {
  /** @returns {import('./data.js').CollectibleItem[]} */
  getItems() {
    try {
      return JSON.parse(localStorage.getItem('gemnasium_cart') || '[]');
    } catch { return []; }
  },
  
  /** @param {import('./data.js').CollectibleItem} item */
  addItem(item) {
    const items = this.getItems();
    if (!items.find(i => i.id === item.id)) {
      items.push(item);
      localStorage.setItem('gemnasium_cart', JSON.stringify(items));
    }
    this.updateBadge();
    return items;
  },
  
  /** @param {string} id */
  removeItem(id) {
    const items = this.getItems().filter(i => i.id !== id);
    localStorage.setItem('gemnasium_cart', JSON.stringify(items));
    this.updateBadge();
    return items;
  },
  
  clear() {
    localStorage.setItem('gemnasium_cart', '[]');
    this.updateBadge();
  },
  
  getCount() {
    return this.getItems().length;
  },
  
  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + item.price, 0);
  },
  
  updateBadge() {
    const badges = document.querySelectorAll('.navbar__cart-badge');
    const count = this.getCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }
};

/* ── Grade Badge Renderer ─────────────────────────────────────── */
/**
 * @param {import('./data.js').CollectibleItem} item
 * @returns {string} HTML for the grade badge
 */
function renderGradeBadge(item) {
  if (item.condition === 'raw') {
    return `<span class="badge badge-raw">RAW</span>`;
  }
  
  const company = item.gradingCompany || 'PSA';
  const classMap = { PSA: 'badge-psa', BGS: 'badge-bgs', CGC: 'badge-cgc' };
  const cls = classMap[company] || 'badge-psa';
  
  if (item.gemMint) {
    return `<span class="badge badge-gem">💎 ${company} ${item.grade}</span>`;
  }
  
  return `<span class="badge ${cls}">${company} ${item.grade}</span>`;
}

/* ── Rarity / Publisher Badge ────────────────────────────────── */
/**
 * @param {import('./data.js').CollectibleItem} item
 * @returns {string}
 */
function renderCategoryBadge(item) {
  if (item.category === 'tcg' && item.game) {
    const info = gameInfo[item.game];
    if (!info) return '';
    return `<span class="badge" style="color:${info.color};background:${info.bg};border:1px solid ${info.border}">${info.name}</span>`;
  }
  if (item.category === 'comic' && item.publisher) {
    const info = publisherInfo[item.publisher];
    if (!info) return '';
    return `<span class="badge" style="color:${info.color};background:${info.bg};border:1px solid ${info.border}">${item.publisher}</span>`;
  }
  return '';
}

/* ── Product Card Renderer ───────────────────────────────────── */
/**
 * @param {import('./data.js').CollectibleItem} item
 * @param {Object} [options]
 * @param {boolean} [options.showAddToCart=true]
 * @param {boolean} [options.compact=false]
 * @returns {string}
 */
function renderProductCard(item, options = {}) {
  const { showAddToCart = true, compact = false } = options;
  const placeholder = getPlaceholderStyle(item);
  const isGraded = item.condition === 'graded' || item.grade;
  const isComic = item.category === 'comics';
  
  const meta = isComic
    ? `<span class="product-card__meta-item">#${item.issueNumber}</span>
       <span class="product-card__meta-item">•</span>
       <span class="product-card__meta-item">${item.era || 'Modern'} Age</span>`
    : `<span class="product-card__meta-item">${item.set || ''}</span>
       ${item.setNumber ? `<span class="product-card__meta-item">•</span><span class="product-card__meta-item">${item.setNumber}</span>` : ''}`;



  return `
    <article class="product-card" data-id="${item.id}" data-category="${item.category}">
      <div class="product-card__image-wrap ${isComic ? 'comic' : ''}">
        <div class="product-card__image-placeholder" style="background: linear-gradient(180deg, ${placeholder.from}, ${placeholder.to})">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${placeholder.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5; width:48px; height:48px;">
            ${isComic
              ? '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'
              : '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>'
            }
          </svg>
          <span style="color:${placeholder.accent}; opacity:0.6">${item.collection_name || (item.category || '').toUpperCase()}</span>
        </div>
        <div class="product-card__badge-row">
          ${renderCategoryBadge(item)}
          ${renderGradeBadge(item)}
        </div>
        ${showAddToCart ? `
        <button class="product-card__quick-add btn btn-primary btn-xs" onclick="event.stopPropagation(); window.addToCart && window.addToCart('${item.id}')" title="Add to Cart">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Vault
        </button>` : ''}
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${item.collection_name || item.series || item.game || (item.category || '').toUpperCase()}</span>
        <h4 class="product-card__title">${item.title}</h4>
        <div class="product-card__meta">
          ${meta}

        </div>
      </div>
      <div class="product-card__footer">
        <span class="product-card__price">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        ${item.stockQty !== undefined ? `<span class="product-card__meta-item">${item.stockQty > 1 ? item.stockQty + ' available' : 'Last one!'}</span>` : ''}
      </div>
    </article>
  `;
}

/* ── Metric Card Renderer ────────────────────────────────────── */
/**
 * @param {Object} metric
 * @returns {string}
 */
function renderMetricCard(metric) {
  const iconSvgs = {
    'dollar-sign': '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    'layers': '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    'package': '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'
  };
  
  return `
    <div class="metric-card">
      <div class="metric-card__glow" style="background: ${metric.glowColor}"></div>
      <div class="metric-card__header">
        <div class="metric-card__icon" style="color: ${metric.glowColor}">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvgs[metric.icon] || ''}</svg>
        </div>
        <div class="metric-card__change ${metric.direction}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${metric.direction === 'up' 
              ? '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'
              : '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>'}
          </svg>
          ${metric.change}
        </div>
      </div>
      <div class="metric-card__value">${metric.value}</div>
      <div class="metric-card__label">${metric.label}</div>
    </div>
  `;
}

/* ── Navbar Renderer ─────────────────────────────────────────── */
/**
 * @param {'home' | 'shop' | 'admin'} activePage
 * @returns {string}
 */
function renderNavbar(activePage) {
  const cartCount = cart.getCount();
  // Safe check since auth might load asynchronously
  const user = window.currentUser;
  const isAdmin = window.isAdminUser;
  
  return `
    <nav class="navbar" id="main-navbar">
      <a href="index.html" class="navbar__logo">
        <div class="navbar__logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12l4 6-10 13L2 9Z"/>
            <path d="M11 3 8 9l4 13 4-13-3-6"/>
            <path d="M2 9h20"/>
          </svg>
        </div>
        <span class="navbar__logo-text">THE GEM<span>NASIUM</span></span>
      </a>
      
      <div class="navbar__nav" id="nav-links">
        <a href="index.html#home" class="navbar__link ${activePage === 'home' ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </a>
        <a href="shop.html" class="navbar__link ${activePage === 'shop' ? 'active' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          Shop
        </a>
        ${(isAdmin && activePage !== 'account') ? `
        <a href="index.html#admin" class="navbar__link ${activePage === 'admin' ? 'active' : ''}" id="admin-nav-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Command Center
        </a>` : ''}
      </div>
      
      <div class="navbar__actions">
        ${user ? `
          <div class="navbar__user" style="display:flex; align-items:center; gap:var(--space-3)">
            <a href="account.html" class="navbar__link" style="opacity:0.7; font-weight:bold;">Hi, ${user.user_metadata?.username || user.email.split('@')[0]}</a>
            <button class="btn btn-ghost btn-xs" onclick="window.handleSignOut()">Sign Out</button>
          </div>
        ` : `
          <button class="btn btn-ghost btn-xs" onclick="window.openAuthModal()">Sign In</button>
        `}
        <button class="navbar__cart-btn" id="cart-toggle-btn" onclick="window.toggleCart && window.toggleCart()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Vault
          <span class="navbar__cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
        </button>
        <button class="navbar__mobile-toggle" id="mobile-nav-toggle" onclick="document.getElementById('nav-links').classList.toggle('mobile-open')">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>
    </nav>
    
    ${renderAuthModal()}
    ${renderCheckoutModal()}
  `;
}

/* ── Auth Modal Renderer ─────────────────────────────────────── */
function renderAuthModal() {
  return `
    <div class="modal-overlay" id="auth-modal-overlay" onclick="if(event.target === this) window.closeAuthModal()">
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title" id="auth-modal-title">Sign In</h3>
          <button class="modal__close" onclick="window.closeAuthModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal__body">
          <div class="auth-tabs">
            <div class="auth-tab active" onclick="window.switchAuthTab('login')" id="tab-login">Login</div>
            <div class="auth-tab" onclick="window.switchAuthTab('register')" id="tab-register">Register</div>
          </div>
          
          <div id="auth-error" class="auth-error"></div>
          
          <form id="auth-form" class="auth-form-wrap" onsubmit="window.handleAuthSubmit(event)">
            <input type="hidden" id="auth-mode" value="login">
            
            <div class="form-group" id="group-username" style="display:none;">
              <label class="form-label" for="auth-username">Username</label>
              <input type="text" class="form-input" id="auth-username" placeholder="CollectorName">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="auth-email">Email Address</label>
              <input type="email" class="form-input" id="auth-email" placeholder="you@example.com" required>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <input type="password" class="form-input" id="auth-password" placeholder="••••••••" required>
              
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:var(--space-3)">
                <label style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--text-sm); color:var(--gm-slate-400); cursor:pointer;">
                  <input type="checkbox" style="accent-color: var(--gm-red)" onchange="document.getElementById('auth-password').type = this.checked ? 'text' : 'password'">
                  Show Password
                </label>
                <label id="auth-remember-wrap" style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--text-sm); color:var(--gm-slate-400); cursor:pointer;">
                  <input type="checkbox" id="auth-remember" style="accent-color: var(--gm-red)" checked>
                  Remember me
                </label>
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:var(--space-2)" id="auth-submit-btn">
              Sign In
            </button>
            
            <div style="text-align:center; margin-top:var(--space-2)">
              <button type="button" class="btn btn-ghost btn-xs" onclick="window.handlePasswordReset()" id="auth-reset-btn">Forgot Password?</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/* ── Checkout Modal Renderer ─────────────────────────────────── */
function renderCheckoutModal() {
  return `
    <div class="modal-overlay" id="checkout-modal-overlay" onclick="if(event.target === this) window.closeCheckoutModal()">
      <div class="modal" style="max-width: 768px; display: flex; flex-direction: column;">
        <div class="modal__header">
          <h3 class="modal__title" id="checkout-modal-title">Secure Checkout</h3>
          <button class="modal__close" onclick="window.closeCheckoutModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div class="modal__body" id="checkout-modal-body" style="padding: 0; display: flex; flex-wrap: wrap;">
          
          <!-- Left: Order Summary -->
          <div style="flex: 1; min-width: 280px; background: rgba(0,0,0,0.2); padding: var(--space-6); border-right: 1px solid var(--border-subtle);">
            <h4 style="margin-bottom: var(--space-4); color: var(--gm-slate-300);">Order Summary</h4>
            <div id="checkout-summary-items" style="max-height: 200px; overflow-y: auto; margin-bottom: var(--space-4);"></div>
            <div style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-4);">
              <div style="display:flex; justify-content:space-between; margin-bottom: var(--space-2);">
                <span style="color: var(--gm-slate-400);">Subtotal</span>
                <span id="checkout-subtotal">$0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom: var(--space-2);">
                <span style="color: var(--gm-slate-400);">Shipping</span>
                <span>$15.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom: var(--space-4);">
                <span style="color: var(--gm-slate-400);">Estimated Taxes</span>
                <span id="checkout-taxes">$0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-weight: 700; font-size: var(--text-lg); color: var(--gm-white);">
                <span>Total</span>
                <span id="checkout-total">$0.00</span>
              </div>
            </div>
          </div>
          
          <!-- Right: Checkout Steps -->
          <div style="flex: 1.5; min-width: 320px; padding: var(--space-6);">
            
            <div id="checkout-step-1">
              <h4 style="margin-bottom: var(--space-4); font-size: var(--text-lg); color: var(--gm-white);">1. Shipping Details</h4>
              <form id="checkout-shipping-form" onsubmit="window.handleCheckoutStep1(event)">
                <div class="form-group">
                  <label class="form-label" for="checkout-name">Full Name</label>
                  <input type="text" class="form-input" id="checkout-name" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="checkout-email">Email Address</label>
                  <input type="email" class="form-input" id="checkout-email" placeholder="you@example.com" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="checkout-address">Street Address</label>
                  <input type="text" class="form-input" id="checkout-address" placeholder="123 Collector St..." required style="margin-bottom: var(--space-3);">
                  <div style="display:flex; gap: var(--space-3);">
                    <input type="text" class="form-input" id="checkout-city" placeholder="City" required style="flex: 2;">
                    <input type="text" class="form-input" id="checkout-zip" placeholder="ZIP" required style="flex: 1;">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%; margin-top:var(--space-2)">
                  Continue to Payment
                </button>
              </form>
            </div>
            
            <div id="checkout-step-2" style="display: none;">
              <div style="display:flex; align-items:center; margin-bottom: var(--space-4); gap: var(--space-3);">
                <button class="btn btn-ghost btn-xs" onclick="window.handleCheckoutBackToShipping()" style="padding: 0; color: var(--gm-slate-400);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h4 style="font-size: var(--text-lg); color: var(--gm-white); margin:0;">2. Payment Method</h4>
              </div>
              
              <form id="checkout-payment-form" onsubmit="window.handleCheckoutSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Card Number</label>
                  <div style="position: relative;">
                    <input type="text" class="form-input" placeholder="0000 0000 0000 0000" required style="padding-left: 2.5rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--gm-slate-400);"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </div>
                </div>
                <div style="display:flex; gap: var(--space-3); margin-bottom: var(--space-4);">
                  <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label class="form-label">Expiry Date</label>
                    <input type="text" class="form-input" placeholder="MM/YY" required>
                  </div>
                  <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label class="form-label">CVC</label>
                    <input type="text" class="form-input" placeholder="123" required>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;" id="checkout-submit-btn">
                  Pay Now
                </button>
              </form>
            </div>
            
            <div id="checkout-success" style="display:none; text-align:center; padding: 2rem 0;">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gm-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem; margin-left:auto; margin-right:auto;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
               <h3 style="margin-bottom:0.5rem; color:var(--gm-white);">Order Confirmed!</h3>
               <p style="color:var(--gm-slate-400); font-size:var(--text-sm);">We've emailed your receipt and tracking info.</p>
               <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: var(--space-4); margin-top: var(--space-4);">
                 <p style="margin:0; font-weight:bold;">Order #: <span id="checkout-order-id" style="color:var(--gm-red);"></span></p>
               </div>
               <button class="btn btn-secondary" style="margin-top:2rem; width:100%;" onclick="window.closeCheckoutModal()">Close</button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  `;
}

/* ── Cart Drawer Renderer ────────────────────────────────────── */
function renderCartDrawer() {
  return `
    <div class="cart-overlay" id="cart-overlay" onclick="window.toggleCart && window.toggleCart()"></div>
    <aside class="cart-drawer" id="cart-drawer">
      <div class="cart-drawer__header">
        <div class="cart-drawer__title">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Your Cart
          <span class="cart-drawer__count" id="cart-count">(${cart.getCount()} items)</span>
        </div>
        <button class="cart-drawer__close" onclick="window.toggleCart && window.toggleCart()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="cart-drawer__items" id="cart-items">
        <!-- Populated dynamically -->
      </div>
      <div class="cart-drawer__footer" id="cart-footer">
        <div class="cart-drawer__subtotal">
          <span class="cart-drawer__subtotal-label">Subtotal</span>
          <span class="cart-drawer__subtotal-value" id="cart-subtotal">$0.00</span>
        </div>
        <button class="btn btn-primary btn-lg cart-drawer__checkout" onclick="window.openCheckoutModal()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          Proceed to Checkout
        </button>
      </div>
    </aside>
  `;
}

/* ── Footer Renderer ─────────────────────────────────────────── */
function renderFooter() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div>
            <a href="index.html" class="navbar__logo" style="margin-bottom: var(--space-2); display: inline-flex;">
              <div class="navbar__logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h12l4 6-10 13L2 9Z"/>
                  <path d="M11 3 8 9l4 13 4-13-3-6"/>
                  <path d="M2 9h20"/>
                </svg>
              </div>
              <span class="navbar__logo-text">THE GEM<span>NASIUM</span></span>
            </a>
            <p class="footer__brand-desc">The ultimate vault for elite TCG & comic collectors. Premium graded cards, key issues, and consignment services for serious collectors.</p>
          </div>
          <div>
            <h4 class="footer__heading">Marketplace</h4>
            <div class="footer__links">
              <a href="shop.html" class="footer__link">Browse All Artifacts</a>
              <a href="shop.html" class="footer__link">Sports Cards</a>
              <a href="shop.html" class="footer__link">TCG Singles</a>
              <a href="shop.html" class="footer__link">Comics & Marvel</a>
              <a href="shop.html" class="footer__link">Fine Art</a>
              <a href="shop.html" class="footer__link">Other Gems</a>
            </div>
          </div>
            <h4 class="footer__heading">Company</h4>
            <div class="footer__links">
              <a href="#" class="footer__link">About Us</a>
              <a href="#" class="footer__link">Contact</a>
              <a href="#" class="footer__link">FAQ</a>
              <a href="#" class="footer__link">Shipping Policy</a>
              <a href="#" class="footer__link">Terms of Service</a>
            </div>
          </div>
        </div>
        <div class="footer__bottom">
          <span class="footer__copyright">© 2026 The Gemnasium. All rights reserved. Not affiliated with PSA, BGS, or CGC.</span>
          <div class="footer__socials">
            <a href="https://www.ebay.com/str/thegemnasium" target="_blank" rel="noopener noreferrer" class="footer__social-icon" aria-label="eBay" style="font-weight: 800; font-size: 14px; text-decoration: none; color: currentColor;">
              eBay
            </a>
            <a href="https://www.instagram.com/the_gemnasium" target="_blank" rel="noopener noreferrer" class="footer__social-icon" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

/* ── Cart UI Logic ───────────────────────────────────────────── */
function updateCartDrawer() {
  const items = cart.getItems();
  const itemsContainer = document.getElementById('cart-items');
  const subtotalEl = document.getElementById('cart-subtotal');
  const countEl = document.getElementById('cart-count');
  const footerEl = document.getElementById('cart-footer');
  
  if (!itemsContainer) return;
  
  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-drawer__empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Your Cart is empty</p>
        <p style="margin-top:4px;font-size:12px;">Browse the marketplace to add items</p>
      </div>
    `;
    if (footerEl) footerEl.style.display = 'none';
  } else {
    itemsContainer.innerHTML = items.map(item => {
      const placeholder = getPlaceholderStyle(item);
      return `
        <div class="cart-item">
          <div class="cart-item__image" style="background: linear-gradient(180deg, ${placeholder.from}, ${placeholder.to}); display:flex; align-items:center; justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${placeholder.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
              ${item.category === 'comic'
                ? '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'
                : '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>'}
            </svg>
          </div>
          <div class="cart-item__info">
            <div class="cart-item__name">${item.title}</div>
            <div class="cart-item__details">${item.condition === 'graded' ? `${item.gradingCompany} ${item.grade}` : 'Raw'} • ${item.category === 'tcg' ? (item.set || 'TCG') : (item.publisher || 'Comic')}</div>
            <div class="cart-item__price">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <button class="cart-item__remove" onclick="window.removeFromCart('${item.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      `;
    }).join('');
    if (footerEl) footerEl.style.display = 'block';
  }
  
  if (subtotalEl) {
    subtotalEl.textContent = `$${cart.getSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (countEl) {
    countEl.textContent = `(${items.length} item${items.length !== 1 ? 's' : ''})`;
  }
}

/* ── Scroll Animation Observer ───────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

/* ── Navbar Scroll Effect ────────────────────────────────────── */
function initNavbarScroll() {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ── Toggle Cart Drawer ──────────────────────────────────────── */
function setupCart(allItemsArray) {
  window.toggleCart = function() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      const isOpen = drawer.classList.contains('open');
      drawer.classList.toggle('open');
      overlay.classList.toggle('open');
      document.body.style.overflow = isOpen ? '' : 'hidden';
      if (!isOpen) updateCartDrawer();
    }
  };
  
  window.addToCart = function(itemId) {
    const item = allItemsArray.find(i => i.id === itemId);
    if (item) {
      cart.addItem(item);
      updateCartDrawer();
      // Flash the cart button
      const btn = document.getElementById('cart-toggle-btn');
      if (btn) {
        btn.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.5)';
        btn.style.borderColor = 'rgba(220, 38, 38, 0.5)';
        setTimeout(() => {
          btn.style.boxShadow = '';
          btn.style.borderColor = '';
        }, 600);
      }
    }
  };
  
  window.removeFromCart = function(itemId) {
    cart.removeItem(itemId);
    updateCartDrawer();
  };
  
  // Initialize cart badge
  cart.updateBadge();
}

/* -- Auth UI Logic --------------------------------------------- */

window.openAuthModal = function() {
  const modal = document.getElementById("auth-modal-overlay");
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
};

window.closeAuthModal = function() {
  const modal = document.getElementById("auth-modal-overlay");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("auth-error").style.display = "none";
    document.getElementById("auth-form").reset();
  }
};

window.switchAuthTab = function(mode) {
  document.getElementById("auth-mode").value = mode;
  document.getElementById("tab-login").classList.toggle("active", mode === "login");
  document.getElementById("tab-register").classList.toggle("active", mode === "register");
  
  document.getElementById("group-username").style.display = mode === "register" ? "block" : "none";
  document.getElementById("auth-submit-btn").textContent = mode === "login" ? "Sign In" : "Register";
  document.getElementById("auth-modal-title").textContent = mode === "login" ? "Sign In" : "Create Account";
  document.getElementById("auth-error").style.display = "none";
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const mode = document.getElementById("auth-mode").value;
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const username = document.getElementById("auth-username").value;
  const errorEl = document.getElementById("auth-error");
  const btn = document.getElementById("auth-submit-btn");
  
  errorEl.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Processing...";
  
  try {
    if (mode === "login") {
      await auth.signIn(email, password);
    } else {
      await auth.signUp(email, password, username);
    }
    window.closeAuthModal();
  } catch (err) {
    errorEl.textContent = err.message || "An error occurred during authentication.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = mode === "login" ? "Sign In" : "Register";
  }
};

window.handleSignOut = async function() {
  try {
    await auth.signOut();
  } catch (err) {
    console.error("Sign out failed", err);
  }
};

window.handlePasswordReset = async function() {
  const email = document.getElementById("auth-email").value;
  const errorEl = document.getElementById("auth-error");
  if (!email) {
    errorEl.textContent = "Please enter your email first.";
    errorEl.style.display = "block";
    return;
  }
  
  try {
    await auth.resetPassword(email);
    errorEl.textContent = "Password reset link sent to your email!";
    errorEl.style.display = "block";
    errorEl.style.color = "var(--gm-emerald)";
    errorEl.style.background = "rgba(16, 185, 129, 0.1)";
  } catch (err) {
    errorEl.textContent = err.message || "Failed to send reset link.";
    errorEl.style.display = "block";
  }
};

// Initialize auth and update UI on changes
function initAuthAndNav() {
  auth.initAuth(async (user) => {
    window.currentUser = user;
    window.isAdminUser = await auth.checkIsAdmin();
    
    // Re-render navbar
    const activePage = window.location.pathname.includes("shop") ? "shop" 
                     : window.location.hash === "#admin" ? "admin" 
                     : "home";
    const navRoot = document.getElementById("navbar-root");
    if (navRoot) {
      navRoot.innerHTML = renderNavbar(activePage);
    }
    
    // Protect admin route
    if (activePage === "admin" && !window.isAdminUser) {
      window.location.href = "index.html";
    }
  });
}

/* ── Checkout Modal Handlers ─────────────────────────────────── */
window.openCheckoutModal = function() {
  if (cart.getItems().length === 0) {
    alert("Your Cart is empty!");
    return;
  }
  
  if (window.toggleCart) window.toggleCart(); // Close the cart drawer
  
  // Populate summary
  const itemsContainer = document.getElementById("checkout-summary-items");
  const items = cart.getItems();
  let subtotal = 0;
  
  itemsContainer.innerHTML = items.map(item => {
    subtotal += item.price;
    return `
      <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-2); font-size:var(--text-sm);">
        <span style="color:var(--gm-slate-300); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px;">${item.title}</span>
        <span style="color:var(--gm-white);">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    `;
  }).join('');
  
  const shipping = 15.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  
  document.getElementById("checkout-subtotal").textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById("checkout-taxes").textContent = `$${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById("checkout-total").textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  
  // Reset steps
  document.getElementById("checkout-step-1").style.display = "block";
  document.getElementById("checkout-step-2").style.display = "none";
  document.getElementById("checkout-success").style.display = "none";
  document.getElementById("checkout-modal-title").textContent = "Secure Checkout";
  
  const overlay = document.getElementById("checkout-modal-overlay");
  
  // Pre-fill email if logged in
  if (window.currentUser && window.currentUser.email) {
    document.getElementById("checkout-email").value = window.currentUser.email;
  }
  if (window.currentUser && window.currentUser.user_metadata?.username) {
    document.getElementById("checkout-name").value = window.currentUser.user_metadata.username;
  }
  
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
};

window.handleCheckoutStep1 = function(e) {
  e.preventDefault();
  document.getElementById("checkout-step-1").style.display = "none";
  document.getElementById("checkout-step-2").style.display = "block";
};

window.handleCheckoutBackToShipping = function() {
  document.getElementById("checkout-step-2").style.display = "none";
  document.getElementById("checkout-step-1").style.display = "block";
};

window.closeCheckoutModal = function() {
  const overlay = document.getElementById("checkout-modal-overlay");
  overlay.classList.remove("open");
  document.body.style.overflow = "";
};

window.handleCheckoutSubmit = async function(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById("checkout-submit-btn");
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Processing...";
  submitBtn.disabled = true;
  
  const customerDetails = {
    name: document.getElementById("checkout-name").value,
    email: document.getElementById("checkout-email").value,
    address: document.getElementById("checkout-address").value + ', ' + document.getElementById("checkout-city").value + ' ' + document.getElementById("checkout-zip").value
  };
  
  try {
    const result = await processCheckout(cart.getItems(), customerDetails);
    
    // Success
    cart.clear();
    document.getElementById("checkout-step-2").style.display = "none";
    document.getElementById("checkout-order-id").textContent = result.orderId;
    document.getElementById("checkout-success").style.display = "block";
    document.getElementById("checkout-modal-title").textContent = "Order Complete";
    
  } catch (err) {
    console.error("Checkout failed", err);
    alert("Checkout failed. Please try again.");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
};

// --- auth.js ---
/**
 * THE GEMNASIUM — Authentication Module
 * Handles Supabase auth/db and EmailJS integration based on szhservices logic.
 */

// --- CONFIGURATION ---
const SUPABASE_URL = "https://mtwrprrknrexcctbbkxp.supabase.co";
const SUPABASE_KEY = "sb_publishable_TtiuNljb4iOFQRdhIF_PwA_c26l1Shw"; 
let supabase = null;

try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.error("Failed to initialize Supabase. Check if your SUPABASE_KEY is a valid JWT 'anon' public key:", err);
}

const EMAILJS_PUBLIC_KEY = "5lgAgnxD9RDulnWsp"; 
// Note: You didn't provide a Service ID, so I left a placeholder below. 
// You can find it in EmailJS under "Email Services"
const EMAILJS_SERVICE_ID = "service_jz7o6ji"; 
const EMAILJS_SIGNUP_TEMPLATE = "template_67vfxdy";
const EMAILJS_RECOVERY_TEMPLATE = "template_qng8n4c";
const EMAILJS_ORDER_TEMPLATE = "template_4nnbdce";

// Initialize EmailJS
if (window.emailjs) {
  window.emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
  const checkEmailJS = setInterval(() => {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      clearInterval(checkEmailJS);
    }
  }, 500);
}

// --- STATE ---
let currentUser = null;

/**
 * Initializes auth listener
 */
function initAuth(onStateChange) {
  if (!supabase) {
    if (onStateChange) onStateChange(null);
    return;
  }
  
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user || null;
    if (onStateChange) onStateChange(currentUser);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (onStateChange) onStateChange(currentUser);
  });
}

/**
 * Check if current user is an admin
 */
async function checkIsAdmin() {
  if (!currentUser || !supabase) return false;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();
    
  if (error || !data) {
    return currentUser.user_metadata?.role === 'admin';
  }
  return data.role === 'admin';
}

/**
 * Sign In
 */
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign Up with EmailJS verification sent
 */
async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        role: 'user'
      }
    }
  });
  
  if (error) throw error;

  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_SIGNUP_TEMPLATE,
      {
        to_email: email,
        to_name: username || email.split('@')[0],
        message: "Welcome to The Gemnasium! Your elite collector vault account has been created."
      }
    );
  } catch (emailError) {
    console.warn("Failed to send welcome email:", emailError);
  }

  return data;
}

/**
 * Sign Out
 */
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Password Recovery
 */
async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;

  try {
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_RECOVERY_TEMPLATE,
      {
        to_email: email,
        message: "You requested a password reset. Please follow the instructions sent to your email."
      }
    );
  } catch (emailError) {
    console.warn("Failed to send recovery email:", emailError);
  }

  return data;
}

/**
 * Process Checkout
 */
async function processCheckout(cartItems, customerDetails) {
  // 1. Calculate Total
  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  
  // 2. Insert into Supabase 'orders' table (if available)
  let orderNumber = '#ORDER-' + Math.floor(Math.random() * 1000000);
  
  if (supabase) {
    try {
      const newOrderId = crypto.randomUUID();
      
      const { error: orderError } = await supabase.from('orders').insert([{
        id: newOrderId,
        customer_email: customerDetails.email,
        customer_name: customerDetails.name,
        shipping_address: customerDetails.address,
        total_amount: subtotal,
        status: 'pending'
      }]);
      
      if (!orderError) {
        orderNumber = '#ORDER-' + newOrderId.split('-')[0].toUpperCase();
        
        // Insert order items
        const orderItems = cartItems.map(item => ({
          order_id: newOrderId,
          product_id: item.id,
          product_title: item.title,
          price: item.price
        }));
        
        // Fire and forget items insertion (so it doesn't block if there's an RLS issue)
        await supabase.from('order_items').insert(orderItems);
      } else {
        throw orderError;
      }
    } catch (e) {
      console.warn("Database insert failed (tables might not exist yet), falling back to email only.", e);
    }
  }

  // 3. Send Order Confirmation Email
  try {
    const itemList = cartItems.map(item => `- ${item.title} ($${item.price.toFixed(2)})`).join('\n');
    
    await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_ORDER_TEMPLATE,
      {
        to_email: customerDetails.email,
        email: customerDetails.email,
        to_name: customerDetails.name,
        name: customerDetails.name,
        order_id: orderNumber,
        order_total: "$" + subtotal.toFixed(2),
        order_items: itemList,
        shipping_address: customerDetails.address,
        address: customerDetails.address
      }
    );
  } catch (emailError) {
    console.warn("Failed to send order confirmation email:", emailError);
  }

  return { orderId: orderNumber, subtotal };
}

window.handleGoogleSignIn = async function() {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Google Auth Error:', err);
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  }
};

// Expose auth object for bundled files
const auth = {
  supabase,
  currentUser,
  initAuth,
  checkIsAdmin,
  signIn,
  signUp,
  signOut,
  resetPassword,
  processCheckout
};
window.auth = auth;

// --- account.js ---



document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Render
  document.getElementById('navbar-root').innerHTML = renderNavbar('account') + renderCartDrawer();
  document.getElementById('footer-root').innerHTML = renderFooter();

  // 2. Auth Init
  auth.initAuth(async (user) => {
    window.currentUser = user;
    if (!user) {
      window.location.href = 'index.html'; // Redirect guests
      return;
    }
    
    // Update navbar now that we have the user
    document.getElementById('navbar-root').innerHTML = renderNavbar('account') + renderCartDrawer();
    
    // Update header
    document.getElementById('account-email').textContent = user.email;
    const name = user.user_metadata?.username || user.email.split('@')[0];
    document.getElementById('account-title').textContent = `Hi, ${name}`;
    
    // Fetch orders
    await fetchUserOrders(user.email);
  });
});

async function fetchUserOrders(email) {
  const container = document.getElementById('orders-container');
  
  if (!auth.supabase) {
    container.innerHTML = `<p style="color:var(--gm-slate-400)">Database not connected. Unable to fetch orders.</p>`;
    return;
  }
  
  try {
    const { data: orders, error } = await auth.supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('customer_email', email)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:var(--space-8); background:var(--gm-void-light); border-radius:var(--radius-lg); border:var(--border-subtle)">
          <p style="color:var(--gm-slate-400); margin-bottom:var(--space-4)">You haven't placed any orders yet.</p>
          <a href="shop.html" class="btn btn-primary">Browse Shop</a>
        </div>
      `;
      return;
    }
    
    container.innerHTML = orders.map(renderOrderCard).join('');
    
  } catch (err) {
    console.error("Error fetching orders:", err);
    container.innerHTML = `<p style="color:var(--gm-red)">Failed to load your orders. Please try again later.</p>`;
  }
}

function renderOrderCard(order) {
  const orderIdText = '#ORDER-' + order.id.toString().padStart(6, '0');
  
  const subtotal = order.total_amount;
  const shipping = subtotal > 0 ? 15.00 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  let itemsHtml = '';
  if (order.order_items && order.order_items.length > 0) {
    itemsHtml = order.order_items.map(item => `
      <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #1f1f23;">
        <tr style="vertical-align: middle;">
          <td style="padding: 16px 0; width: 64px;">
            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 4px; padding: 4px; width: 56px; height: 76px; overflow: hidden; text-align: center;">
              <img style="max-width: 100%; max-height: 100%; object-fit: contain; vertical-align: middle;" src="https://images.unsplash.com/photo-1614030635205-020584485ce4?auto=format&fit=crop&w=150&q=80" alt="item" />
            </div>
          </td>
          <td style="padding: 16px 12px; width: auto;">
            <div style="color: #ffffff; font-weight: 600; font-size: 14px; line-height: 1.4;">${item.product_title}</div>
            <div style="font-size: 12px; color: #71717a; padding-top: 4px; font-weight: 500;">QTY: <span style="color: #a1a1aa;">1</span></div>
          </td>
          <td style="padding: 16px 0; white-space: nowrap; text-align: right; vertical-align: middle;">
            <strong style="color: #ffffff; font-size: 15px;">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </td>
        </tr>
      </table>
    `).join('');
  }
  
  let trackingHtml = '';
  if (order.tracking_number) {
    trackingHtml = `
      <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px dashed #34d399; border-radius: 8px; color: #34d399; text-align: center; font-weight: bold; font-size: 14px;">
        Tracking Number: ${order.tracking_number}
      </div>
    `;
  }
  
  return `
<div style="font-family: 'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #e4e4e7; padding: 40px 14px; background-color: #09090b; line-height: 1.6; border-radius: 12px; margin-bottom: 24px; border: 1px solid var(--border-subtle);">
  <div style="max-width: 550px; margin: auto; background-color: #121214; border: 1px solid #27272a; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); overflow: hidden;">
    
    <div style="background-color: #000000; padding: 20px 24px; border-bottom: 2px solid #dc2626;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <span style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
              THE <span style="color: #dc2626;">GEMNASIUM</span>
            </span>
          </td>
          <td style="text-align: right;">
            <span style="font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; border-left: 2px solid #dc2626; padding-left: 12px;">
              Order ${order.status === 'shipped' ? 'Shipped' : 'Secured'}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="padding: 24px;">
      <p style="color: #a1a1aa; margin-top: 0; margin-bottom: 20px;">
        Your submission has been locked in. We are preparing your collectibles for secure transport.
      </p>
      
      <div style="text-align: left; font-size: 14px; padding-bottom: 8px; border-bottom: 1px solid #27272a; color: #ffffff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        Order Invoice ${orderIdText}
      </div>
      
      ${itemsHtml}
      
      <table style="border-collapse: collapse; width: 100%; text-align: right; margin-top: 20px; font-size: 13px; color: #a1a1aa;">
        <tr>
          <td style="width: 60%;"></td>
          <td style="padding: 6px 0;">Standard Shipping</td>
          <td style="padding: 6px 0 6px 16px; white-space: nowrap; color: #ffffff;">$${shipping.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="width: 60%;"></td>
          <td style="padding: 6px 0;">Estimated Taxes</td>
          <td style="padding: 6px 0 6px 16px; white-space: nowrap; color: #ffffff;">$${tax.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="width: 60%;"></td>
          <td style="padding: 16px 0 0 0; border-top: 1px solid #27272a;">
            <strong style="white-space: nowrap; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 13px;">Total Invested</strong>
          </td>
          <td style="padding: 16px 0 0 16px; border-top: 1px solid #27272a; white-space: nowrap; text-align: right;">
            <strong style="color: #dc2626; font-size: 18px;">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </td>
        </tr>
      </table>
      
      ${trackingHtml}
    </div>
  </div>
  
  <div style="max-width: 550px; margin: auto; padding: 24px 8px; text-align: center;">
    <p style="color: #52525b; font-size: 12px; margin: 0; line-height: 1.5;">
      This order confirmation was generated for <span style="color: #a1a1aa;">${order.customer_email}</span>.<br />
      Thank you for acquiring your gems through THE GEMNASIUM.
    </p>
  </div>
</div>
  `;
}

})();
