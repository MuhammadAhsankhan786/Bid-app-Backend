-- ======================================================
-- MY BIDS FLOW VERIFICATION SCRIPT
-- Check and insert sample bids for userId=55
-- ======================================================

-- 1. Check if user 55 exists
SELECT 
    user_id,
    name,
    email,
    phone,
    user_role
FROM users 
WHERE user_id = 55;

-- 2. Check existing bids for user 55
SELECT 
    b.id as bid_id,
    b.user_id,
    b.amount,
    b.created_at as bid_date,
    b.product_id,
    p.title as product_title,
    p.status as product_status,
    p.auction_end_time,
    p.current_bid as current_highest_bid,
    p.highest_bidder_id
FROM bids b
LEFT JOIN products p ON b.product_id = p.id
WHERE b.user_id = 55
ORDER BY b.created_at DESC
LIMIT 10;

-- 3. Count total bids for user 55
SELECT COUNT(*) as total_bids
FROM bids
WHERE user_id = 55;

-- 4. Check if products exist (for sample bid insertion)
SELECT 
    id,
    title,
    status,
    auction_end_time,
    current_bid,
    highest_bidder_id
FROM products
WHERE status = 'approved'
ORDER BY id DESC
LIMIT 5;

-- 5. INSERT SAMPLE BIDS (if user 55 exists and has no bids)
-- Uncomment below to insert sample data:

/*
-- Insert sample bid 1 (active auction)
INSERT INTO bids (user_id, product_id, amount, created_at)
SELECT 
    55,
    p.id,
    COALESCE(p.current_bid, p.starting_price, 100) + 10,
    NOW() - INTERVAL '2 hours'
FROM products p
WHERE p.status = 'approved' 
  AND p.auction_end_time > NOW()
LIMIT 1;

-- Insert sample bid 2 (won auction)
INSERT INTO bids (user_id, product_id, amount, created_at)
SELECT 
    55,
    p.id,
    COALESCE(p.current_bid, p.starting_price, 100) + 20,
    NOW() - INTERVAL '5 days'
FROM products p
WHERE p.status = 'approved' 
  AND p.auction_end_time <= NOW()
  AND p.highest_bidder_id = 55
LIMIT 1;

-- Insert sample bid 3 (lost auction)
INSERT INTO bids (user_id, product_id, amount, created_at)
SELECT 
    55,
    p.id,
    COALESCE(p.current_bid, p.starting_price, 100) + 15,
    NOW() - INTERVAL '3 days'
FROM products p
WHERE p.status = 'approved' 
  AND p.auction_end_time <= NOW()
  AND p.highest_bidder_id IS NOT NULL
  AND p.highest_bidder_id != 55
LIMIT 1;
*/

-- 6. Verify inserted bids
SELECT 
    b.id as bid_id,
    b.user_id,
    b.amount,
    b.created_at as bid_date,
    p.title as product_title,
    CASE 
        WHEN p.auction_end_time > NOW() THEN 'active'
        WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id = b.user_id THEN 'won'
        WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id != b.user_id THEN 'lost'
        ELSE 'ended'
    END as bid_status
FROM bids b
LEFT JOIN products p ON b.product_id = p.id
WHERE b.user_id = 55
ORDER BY b.created_at DESC;

