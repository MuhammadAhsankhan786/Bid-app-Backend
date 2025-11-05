CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  starting_price NUMERIC(10,2) NOT NULL,
  current_price NUMERIC(10,2) DEFAULT 0,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
