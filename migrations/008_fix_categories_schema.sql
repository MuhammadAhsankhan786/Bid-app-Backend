-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix categories table schema
-- Add slug column if missing
DO $$ 
DECLARE
  cat_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='slug') THEN
    ALTER TABLE categories ADD COLUMN slug VARCHAR(100);
    
    -- Generate unique slugs from existing names
    FOR cat_record IN SELECT id, name FROM categories WHERE slug IS NULL LOOP
      base_slug := LOWER(REGEXP_REPLACE(cat_record.name, '[^a-zA-Z0-9]+', '-', 'g'));
      final_slug := base_slug;
      counter := 1;
      
      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM categories WHERE slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
      END LOOP;
      
      UPDATE categories SET slug = final_slug WHERE id = cat_record.id;
    END LOOP;
    
    -- Make slug unique and not null
    ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;
    
    -- Add unique constraint only if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_unique'
    ) THEN
      ALTER TABLE categories ADD CONSTRAINT categories_slug_unique UNIQUE (slug);
    END IF;
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='updated_at') THEN
    ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add active column if missing (for soft deletes)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='active') THEN
    ALTER TABLE categories ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Ensure products table has category_id with proper foreign key
DO $$ 
BEGIN
  -- Add category_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category_id') THEN
    ALTER TABLE products ADD COLUMN category_id INTEGER;
    ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;
  
  -- Add updated_at to products if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='updated_at') THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create trigger for categories updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for products updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default categories if table is empty
INSERT INTO categories (name, slug, description, active)
SELECT * FROM (VALUES
  ('Electronics', 'electronics', 'Electronic devices and gadgets', true),
  ('Mobiles', 'mobiles', 'Mobile phones and smartphones', true),
  ('Laptops', 'laptops', 'Laptops and notebooks', true),
  ('Vehicles', 'vehicles', 'Cars, motorcycles, and other vehicles', true),
  ('Property', 'property', 'Real estate and property listings', true),
  ('Home Appliances', 'home-appliances', 'Home and kitchen appliances', true)
) AS v(name, slug, description, active)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = v.name);

