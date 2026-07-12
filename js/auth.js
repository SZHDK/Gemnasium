/**
 * THE GEMNASIUM — Authentication Module
 * Handles Supabase auth/db and EmailJS integration based on szhservices logic.
 */

// --- CONFIGURATION ---
const SUPABASE_URL = "https://mtwrprrknrexcctbbkxp.supabase.co";
const SUPABASE_KEY = "sb_publishable_TtiuNljb4iOFQRdhIF_PwA_c26l1Shw"; 
export let supabase = null;

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
export let currentUser = null;

/**
 * Initializes auth listener
 */
export function initAuth(onStateChange) {
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
export async function checkIsAdmin() {
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
export async function signIn(email, password) {
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
export async function signUp(email, password, username) {
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
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Password Recovery
 */
export async function resetPassword(email) {
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
export async function processCheckout(cartItems, customerDetails) {
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
