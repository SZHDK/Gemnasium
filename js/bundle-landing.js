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

// --- admin.js ---
/**
 * THE GEMNASIUM — Admin Dashboard Logic
 * Metrics rendering, inventory table, modal management, CRUD actions
 */




/* ── State ───────────────────────────────────────────────────── */
let inventoryItems = []; // mutable copy
let currentTab = 'all';
let searchQuery = '';
let modalCategory = 'tcg';

/* ── Initialize ──────────────────────────────────────────────── */
function initAdmin() {
  inventoryItems = [...allItems];
  // Render metrics
  renderMetrics();
  
  // Initial inventory render
  renderQuickStats();
  renderInventoryTable();
  renderModalDynamicFields();
}

/* ── Metrics ─────────────────────────────────────────────────── */
async function renderMetrics() {
  const grid = document.getElementById('metrics-grid');
  if (!grid) return;

  // Portfolio Value
  const portfolioValue = inventoryItems.reduce((sum, item) => sum + (item.price || 0), 0);

  // Default values
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalUsers = 0;

  try {
    if (typeof supabase !== 'undefined') {
      const [ordersRes, usersRes] = await Promise.all([
        supabase.from('orders').select('total_amount'),
        supabase.from('profiles').select('id', { count: 'exact' })
      ]);
      
      if (ordersRes.data) {
        totalOrders = ordersRes.data.length;
        totalRevenue = ordersRes.data.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      }
      if (usersRes.count) {
        totalUsers = usersRes.count;
      }
    }
  } catch(e) {
    console.error('Error fetching dynamic metrics:', e);
  }

  const dynamicMetrics = [
    { label: 'Total Revenue', value: '$' + totalRevenue.toLocaleString(), change: '+0%', direction: 'up', icon: 'dollar-sign', glowColor: 'var(--gm-green)' },
    { label: 'Total Orders', value: totalOrders.toString(), change: '+0%', direction: 'up', icon: 'package', glowColor: 'var(--gm-blue)' },
    { label: 'Portfolio Value', value: '$' + portfolioValue.toLocaleString(), change: '+0%', direction: 'up', icon: 'layers', glowColor: 'var(--gm-gold)' },
    { label: 'Total Users', value: totalUsers.toString(), change: '+0%', direction: 'up', icon: 'trending-up', glowColor: 'var(--gm-purple)' },
  ];

  grid.innerHTML = dynamicMetrics.map(m => renderMetricCard(m)).join('');
  
  // Animate values
  setTimeout(() => {
    document.querySelectorAll('.metric-card__value').forEach(el => {
      el.style.animation = 'countUp 0.6s var(--ease-out)';
    });
  }, 200);
}

/* ── Quick Stats ─────────────────────────────────────────────── */
function renderQuickStats() {
  const container = document.getElementById('quick-stats');
  if (!container) return;
  
  const totalItems = inventoryItems.length;
  const gradedItems = inventoryItems.filter(i => i.condition === 'graded').length;
  const rawItems = inventoryItems.filter(i => i.condition === 'raw').length;
  const tcgCount = inventoryItems.filter(i => i.category === 'tcg').length;
  const comicCount = inventoryItems.filter(i => i.category === 'comic').length;
  
  container.innerHTML = `
    <div class="quick-stat">
      <div class="quick-stat__dot" style="background: var(--gm-white)"></div>
      <span class="quick-stat__label">Total Items:</span>
      <span class="quick-stat__value">${totalItems}</span>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__dot" style="background: var(--gm-gold)"></div>
      <span class="quick-stat__label">Graded:</span>
      <span class="quick-stat__value">${gradedItems}</span>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__dot" style="background: var(--gm-slate-500)"></div>
      <span class="quick-stat__label">Raw:</span>
      <span class="quick-stat__value">${rawItems}</span>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__dot" style="background: var(--gm-purple)"></div>
      <span class="quick-stat__label">TCG:</span>
      <span class="quick-stat__value">${tcgCount}</span>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__dot" style="background: var(--gm-blue)"></div>
      <span class="quick-stat__label">Comics:</span>
      <span class="quick-stat__value">${comicCount}</span>
    </div>
  `;
}

/* ── Inventory Table ─────────────────────────────────────────── */
function getFilteredInventory() {
  let items = [...inventoryItems];
  
  // Filter by tab
  if (currentTab !== 'all') {
    items = items.filter(i => i.category === currentTab);
  }
  
  // Filter by search
  if (searchQuery) {
    items = items.filter(i => {
      const str = [i.title, i.set, i.series, i.publisher, i.game, i.certNumber]
        .filter(Boolean).join(' ').toLowerCase();
      return str.includes(searchQuery);
    });
  }
  
  return items;
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;
  
  const items = getFilteredInventory();
  
  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:var(--space-12); color:var(--gm-slate-600);">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto var(--space-3); display:block; opacity:0.3"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          No items found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = items.map(item => {
    const placeholder = getPlaceholderStyle(item);
    const isTCG = item.category === 'tcg';
    const setPublisher = isTCG ? (item.set || '—') : (item.publisher || '—');
    const subInfo = isTCG 
      ? (item.game ? (gameInfo[item.game]?.name || item.game) : '—')
      : (item.series ? `${item.series} #${item.issueNumber}` : '—');
    
    const stockClass = (item.stockQty || 0) <= 1 ? 'low' : 'ok';
    
    return `
      <tr data-id="${item.id}">
        <td>
          <div class="data-table__item-info">
            <div class="data-table__thumb" style="background: linear-gradient(180deg, ${placeholder.from}, ${placeholder.to}); display:flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${placeholder.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
                ${isTCG
                  ? '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>'
                  : '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'}
              </svg>
            </div>
            <div>
              <div class="data-table__item-name">${item.title}</div>
              <div class="data-table__item-sub">${subInfo}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${isTCG ? 'badge-rarity' : 'badge-featured'}">${isTCG ? 'TCG' : 'Comic'}</span>
        </td>
        <td>${setPublisher}</td>
        <td>${renderGradeBadge(item)}</td>
        <td>${item.certNumber ? `<span class="table-cert">${item.certNumber}</span>` : '<span style="color:var(--gm-slate-700)">—</span>'}</td>
        <td><span class="table-stock ${stockClass}">${item.stockQty || 0}</span></td>
        <td><span class="table-price">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
        <td>
          <div class="data-table__actions" id="actions-${item.id}">
            <button class="table-action-btn edit" title="Edit" onclick="editItem('${item.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <button class="table-action-btn delete" title="Delete" onclick="confirmDelete('${item.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── Inventory Tab Switching ─────────────────────────────────── */
window.switchInventoryTab = function(tab) {
  currentTab = tab;
  document.querySelectorAll('#inventory-tabs .inventory-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderInventoryTable();
  renderQuickStats();
};

/* ── Inventory Search ────────────────────────────────────────── */
window.filterInventory = function() {
  const input = document.getElementById('inventory-search');
  searchQuery = (input?.value || '').trim().toLowerCase();
  renderInventoryTable();
};

/* ── Delete Actions ──────────────────────────────────────────── */
window.confirmDelete = function(id) {
  const actionsEl = document.getElementById(`actions-${id}`);
  if (!actionsEl) return;
  
  actionsEl.innerHTML = `
    <div class="delete-confirm">
      <span class="delete-confirm__text">Delete?</span>
      <button class="btn btn-danger btn-xs" onclick="deleteItem('${id}')">Yes</button>
      <button class="btn btn-ghost btn-xs" onclick="cancelDelete('${id}')">No</button>
    </div>
  `;
};

window.cancelDelete = function(id) {
  renderInventoryTable();
};

window.deleteItem = function(id) {
  inventoryItems = inventoryItems.filter(i => i.id !== id);
  renderInventoryTable();
  renderQuickStats();
};

/* ── Edit Action ─────────────────────────────────────────────── */
window.editItem = function(id) {
  const item = inventoryItems.find(i => i.id === id);
  if (!item) return;
  
  // Pre-fill modal with existing data
  openAddModal();
  
  // Set category
  selectModalCategory(item.category);
  
  // Fill fields
  setTimeout(() => {
    document.getElementById('item-title').value = item.title;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-condition').value = item.condition;
    document.getElementById('item-stock').value = item.stockQty || 1;
    
    if (item.condition === 'graded') {
      toggleGradeFields();
      document.getElementById('item-grading-company').value = item.gradingCompany || 'PSA';
      document.getElementById('item-grade').value = item.grade || '';
      document.getElementById('item-cert').value = item.certNumber || '';
    }
    
    const collectionInput = document.getElementById('item-collection');
    if (collectionInput) collectionInput.value = item.collection_name || item.game || item.publisher || '';
    
    const eraInput = document.getElementById('item-era');
    if (eraInput) eraInput.value = item.era || item.set || '';
    
    const variantInput = document.getElementById('item-variant');
    if (variantInput) variantInput.value = item.variant || item.issueNumber || '';
    
    // Change modal title for editing
    const modalTitle = document.querySelector('.modal__title');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px;color:var(--gm-blue-light)"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        Edit Item
      `;
    }
    
    // Store editing ID
    document.getElementById('add-item-form').dataset.editId = id;
  }, 50);
};

/* ── Modal Management ────────────────────────────────────────── */
window.openAddModal = function() {
  const overlay = document.getElementById('add-modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeAddModal = function() {
  const overlay = document.getElementById('add-modal-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  
  // Reset form
  document.getElementById('add-item-form').reset();
  document.getElementById('add-item-form').removeAttribute('data-edit-id');
  document.getElementById('grade-fields').style.display = 'none';
  
  // Reset modal title
  const modalTitle = document.querySelector('.modal__title');
  if (modalTitle) {
    modalTitle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px;color:var(--gm-red-500)"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      Add New Item
    `;
  }
  
  selectModalCategory('tcg');
};

window.selectModalCategory = function(cat) {
  modalCategory = cat;
  const catSelect = document.getElementById('item-category');
  if (catSelect) catSelect.value = cat;
  renderModalDynamicFields();
};

window.toggleGradeFields = function() {
  const condition = document.getElementById('item-condition').value;
  document.getElementById('grade-fields').style.display = condition === 'graded' ? 'block' : 'none';
};

function renderModalDynamicFields() {
  const container = document.getElementById('modal-dynamic-fields');
  if (!container) return;
  
  container.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="item-collection">Franchise / Collection</label>
        <input type="text" class="form-input" id="item-collection" placeholder="e.g., Pokémon, Star Wars, NBA">
      </div>
      <div class="form-group">
        <label class="form-label" for="item-era">Year / Era</label>
        <input type="text" class="form-input" id="item-era" placeholder="e.g., 1999, Modern">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="item-variant">Variant / Edition / Issue</label>
      <input type="text" class="form-input" id="item-variant" placeholder="e.g., 1st Edition, #300">
    </div>
  `;
}

/* ── Handle Form Submission ──────────────────────────────────── */
window.handleAddItem = function(event) {
  event.preventDefault();
  
  const form = document.getElementById('add-item-form');
  const editId = form.dataset.editId;
  
  const title = document.getElementById('item-title').value.trim();
  const price = parseFloat(document.getElementById('item-price').value) || 0;
  const condition = document.getElementById('item-condition').value;
  const stockQty = parseInt(document.getElementById('item-stock').value) || 1;
  
  if (!title || price <= 0) return;
  
  /** @type {import('./data.js').CollectibleItem} */
  const newItem = {
    id: editId || `custom-${Date.now()}`,
    title,
    category: modalCategory,
    price,
    image: '',
    condition,
    stockQty
  };
  
  // Grading fields
  if (condition === 'graded') {
    newItem.gradingCompany = document.getElementById('item-grading-company').value;
    newItem.grade = parseFloat(document.getElementById('item-grade').value) || null;
    newItem.certNumber = document.getElementById('item-cert').value.trim() || null;
  }
  
  newItem.collection_name = document.getElementById('item-collection').value.trim() || null;
  newItem.era = document.getElementById('item-era').value.trim() || null;
  newItem.variant = document.getElementById('item-variant').value.trim() || null;
  
  if (editId) {
    // Update existing item
    const idx = inventoryItems.findIndex(i => i.id === editId);
    if (idx >= 0) {
      inventoryItems[idx] = { ...inventoryItems[idx], ...newItem };
    }
  } else {
    // Add new item
    inventoryItems.unshift(newItem);
  }
  
  closeAddModal();
  renderInventoryTable();
  renderQuickStats();
};

/* -- User Management --------------------------------------------- */
window.loadAdminUsers = async function() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!supabase) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--gm-slate-400);">Database not connected.</td></tr>';
    return;
  }
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--gm-slate-400);">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(user => {
      const roleStr = user.role || 'user';
      const roleClass = roleStr === 'admin' ? 'status-active' : 'status-pending';
      const nextRole = roleStr === 'admin' ? 'user' : 'admin';
      const date = new Date(user.created_at).toLocaleDateString();
      const emailDisplay = user.email || '<span style="color:var(--gm-red);font-size:10px;">SQL UPDATE NEEDED</span>';
      
      let roleAction = '';
      if (roleStr === 'admin') {
        roleAction = `<span style="color:var(--gm-slate-500); font-size:11px;">SQL ONLY</span>`;
      } else {
        roleAction = `<button class="btn btn-ghost btn-xs" onclick="window.toggleUserRole('${user.id}', '${nextRole}')">Make Admin</button>`;
      }
      
      return `
        <tr>
          <td><strong style="color:var(--gm-white)">${emailDisplay}</strong></td>
          <td>${user.username || '-'}</td>
          <td>
            <span class="${roleClass}" style="padding:4px 8px; border-radius:100px; font-size:11px; text-transform:uppercase; font-weight:700;">
              ${roleStr}
            </span>
          </td>
          <td>${date}</td>
          <td>
            <div style="display:flex; gap:8px;">
              ${roleAction}
              <button class="btn btn-secondary btn-xs" onclick="window.adminChangeUsername('${user.id}', '${user.username || ''}')">Rename</button>
              <button class="btn btn-secondary btn-xs" onclick="window.adminResetPassword('${user.email || ''}')">Reset PW</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching users:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--gm-red);">Failed to load users.</td></tr>';
  }
};

window.toggleUserRole = async function(userId, newRole) {
  if (!confirm('ARE YOU SURE you want to change this user to ' + newRole + '?')) return;
  try {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) throw error;
    loadAdminUsers();
  } catch (err) {
    alert('Failed to update role: ' + err.message);
  }
};

window.adminChangeUsername = function(userId, currentUsername) {
  document.getElementById('edit-user-id').value = userId;
  document.getElementById('edit-user-action').value = 'rename';
  document.getElementById('edit-user-name').value = currentUsername || '';
  
  document.getElementById('edit-user-name-group').style.display = 'block';
  document.getElementById('edit-user-password-group').style.display = 'none';
  document.getElementById('edit-user-modal-title').innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px;color:var(--gm-blue-500)"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    Rename User
  `;
  document.getElementById('edit-user-submit-btn').textContent = 'Save Name';
  
  document.getElementById('edit-user-modal-overlay').classList.add('active');
};

window.adminResetPassword = function(email) {
  if (!email || email.includes('SQL UPDATE NEEDED')) {
    return alert("Cannot reset password without an email address. Run the SQL update first.");
  }
  
  document.getElementById('edit-user-email').value = email;
  document.getElementById('edit-user-action').value = 'reset_pw';
  
  document.getElementById('edit-user-name-group').style.display = 'none';
  document.getElementById('edit-user-password-group').style.display = 'block';
  document.getElementById('edit-user-modal-title').innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px;color:var(--gm-red-500)"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Reset Password
  `;
  document.getElementById('edit-user-submit-btn').textContent = 'Send Reset Email';
  
  document.getElementById('edit-user-modal-overlay').classList.add('active');
};

window.closeEditUserModal = function() {
  document.getElementById('edit-user-modal-overlay').classList.remove('active');
};

window.handleEditUserSubmit = async function(e) {
  e.preventDefault();
  const action = document.getElementById('edit-user-action').value;
  
  try {
    if (action === 'rename') {
      const userId = document.getElementById('edit-user-id').value;
      const newName = document.getElementById('edit-user-name').value.trim();
      if (!newName) throw new Error('Username cannot be empty');
      
      const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', userId);
      if (error) throw error;
      
    } else if (action === 'reset_pw') {
      const email = document.getElementById('edit-user-email').value;
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert("Password reset email sent to " + email);
    }
    
    closeEditUserModal();
    loadAdminUsers();
  } catch (err) {
    alert('Failed: ' + err.message);
  }
};

/* ── Orders Management ───────────────────────────────────────── */
window.loadAdminOrders = async function() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  
  try {
    // Attempt to fetch from 'orders' table
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--gm-red);">The "orders" table does not exist in your database yet. Please run the SQL schema update.</td></tr>';
        return;
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--gm-slate-400);">No orders found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(order => {
      const date = new Date(order.created_at).toLocaleDateString();
      const statusColor = order.status === 'delivered' ? 'var(--gm-green)' : (order.status === 'shipped' ? 'var(--gm-blue)' : 'var(--gm-orange)');
      return `
        <tr>
          <td>#${order.id.split('-')[0]}</td>
          <td>${date}</td>
          <td>${order.customer_email || 'Unknown'}</td>
          <td>$${(order.total_amount || 0).toLocaleString()}</td>
          <td>
            <span style="color:${statusColor}; font-weight:700; text-transform:uppercase; font-size:11px; padding:4px 8px; border:1px solid ${statusColor}33; border-radius:100px; background:${statusColor}11;">
              ${order.status || 'processing'}
            </span>
          </td>
          <td>${order.tracking_number || '-'}</td>
          <td>
            <button class="btn btn-secondary btn-xs" onclick="window.openEditOrderModal('${order.id}', '${order.status || 'pending'}', '${order.tracking_number || ''}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; vertical-align:-2px"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              Edit Order
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching orders:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--gm-red);">Failed to load orders.</td></tr>';
  }
};

window.openEditOrderModal = function(id, status, tracking) {
  document.getElementById('edit-order-id').value = id;
  const statusSelect = document.getElementById('edit-order-status');
  if (statusSelect) {
    statusSelect.value = status.toLowerCase();
  }
  const trackingInput = document.getElementById('edit-order-tracking');
  if (trackingInput) {
    trackingInput.value = tracking || '';
  }
  document.getElementById('edit-order-modal-overlay').classList.add('active');
};

window.closeEditOrderModal = function() {
  document.getElementById('edit-order-modal-overlay').classList.remove('active');
};

window.handleEditOrderSubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-order-id').value;
  const status = document.getElementById('edit-order-status').value;
  const tracking = document.getElementById('edit-order-tracking').value;

  try {
    const { error } = await supabase.from('orders').update({
      status: status,
      tracking_number: tracking
    }).eq('id', id);

    if (error) throw error;
    
    closeEditOrderModal();
    loadAdminOrders();
    window.location.reload(); // Refresh to update metrics
  } catch (err) {
    alert('Failed to update order: ' + err.message);
  }
};

// --- landing.js ---
/**
 * THE GEMNASIUM — Landing Page Logic
 * Tab switching, scroll animations, dynamic card rendering, particles
 */





/* ── Initialize Page ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch inventory from Supabase
  await fetchInventory();

  // Initialize Auth & Navbar
  initAuthAndNav();

  // Initialize Admin logic
  initAdmin();

  // Prevent flash of home page if navigating directly to admin
  const hash = window.location.hash || '#home';
  if (hash === '#admin') {
    document.getElementById('view-home').style.display = 'none';
  }

  // Setup routing based on hash
  handleRouting();
  window.addEventListener('hashchange', handleRouting);

  // Render shared components
  const initialHash = window.location.hash;
  document.getElementById('navbar-root').innerHTML = renderNavbar(initialHash === '#admin' ? 'admin' : 'home');
  document.getElementById('footer-root').innerHTML = renderFooter();
  document.getElementById('cart-root').innerHTML = renderCartDrawer();
  
  // Setup cart functionality
  setupCart(allItems);
  
  // Render trending grids
  renderTrendingTCG();
  renderTrendingComics();
  renderGemMintShowcase();
  
  // Initialize animations
  initScrollAnimations();
  initNavbarScroll();
  createParticles();
});

/* ── Trending Grids ──────────────────────────────────────────── */
function renderTrendingTCG() {
  const grid = document.getElementById('trending-tcg-grid');
  if (!grid) return;
  
  const featured = tcgItems.filter(item => item.featured).slice(0, 6);
  grid.innerHTML = featured.map(item => renderProductCard(item)).join('');
}

function renderTrendingComics() {
  const grid = document.getElementById('trending-comics-grid');
  if (!grid) return;
  
  const featured = comicItems.filter(item => item.featured).slice(0, 6);
  grid.innerHTML = featured.map(item => renderProductCard(item)).join('');
}

/* ── Tab Switching ───────────────────────────────────────────── */
window.switchTrendingTab = function(tab) {
  // Update tab buttons
  document.querySelectorAll('#trending-tabs .tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Update tab panels
  document.getElementById('trending-tcg').classList.toggle('active', tab === 'tcg');
  document.getElementById('trending-comics').classList.toggle('active', tab === 'comics');
};

/* ── Gem Mint Showcase ───────────────────────────────────────── */
function renderGemMintShowcase() {
  const grid = document.getElementById('gemmint-grid');
  if (!grid) return;
  
  const gemMintItems = allItems.filter(item => item.gemMint).slice(0, 4);
  
  grid.innerHTML = gemMintItems.map((item, index) => `
    <div class="gemmint-card animate-on-scroll delay-${index + 1}">
      ${renderProductCard(item)}
    </div>
  `).join('');
}

/* ── SPA Routing ─────────────────────────────────────────────── */
function handleRouting() {
  const hash = window.location.hash || '#home';
  if (hash === '#admin') {
    // Only allow if admin
    if (window.isAdminUser) {
      document.getElementById('view-home').style.display = 'none';
      document.getElementById('view-admin').style.display = 'block';
      window.scrollTo(0, 0);
    } else {
      // Not admin, go home
      window.location.hash = '#home';
      return;
    }
  } else {
    // Home view
    document.getElementById('view-admin').style.display = 'none';
    document.getElementById('view-home').style.display = 'block';
    window.scrollTo(0, 0);
  }
  
  // Re-render navbar to update active state
  const navRoot = document.getElementById('navbar-root');
  if (navRoot) {
    navRoot.innerHTML = renderNavbar(hash === '#admin' ? 'admin' : 'home');
  }
}

window.switchView = function(view) {
  window.location.hash = `#${view}`;
};

/* ── Hero Particles ──────────────────────────────────────────── */
function createParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero__particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 6}s`;
    particle.style.animationDuration = `${4 + Math.random() * 4}s`;
    
    // Vary sizes
    const size = 2 + Math.random() * 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Some particles are slightly different colors
    const colors = ['var(--gm-red-600)', 'var(--gm-red-500)', 'var(--gm-ember)', 'rgba(255,255,255,0.3)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    container.appendChild(particle);
  }
}

})();
