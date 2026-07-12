/**
 * THE GEMNASIUM — Shop Page Logic
 * Filter system, search, sort, cart integration
 */

import { allItems, tcgItems, comicItems, gameInfo, publisherInfo, fetchInventory } from './data.js';
import { 
  renderProductCard, renderNavbar, renderFooter, renderCartDrawer,
  setupCart, initScrollAnimations, initNavbarScroll, updateCartDrawer, initAuthAndNav
} from './components.js';

/* ── State ───────────────────────────────────────────────────── */
let state = {
  category: 'all',
  searchQuery: '',
  sortBy: 'featured',
  filters: {
    condition: ['ungraded', 'graded'],
    gradingCompany: ['PSA', 'BGS', 'CGC']
  }
};

/* ── Filter Definitions ──────────────────────────────────────── */
const genericFilterGroups = [
  {
    key: 'condition',
    title: 'Condition',
    options: [
      { value: 'ungraded', label: 'Ungraded' },
      { value: 'graded', label: 'Graded (Authenticated)' },
    ]
  },
  {
    key: 'gradingCompany',
    title: 'Grading Company',
    options: [
      { value: 'PSA', label: 'PSA' },
      { value: 'BGS', label: 'BGS / Beckett' },
      { value: 'CGC', label: 'CGC' },
    ]
  }
];

/* ── Initialize ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch inventory from Supabase
  await fetchInventory();

  // Initialize auth & navbar
  initAuthAndNav();

  // Render shared components
  document.getElementById('navbar-root').innerHTML = renderNavbar('shop');
  document.getElementById('footer-root').innerHTML = renderFooter();
  document.getElementById('cart-root').innerHTML = renderCartDrawer();
  
  // Setup cart
  setupCart(allItems);
  
  // Check URL params for initial category
  const params = new URLSearchParams(window.location.search);
  if (params.get('category')) {
    state.category = params.get('category');
  }
  
  // Initialize
  updateCategoryToggle();
  renderFilters();
  renderProducts();
  initNavbarScroll();
  
  // Search input handler
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    const clearBtn = document.getElementById('search-clear');
    clearBtn.classList.toggle('visible', state.searchQuery.length > 0);
    renderProducts();
  });
});

/* ── Category Toggle ─────────────────────────────────────────── */
window.setCategory = function(category) {
  state.category = category;
  updateCategoryToggle();
  renderFilters();
  renderProducts();
};

function updateCategoryToggle() {
  document.querySelectorAll('#category-toggle .category-toggle__btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === state.category);
  });
}

/* ── Render Filter Sidebar ───────────────────────────────────── */
function renderFilters() {
  const container = document.getElementById('filter-groups');
  if (!container) return;
  
  let groups = genericFilterGroups;
  
  const tags = groups.map(group => {
    const options = group.options.map(opt => {
      const isChecked = state.filters[group.key]?.includes(opt.value);
      const count = countItemsForFilter(group.key, opt.value);
      return `
        <div class="filter-option ${isChecked ? 'checked' : ''}" 
             onclick="toggleFilter('${group.key}', '${opt.value}')">
          <div class="filter-checkbox"></div>
          <span class="filter-option__label">${opt.label}</span>
          <span class="filter-option__count">${count}</span>
        </div>
      `;
    }).join('');
    
    return `
      <div class="filter-group">
        <div class="filter-group__title">
          ${group.title}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="filter-group__options">
          ${options}
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = tags;
}

function countItemsForFilter(key, value) {
  let items = getBaseItems();
  return items.filter(item => {
    if (key === 'condition') return item.condition === value;
    if (key === 'gradingCompany') return item.gradingCompany === value;
    return false;
  }).length;
}

/* ── Toggle Filter ───────────────────────────────────────────── */
window.toggleFilter = function(key, value) {
  if (!state.filters[key]) state.filters[key] = [];
  
  const idx = state.filters[key].indexOf(value);
  if (idx >= 0) {
    state.filters[key].splice(idx, 1);
  } else {
    state.filters[key].push(value);
  }
  
  renderFilters();
  renderProducts();
  renderActiveFilters();
};

window.clearAllFilters = function() {
  state.filters.condition = ['ungraded', 'graded'];
  state.filters.gradingCompany = ['PSA', 'BGS', 'CGC'];
  renderFilters();
  renderProducts();
  renderActiveFilters();
};

window.clearSearch = function() {
  const input = document.getElementById('search-input');
  input.value = '';
  state.searchQuery = '';
  document.getElementById('search-clear').classList.remove('visible');
  renderProducts();
};

/* ── Active Filter Tags ──────────────────────────────────────── */
function renderActiveFilters() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  
  const tags = [];
  Object.entries(state.filters).forEach(([key, values]) => {
    values.forEach(value => {
      tags.push(`
        <span class="active-filter-tag" onclick="toggleFilter('${key}', '${value}')">
          ${value}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </span>
      `);
    });
  });
  
  container.innerHTML = tags.join('');
}

/* ── Get Base Items (by category) ────────────────────────────── */
function getBaseItems() {
  if (state.category === 'all') return [...allItems];
  return allItems.filter(item => item.category === state.category);
}

/* ── Filter & Sort Items ─────────────────────────────────────── */
function getFilteredItems() {
  let items = getBaseItems();
  
  // Apply search
  if (state.searchQuery) {
    items = items.filter(item => {
      const searchStr = [
        item.title, item.set, item.series, item.publisher, 
        item.game, item.era, item.certNumber
      ].filter(Boolean).join(' ').toLowerCase();
      return searchStr.includes(state.searchQuery);
    });
  }
  
  // Apply condition/grading filters strictly
  items = items.filter(item => {
    // 1. Condition must be checked
    if (!state.filters.condition.includes(item.condition)) return false;
    
    // 2. If it's graded, its grading company must be checked
    if (item.condition === 'graded' && item.gradingCompany) {
      if (!state.filters.gradingCompany.includes(item.gradingCompany)) return false;
    }
    
    return true;
  });
  
  // Apply sort
  switch (state.sortBy) {
    case 'price-asc':
      items.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      items.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'grade-desc':
      items.sort((a, b) => (b.grade || 0) - (a.grade || 0));
      break;
    case 'featured':
    default:
      items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }
  
  return items;
}

/* ── Render Products ─────────────────────────────────────────── */
function renderProducts() {
  const grid = document.getElementById('product-grid');
  const info = document.getElementById('grid-info');
  const count = document.getElementById('results-count');
  
  if (!grid) return;
  
  const items = getFilteredItems();
  
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="shop-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
        <h3 class="shop-empty__title">No items found</h3>
        <p class="shop-empty__desc">Try adjusting your filters or search query</p>
        <button class="btn btn-secondary" style="margin-top: var(--space-4)" onclick="clearAllFilters(); clearSearch();">
          Clear All Filters
        </button>
      </div>
    `;
  } else {
    grid.innerHTML = items.map(item => renderProductCard(item)).join('');
  }
  
  // Update counts
  if (info) {
    info.innerHTML = `Showing <strong>${items.length}</strong> of ${getBaseItems().length} items`;
  }
  if (count) {
    count.textContent = `(${items.length} items)`;
  }
  
  renderActiveFilters();
}

/* ── Sort Handler ────────────────────────────────────────────── */
window.applySort = function() {
  const select = document.getElementById('sort-select');
  state.sortBy = select.value;
  renderProducts();
};

/* ── Mobile Sidebar Toggle ───────────────────────────────────── */
window.toggleMobileSidebar = function() {
  const sidebar = document.getElementById('shop-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('visible');
};
