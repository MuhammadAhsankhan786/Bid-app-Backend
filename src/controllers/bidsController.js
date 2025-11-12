import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const BidsController = {
  // POST /api/bids/place
  async placeBid(req, res) {
    console.log('🧩 [BidPlace] Request received:', {
      body: req.body,
      userId: req.user?.id,
      userRole: req.user?.role,
      headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
    });

    try {
      // Step 1: Validate user authentication
      if (!req.user || !req.user.id) {
        console.log('🧩 [BidError] Reason: User not authenticated - req.user is missing or has no id');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User authentication required"
        });
      }

      const buyerId = req.user.id;
      console.log('🧩 [BidPlace] Authenticated user:', { id: buyerId, role: req.user.role });

      // Step 2: Validate request body
      const { productId, amount } = req.body;

      if (!productId) {
        console.log('🧩 [BidError] Reason: productId is missing from request body');
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      if (amount === undefined || amount === null || amount === '') {
        console.log('🧩 [BidError] Reason: amount is missing from request body');
        return res.status(400).json({
          success: false,
          message: "Bid amount is required"
        });
      }

      // Step 3: Validate amount is numeric and positive
      const bidAmount = parseFloat(amount);
      if (isNaN(bidAmount) || !isFinite(bidAmount)) {
        console.log('🧩 [BidError] Reason: amount is not a valid number', { received: amount });
        return res.status(400).json({
          success: false,
          message: "Bid amount must be a valid number"
        });
      }

      if (bidAmount <= 0) {
        console.log('🧩 [BidError] Reason: amount must be greater than 0', { received: bidAmount });
        return res.status(400).json({
          success: false,
          message: "Bid amount must be greater than 0"
        });
      }

      // Step 4: Validate productId is numeric
      const productIdNum = parseInt(productId);
      if (isNaN(productIdNum) || !isFinite(productIdNum)) {
        console.log('🧩 [BidError] Reason: productId is not a valid number', { received: productId });
        return res.status(400).json({
          success: false,
          message: "Product ID must be a valid number"
        });
      }

      // Step 5: Validate user role (case-insensitive check)
      const userRole = req.user.role?.toLowerCase();
      const blockedRoles = []; // Empty = allow all roles
      
      if (blockedRoles.includes(userRole)) {
        console.log('🧩 [BidError] Reason: User role is blocked from bidding', { role: req.user.role });
        return res.status(403).json({
          success: false,
          message: `Your role (${req.user.role}) cannot place bids`
        });
      }

      // Step 6: Verify product exists in database
      console.log('🧩 [BidPlace] Checking product existence:', { productId: productIdNum });
      let productResult;
      try {
        productResult = await pool.query(
          "SELECT * FROM products WHERE id = $1",
          [productIdNum]
        );
      } catch (dbError) {
        console.log('🧩 [BidError] Reason: Database query failed when checking product', { 
          error: dbError.message,
          code: dbError.code 
        });
        return res.status(500).json({
          success: false,
          message: "Database error while checking product"
        });
      }

      if (productResult.rows.length === 0) {
        console.log('🧩 [BidError] Reason: Product not found in database', { productId: productIdNum });
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productIdNum} not found`
        });
      }

      const product = productResult.rows[0];
      console.log('🧩 [BidPlace] Product found:', { 
        id: product.id, 
        title: product.title, 
        status: product.status,
        seller_id: product.seller_id,
        current_bid: product.current_bid,
        starting_bid: product.starting_bid
      });

      // Step 7: Check if product is approved
      if (product.status !== 'approved') {
        console.log('🧩 [BidError] Reason: Product is not approved for bidding', { status: product.status });
        return res.status(400).json({
          success: false,
          message: `Product is not available for bidding (status: ${product.status})`
        });
      }

      // Step 8: Check if auction has ended
      if (product.auction_end_time && new Date(product.auction_end_time) < new Date()) {
        console.log('🧩 [BidError] Reason: Auction has ended', { 
          auction_end_time: product.auction_end_time,
          current_time: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          message: "Auction has ended"
        });
      }

      // Step 9: Check if seller is trying to bid on their own product
      if (product.seller_id === buyerId) {
        console.log('🧩 [BidError] Reason: User cannot bid on their own product', { 
          seller_id: product.seller_id, 
          buyer_id: buyerId 
        });
        return res.status(400).json({
          success: false,
          message: "You cannot bid on your own product"
        });
      }

      // Step 10: Get current highest bid
      const currentBid = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;
      console.log('🧩 [BidPlace] Current bid comparison:', { 
        currentBid, 
        newBid: bidAmount,
        product_current_bid: product.current_bid,
        product_starting_bid: product.starting_bid
      });

      // Step 11: Validate bid amount is higher than current bid
      if (bidAmount <= currentBid) {
        console.log('🧩 [BidError] Reason: Bid amount must be higher than current bid', { 
          currentBid, 
          newBid: bidAmount 
        });
        return res.status(400).json({
          success: false,
          message: `Bid amount must be higher than current bid ($${currentBid.toFixed(2)})`
        });
      }

      // Step 12: Start transaction and insert bid
      console.log('🧩 [BidPlace] Starting transaction to place bid:', { 
        productId: productIdNum, 
        userId: buyerId, 
        amount: bidAmount 
      });

      await pool.query('BEGIN');

      try {
        // Insert bid
        console.log('🧩 [BidPlace] Inserting bid into database...');
        const bidResult = await pool.query(
          `INSERT INTO bids (product_id, user_id, amount) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [productIdNum, buyerId, bidAmount]
        );

        if (!bidResult.rows || bidResult.rows.length === 0) {
          throw new Error('Bid insert returned no rows');
        }

        const newBid = bidResult.rows[0];
        console.log('🧩 [BidPlace] Bid inserted successfully:', { 
          bid_id: newBid.id, 
          amount: newBid.amount 
        });

        // Update product with new highest bid
        console.log('🧩 [BidPlace] Updating product with new highest bid...');
        await pool.query(
          `UPDATE products 
           SET current_bid = $1, 
               current_price = $1,
               highest_bidder_id = $2,
               total_bids = COALESCE(total_bids, 0) + 1
           WHERE id = $3`,
          [bidAmount, buyerId, productIdNum]
        );

        // Update user bids count (handle null values and missing column)
        console.log('🧩 [BidPlace] Updating user bids count...');
        try {
          await pool.query(
            `UPDATE users 
             SET bids_count = COALESCE(bids_count, 0) + 1 
             WHERE id = $1`,
            [buyerId]
          );
        } catch (bidsCountError) {
          // If bids_count column doesn't exist, skip this update
          if (bidsCountError.code === '42703') { // Undefined column
            console.log('🧩 [BidPlace] Warning: bids_count column does not exist, skipping user update');
          } else {
            throw bidsCountError; // Re-throw other errors
          }
        }

        await pool.query('COMMIT');
        console.log('🧩 [BidPlace] ✅ Transaction committed successfully');

        // Prepare response data
        const responseData = {
          id: newBid.id,
          product_id: newBid.product_id,
          user_id: newBid.user_id,
          amount: parseFloat(newBid.amount),
          created_at: newBid.created_at
        };

        console.log('🧩 [BidPlace] Sending response:', responseData);

        try {
          res.status(201).json({
            success: true,
            message: "Bid placed successfully",
            data: responseData
          });
        } catch (responseError) {
          console.log('🧩 [BidError] Reason: Error sending response', {
            error: responseError.message,
            stack: responseError.stack
          });
          // Response already sent or error sending response
          throw responseError;
        }
      } catch (dbError) {
        await pool.query('ROLLBACK');
        console.log('🧩 [BidError] Reason: Database error during bid insertion', {
          error: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          constraint: dbError.constraint,
          table: dbError.table,
          column: dbError.column
        });
        
        // Handle specific database errors
        if (dbError.code === '23503') { // Foreign key violation
          return res.status(400).json({
            success: false,
            message: "Invalid product or user reference"
          });
        }
        if (dbError.code === '23505') { // Unique constraint violation
          return res.status(400).json({
            success: false,
            message: "Bid already exists"
          });
        }
        if (dbError.code === '23514') { // Check constraint violation
          return res.status(400).json({
            success: false,
            message: "Bid amount violates constraint"
          });
        }
        
        throw dbError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.log('🧩 [BidError] Reason: Unexpected error in placeBid', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Return appropriate error based on error type
      if (error.name === 'TypeError' && error.message.includes('Cannot read')) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data format"
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Internal server error while placing bid",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // GET /api/bids/:productId
  async getBidsByProduct(req, res) {
    try {
      const { productId } = req.params;

      const result = await pool.query(
        `SELECT 
          b.*,
          u.name as bidder_name,
          u.email as bidder_email,
          u.phone as bidder_phone
        FROM bids b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.product_id = $1
        ORDER BY b.amount DESC, b.created_at DESC`,
        [productId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/bids/mine
  async getMyBids(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT 
          b.*,
          p.title as product_title,
          p.image_url as product_image,
          p.status as product_status,
          p.auction_end_time,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'live'
            ELSE 'ended'
          END as auction_status
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC`,
        [userId]
      );

      // Fix invalid image URLs in response
      const fixedData = fixImageUrlsInResponse(result.rows);

      res.json({
        success: true,
        data: fixedData
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

