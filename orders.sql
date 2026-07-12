-- Drop the table if it already exists to ensure a clean schema
DROP TABLE IF EXISTS public.orders CASCADE;

-- Create the orders table
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES auth.users(id),
    customer_email TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'processing',
    tracking_number TEXT,
    shipping_details JSONB,
    payment_method TEXT
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own orders
CREATE POLICY "Users can view their own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = customer_id);

-- Allow authenticated users to insert an order (Checkout)
CREATE POLICY "Users can insert their own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Allow Admins to view all orders
CREATE POLICY "Admins can view all orders"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Allow Admins to update orders
CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
