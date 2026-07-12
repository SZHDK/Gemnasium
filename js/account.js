import { renderNavbar, renderFooter, renderCartDrawer, initAuthAndNav } from './components.js';
import * as auth from './auth.js';

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
