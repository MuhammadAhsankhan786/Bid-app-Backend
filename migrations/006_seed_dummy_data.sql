-- Seed realistic dummy data for development

-- Insert Categories
INSERT INTO categories (name, slug, description) VALUES
  ('Electronics', 'electronics', 'Electronic devices and gadgets'),
  ('Fashion', 'fashion', 'Clothing and accessories'),
  ('Home & Garden', 'home-garden', 'Home improvement and garden items'),
  ('Sports', 'sports', 'Sports equipment and gear'),
  ('Collectibles', 'collectibles', 'Rare and valuable collectibles'),
  ('Art', 'art', 'Artwork and paintings')
ON CONFLICT (slug) DO NOTHING;

-- Insert dummy users (buyers and sellers)
INSERT INTO users (name, email, phone, role, status, bids_count, password) VALUES
  ('John Doe', 'john@example.com', '+9647701234567', 'buyer', 'approved', 45, '$2b$10$dummy'),
  ('Jane Smith', 'jane@example.com', '+9647701234568', 'seller', 'approved', 32, '$2b$10$dummy'),
  ('Mike Johnson', 'mike@example.com', '+9647701234569', 'buyer', 'suspended', 12, '$2b$10$dummy'),
  ('Sarah Williams', 'sarah@example.com', '+9647701234570', 'seller', 'approved', 89, '$2b$10$dummy'),
  ('Tom Brown', 'tom@example.com', '+9647701234571', 'buyer', 'pending', 3, '$2b$10$dummy'),
  ('Alice Cooper', 'alice@example.com', '+9647701234572', 'buyer', 'approved', 67, '$2b$10$dummy'),
  ('Bob Wilson', 'bob@example.com', '+9647701234573', 'seller', 'approved', 45, '$2b$10$dummy'),
  ('Emma Davis', 'emma@example.com', '+9647701234574', 'buyer', 'approved', 23, '$2b$10$dummy'),
  ('David Miller', 'david@example.com', '+9647701234575', 'seller', 'approved', 56, '$2b$10$dummy'),
  ('Lisa Anderson', 'lisa@example.com', '+9647701234576', 'buyer', 'approved', 34, '$2b$10$dummy')
ON CONFLICT (email) DO NOTHING;

-- Insert dummy products (using category and user IDs from above)
INSERT INTO products (seller_id, title, description, starting_bid, current_bid, category_id, image_url, status, total_bids, highest_bidder_id, auction_end_time, created_at) 
SELECT 
  u.id as seller_id,
  p.title,
  p.description,
  p.starting_bid,
  p.current_bid,
  c.id as category_id,
  p.image_url,
  p.status,
  p.total_bids,
  buyer.id as highest_bidder_id,
  p.auction_end_time,
  p.created_at
FROM (VALUES
  ('Vintage Camera', 'Classic 35mm film camera in excellent condition', 150.00, 210.00, 'electronics', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f', 'pending', 0, NULL, NULL, NOW() - INTERVAL '2 hours'),
  ('Designer Watch', 'Luxury Swiss watch, mint condition', 500.00, 650.00, 'fashion', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 'pending', 0, NULL, NULL, NOW() - INTERVAL '5 hours'),
  ('Antique Vase', 'Rare Chinese porcelain vase from 18th century', 200.00, 280.00, 'home-garden', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96', 'pending', 0, NULL, NULL, NOW() - INTERVAL '1 day'),
  ('Gaming Laptop', 'High-end gaming laptop with RTX 3080', 850.00, 1050.00, 'electronics', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853', 'approved', 23, 'john@example.com', NOW() + INTERVAL '2 hours', NOW() - INTERVAL '3 days'),
  ('Mountain Bike', 'Professional mountain bike, barely used', 320.00, 420.00, 'sports', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', 'approved', 12, 'alice@example.com', NOW() + INTERVAL '5 hours', NOW() - INTERVAL '2 days'),
  ('Smart Watch', 'Latest smartwatch with health tracking', 180.00, 220.00, 'electronics', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 'approved', 8, 'emma@example.com', NOW() + INTERVAL '1 hour', NOW() - INTERVAL '1 day'),
  ('Leather Jacket', 'Genuine leather jacket, size M', 95.00, 120.00, 'fashion', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'approved', 5, 'lisa@example.com', NOW() + INTERVAL '12 hours', NOW() - INTERVAL '4 days'),
  ('Vintage Vinyl Collection', 'Rare vinyl records collection', 250.00, 310.00, 'collectibles', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f', 'approved', 15, 'john@example.com', NOW() + INTERVAL '6 hours', NOW() - INTERVAL '3 days')
) AS p(title, description, starting_bid, current_bid, category_slug, image_url, status, total_bids, buyer_email, auction_end_time, created_at)
LEFT JOIN users u ON u.email = 'jane@example.com' AND p.title IN ('Vintage Camera', 'Gaming Laptop', 'Vintage Vinyl Collection')
   OR u.email = 'sarah@example.com' AND p.title IN ('Designer Watch', 'Mountain Bike')
   OR u.email = 'bob@example.com' AND p.title = 'Antique Vase'
   OR u.email = 'david@example.com' AND p.title = 'Leather Jacket'
LEFT JOIN categories c ON c.slug = p.category_slug
LEFT JOIN users buyer ON buyer.email = p.buyer_email
ON CONFLICT DO NOTHING;

-- Insert dummy bids
INSERT INTO bids (product_id, user_id, amount)
SELECT p.id, u.id, p.current_bid
FROM products p
JOIN users u ON (
  (p.title = 'Gaming Laptop' AND u.email = 'john@example.com') OR
  (p.title = 'Mountain Bike' AND u.email = 'alice@example.com') OR
  (p.title = 'Smart Watch' AND u.email = 'emma@example.com') OR
  (p.title = 'Leather Jacket' AND u.email = 'lisa@example.com')
)
WHERE p.status = 'approved'
ON CONFLICT DO NOTHING;

-- Insert dummy orders
INSERT INTO orders (order_number, product_id, buyer_id, seller_id, amount, payment_status, delivery_status, created_at)
SELECT 
  'ORD-' || (1000 + ROW_NUMBER() OVER()),
  p.id,
  buyer.id,
  seller.id,
  p.current_bid,
  CASE (ROW_NUMBER() OVER()) % 5 WHEN 0 THEN 'pending' ELSE 'completed' END,
  CASE (ROW_NUMBER() OVER()) % 3 
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'shipped'
    ELSE 'delivered'
  END,
  NOW() - (ROW_NUMBER() OVER() || ' days')::INTERVAL
FROM products p
JOIN users seller ON seller.id = p.seller_id
JOIN users buyer ON (
  (p.title = 'Gaming Laptop' AND buyer.email = 'john@example.com') OR
  (p.title = 'Mountain Bike' AND buyer.email = 'alice@example.com') OR
  (p.title = 'Smart Watch' AND buyer.email = 'emma@example.com') OR
  (p.title = 'Leather Jacket' AND buyer.email = 'lisa@example.com') OR
  (p.title = 'Vintage Vinyl Collection' AND buyer.email = 'john@example.com')
)
WHERE p.status = 'approved'
LIMIT 5
ON CONFLICT (order_number) DO NOTHING;

-- Insert dummy notifications
INSERT INTO notifications (type, title, message, user_id, read) VALUES
  ('approval', 'Product approved', 'Your product "Gaming Laptop" has been approved', (SELECT id FROM users WHERE email = 'jane@example.com'), false),
  ('flag', 'Auction flagged', 'Auction "Mountain Bike" has been flagged for review', (SELECT id FROM users WHERE email = 'sarah@example.com'), false),
  ('user', 'User suspended', 'User Mike Johnson has been suspended', NULL, false),
  ('bid', 'High-value bid', 'A bid of $1050 has been placed on Gaming Laptop', (SELECT id FROM users WHERE email = 'jane@example.com'), false)
ON CONFLICT DO NOTHING;
