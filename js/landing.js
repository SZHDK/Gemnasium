/**
 * THE GEMNASIUM — Landing Page Logic
 * Tab switching, scroll animations, dynamic card rendering, particles
 */

import { allItems, tcgItems, comicItems, fetchInventory } from './data.js';
import { 
  renderProductCard, renderNavbar, renderFooter, renderCartDrawer,
  setupCart, initScrollAnimations, initNavbarScroll, initAuthAndNav 
} from './components.js';
import { initAdmin } from './admin.js';

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
