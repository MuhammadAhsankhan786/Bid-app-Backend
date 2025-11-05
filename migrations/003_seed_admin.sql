INSERT INTO users (name, email, role, password)
VALUES 
('Admin', 'admin@bidmaster.com', 'admin', 'Admin@123')
ON CONFLICT (email) DO NOTHING;
