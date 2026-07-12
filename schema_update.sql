-- ==============================================================================
-- 1. CLEANUP (Drop existing tables to ensure a clean slate)
-- ==============================================================================
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- ==============================================================================
-- 2. INVENTORY: Products Table
-- ==============================================================================
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    game TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    condition TEXT,
    grading_company TEXT,
    grade NUMERIC(4, 1),
    cert_number TEXT,
    image TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can read products
CREATE POLICY "Public can view products"
    ON public.products FOR SELECT
    USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));


-- ==============================================================================
-- 3. ORDERS: Orders & Order Items
-- ==============================================================================
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES auth.users(id),
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    shipping_address TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'processing',
    tracking_number TEXT,
    shipping_details JSONB,
    payment_method TEXT
);

CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT, -- Note: Text to support old mock IDs if needed
    product_title TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Order Policies
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT
    USING (auth.uid() = customer_id OR current_setting('request.jwt.claims', true)::json->>'email' = customer_email);
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT
    WITH CHECK (true); -- Allow anonymous checkout insertions for now
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Order Items Policies
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR current_setting('request.jwt.claims', true)::json->>'email' = orders.customer_email)));
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT
    WITH CHECK (true);
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
