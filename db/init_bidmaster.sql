DO $$
BEGIN
    -- 1️⃣ USERS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
        CREATE TABLE users (
            user_id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            user_role VARCHAR(20) CHECK (user_role IN ('buyer','seller','admin')),
            profile_pic VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ users table created';
    ELSE
        RAISE NOTICE '✅ users table already exists';
    END IF;

    -- 2️⃣ PRODUCTS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'products') THEN
        CREATE TABLE products (
            product_id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            description TEXT,
            price NUMERIC(10,2) NOT NULL,
            discount NUMERIC(5,2),
            stock INT DEFAULT 1,
            rating NUMERIC(3,2),
            image VARCHAR(255),
            seller_id INT REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ products table created';
    ELSE
        RAISE NOTICE '✅ products table already exists';
    END IF;

    -- 3️⃣ AUCTIONS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'auctions') THEN
        CREATE TABLE auctions (
            auction_id SERIAL PRIMARY KEY,
            product_id INT REFERENCES products(id) ON DELETE CASCADE,
            start_time TIMESTAMP DEFAULT NOW(),
            end_time TIMESTAMP DEFAULT (NOW() + INTERVAL '1 day'),
            highest_bid NUMERIC(10,2) DEFAULT 0,
            highest_bidder INT REFERENCES users(id)
        );
        RAISE NOTICE '✅ auctions table created';
    ELSE
        RAISE NOTICE '✅ auctions table already exists';
    END IF;

    -- 4️⃣ BIDS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'bids') THEN
        CREATE TABLE bids (
            bid_id SERIAL PRIMARY KEY,
            auction_id INT REFERENCES auctions(auction_id) ON DELETE CASCADE,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            amount NUMERIC(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ bids table created';
    ELSE
        RAISE NOTICE '✅ bids table already exists';
    END IF;

    -- 5️⃣ NOTIFICATIONS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications') THEN
        CREATE TABLE notifications (
            notification_id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            read_status BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ notifications table created';
    ELSE
        RAISE NOTICE '✅ notifications table already exists';
    END IF;

    -- 6️⃣ PAYMENTS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN
        CREATE TABLE payments (
            payment_id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            amount NUMERIC(10,2) NOT NULL,
            method VARCHAR(50),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ payments table created';
    ELSE
        RAISE NOTICE '✅ payments table already exists';
    END IF;

    -- 7️⃣ DOCUMENTS
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'documents') THEN
        CREATE TABLE documents (
            document_id SERIAL PRIMARY KEY,
            product_id INT REFERENCES products(id) ON DELETE CASCADE,
            file_url VARCHAR(255),
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE '✅ documents table created';
    ELSE
        RAISE NOTICE '✅ documents table already exists';
    END IF;

    -- 🌱 SAMPLE DATA
    IF NOT EXISTS (SELECT 1 FROM users) THEN
        INSERT INTO users (name, email, password, phone, role)
        VALUES
        ('Admin User', 'admin@bidmaster.com', 'hashed_admin_pass', '03001234567', 'admin'),
        ('John Buyer', 'buyer@demo.com', 'hashed_buyer_pass', '03007654321', 'buyer'),
        ('Jane Seller', 'seller@demo.com', 'hashed_seller_pass', '03006543210', 'seller');
        RAISE NOTICE '✅ sample users inserted';
    ELSE
        RAISE NOTICE '✅ users data already exists';
    END IF;
END $$;
