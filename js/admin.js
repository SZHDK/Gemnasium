/**
 * THE GEMNASIUM — Admin Dashboard Logic
 * Metrics rendering, inventory table, modal management, CRUD actions
 */

import { allItems, tcgItems, comicItems, dashboardMetrics, gameInfo, publisherInfo, getPlaceholderStyle } from './data.js';
import { 
  renderMetricCard, renderNavbar, renderFooter, renderCartDrawer, renderGradeBadge,
  setupCart, initNavbarScroll, initAuthAndNav 
} from './components.js';

/* ── State ───────────────────────────────────────────────────── */
let inventoryItems = []; // mutable copy
let currentTab = 'all';
let searchQuery = '';
let modalCategory = 'tcg';

/* ── Initialize ──────────────────────────────────────────────── */
export function initAdmin() {
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

window.deleteItem = async function(id) {
  try {
    if (!id.startsWith('custom-') && supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    }
    inventoryItems = inventoryItems.filter(i => i.id !== id);
    renderInventoryTable();
    renderQuickStats();
  } catch (err) {
    alert('Failed to delete item: ' + err.message);
  }
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
window.handleAddItem = async function(event) {
  event.preventDefault();
  
  const form = document.getElementById('add-item-form');
  const editId = form.dataset.editId;
  const submitBtn = document.querySelector('button[form="add-item-form"]') || form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save';
  
  const title = document.getElementById('item-title').value.trim();
  const price = parseFloat(document.getElementById('item-price').value) || 0;
  const condition = document.getElementById('item-condition').value;
  const stockQty = parseInt(document.getElementById('item-stock').value) || 1;
  
  if (!title || price <= 0) return;
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';
  }
  
  const productData = {
    title,
    category: modalCategory || 'tcg',
    price,
    condition,
    game: document.getElementById('item-collection')?.value.trim() || null,
    grading_company: condition === 'graded' ? (document.getElementById('item-grading-company').value || null) : null,
    grade: condition === 'graded' ? (parseFloat(document.getElementById('item-grade').value) || null) : null,
    cert_number: condition === 'graded' ? (document.getElementById('item-cert').value.trim() || null) : null
  };
  
  try {
    if (editId) {
      if (editId.startsWith('custom-')) {
        // Local update
        const idx = inventoryItems.findIndex(i => i.id === editId);
        if (idx >= 0) inventoryItems[idx] = { ...inventoryItems[idx], ...productData, id: editId };
      } else if (supabase) {
        // Supabase update
        const { data, error } = await supabase.from('products').update(productData).eq('id', editId).select().single();
        if (error) throw error;
        const idx = inventoryItems.findIndex(i => i.id === editId);
        if (idx >= 0) inventoryItems[idx] = data;
      }
    } else {
      // Add new item
      if (supabase) {
        const { data, error } = await supabase.from('products').insert([productData]).select().single();
        if (error) throw error;
        inventoryItems.unshift(data);
      } else {
        inventoryItems.unshift({ ...productData, id: `custom-${Date.now()}` });
      }
    }
    
    closeAddModal();
    renderInventoryTable();
    renderQuickStats();
  } catch (err) {
    alert('Failed to save item: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
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
