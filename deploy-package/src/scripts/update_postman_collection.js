
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoints with Consumers defined
const ALL_ENDPOINTS = [
    // --- AUTH ---
    { method: 'POST', path: '/api/auth/send-otp', consumers: ['Mobile App'], folder: 'Auth', auth: false },
    { method: 'POST', path: '/api/auth/verify-otp', consumers: ['Mobile App'], folder: 'Auth', auth: false },
    { method: 'POST', path: '/api/auth/register', consumers: ['Mobile App'], folder: 'Auth', auth: false },
    { method: 'POST', path: '/api/auth/login', consumers: ['Mobile App'], folder: 'Auth', auth: false },
    { method: 'POST', path: '/api/auth/admin-login', consumers: ['Admin Panel'], folder: 'Auth', auth: false },
    { method: 'POST', path: '/api/auth/login-phone', consumers: ['Mobile App'], folder: 'Auth', auth: false, deprecated: true },
    { method: 'POST', path: '/api/auth/refresh', consumers: ['Mobile App', 'Admin Panel'], folder: 'Auth', auth: false },
    { method: 'GET', path: '/api/auth/profile', consumers: ['Mobile App', 'Admin Panel'], folder: 'Auth', auth: true }, // Shared
    { method: 'PATCH', path: '/api/auth/profile', consumers: ['Mobile App', 'Admin Panel'], folder: 'Auth', auth: true },
    { method: 'POST', path: '/api/auth/change-phone/send-otp', consumers: ['Mobile App', 'Admin Panel'], folder: 'Auth', auth: true },
    { method: 'POST', path: '/api/auth/change-phone/verify', consumers: ['Mobile App', 'Admin Panel'], folder: 'Auth', auth: true },

    // --- ADMIN API ---
    { method: 'GET', path: '/api/admin/users/:id', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'GET', path: '/api/admin/users', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'POST', path: '/api/admin/users', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/users/:id/change-admin-phone', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/users/:id', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'DELETE', path: '/api/admin/users/:id', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/users/:id/role', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PATCH', path: '/api/admin/users/approve/:id', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PATCH', path: '/api/admin/users/block/:id', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/users/:id/adjust-reward', consumers: ['Admin Panel'], folder: 'Users', auth: 'admin' },

    { method: 'GET', path: '/api/admin/dashboard', consumers: ['Admin Panel'], folder: 'Dashboard', auth: 'admin' },
    { method: 'GET', path: '/api/admin/dashboard/charts', consumers: ['Admin Panel'], folder: 'Dashboard', auth: 'admin' },
    { method: 'GET', path: '/api/admin/dashboard/categories', consumers: ['Admin Panel'], folder: 'Dashboard', auth: 'admin' },

    { method: 'POST', path: '/api/admin/products', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/pending', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/live', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/rejected', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/completed', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/:id', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'PATCH', path: '/api/admin/products/approve/:id', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'PATCH', path: '/api/admin/products/reject/:id', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/products/:id', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'DELETE', path: '/api/admin/products/:id', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },
    { method: 'GET', path: '/api/admin/products/:id/documents', consumers: ['Admin Panel'], folder: 'Products', auth: 'admin' },

    { method: 'GET', path: '/api/admin/orders', consumers: ['Admin Panel'], folder: 'Orders', auth: 'admin' },
    { method: 'GET', path: '/api/admin/orders/stats', consumers: ['Admin Panel'], folder: 'Orders', auth: 'admin' },
    { method: 'PATCH', path: '/api/admin/orders/:id/status', consumers: ['Admin Panel'], folder: 'Orders', auth: 'admin' },

    { method: 'GET', path: '/api/admin/analytics/weekly', consumers: ['Admin Panel'], folder: 'Analytics', auth: 'admin' },
    { method: 'GET', path: '/api/admin/analytics/monthly', consumers: ['Admin Panel'], folder: 'Analytics', auth: 'admin' },
    { method: 'GET', path: '/api/admin/analytics/categories', consumers: ['Admin Panel'], folder: 'Analytics', auth: 'admin' },
    { method: 'GET', path: '/api/admin/analytics/top-products', consumers: ['Admin Panel'], folder: 'Analytics', auth: 'admin' },

    { method: 'GET', path: '/api/admin/auctions/active', consumers: ['Admin Panel'], folder: 'Auctions', auth: 'admin' },
    { method: 'GET', path: '/api/admin/auctions/:id/bids', consumers: ['Admin Panel'], folder: 'Auctions', auth: 'admin' },
    { method: 'GET', path: '/api/admin/auction/:id/winner', consumers: ['Admin Panel'], folder: 'Auctions', auth: 'admin' },

    { method: 'GET', path: '/api/admin/notifications', consumers: ['Admin Panel'], folder: 'Notifications', auth: 'admin' },

    { method: 'GET', path: '/api/admin/payments', consumers: ['Admin Panel'], folder: 'Payments', auth: 'admin' },

    { method: 'POST', path: '/api/admin/settings/logo', consumers: ['Admin Panel'], folder: 'Settings', auth: 'admin' },
    { method: 'GET', path: '/api/admin/settings/logo', consumers: ['Admin Panel'], folder: 'Settings', auth: 'admin' },

    { method: 'GET', path: '/api/admin/referrals', consumers: ['Admin Panel'], folder: 'Referrals', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/referrals/:id/revoke', consumers: ['Admin Panel'], folder: 'Referrals', auth: 'admin' },
    { method: 'GET', path: '/api/admin/referral/settings', consumers: ['Admin Panel'], folder: 'Referrals', auth: 'admin' },
    { method: 'PUT', path: '/api/admin/referral/settings', consumers: ['Admin Panel'], folder: 'Referrals', auth: 'admin' },

    { method: 'GET', path: '/api/admin/wallet/logs', consumers: ['Admin Panel'], folder: 'Wallet', auth: 'admin' },

    { method: 'GET', path: '/api/admin/seller/:id/earnings', consumers: ['Admin Panel'], folder: 'Seller Earnings', auth: 'admin' },

    // --- MOBILE API ---
    { method: 'GET', path: '/api/products', consumers: ['Mobile App'], folder: 'Products', auth: false },
    { method: 'GET', path: '/api/products/mine', consumers: ['Mobile App'], folder: 'Products', auth: 'mobile' },
    { method: 'GET', path: '/api/products/seller/products', consumers: ['Mobile App'], folder: 'Products', auth: 'mobile' },
    { method: 'POST', path: '/api/products/create', consumers: ['Mobile App'], folder: 'Products', auth: 'mobile' },
    { method: 'PUT', path: '/api/products/:id', consumers: ['Mobile App'], folder: 'Products', auth: 'mobile' },
    { method: 'DELETE', path: '/api/products/:id', consumers: ['Mobile App'], folder: 'Products', auth: 'mobile' },
    { method: 'GET', path: '/api/products/:id', consumers: ['Mobile App'], folder: 'Products', auth: false },

    { method: 'POST', path: '/api/bids/place', consumers: ['Mobile App'], folder: 'Bids', auth: 'mobile' },
    { method: 'GET', path: '/api/bids/mine', consumers: ['Mobile App'], folder: 'Bids', auth: 'mobile' },
    { method: 'GET', path: '/api/bids/:productId', consumers: ['Mobile App'], folder: 'Bids', auth: false },

    { method: 'GET', path: '/api/auction/winner/:productId', consumers: ['Mobile App'], folder: 'Auctions', auth: false },
    { method: 'GET', path: '/api/auction/seller/:productId/winner', consumers: ['Mobile App'], folder: 'Auctions', auth: 'mobile' },

    { method: 'POST', path: '/api/orders/create', consumers: ['Mobile App'], folder: 'Orders', auth: 'mobile' },
    { method: 'GET', path: '/api/orders/mine', consumers: ['Mobile App'], folder: 'Orders', auth: 'mobile' },

    { method: 'GET', path: '/api/notifications', consumers: ['Mobile App'], folder: 'Notifications', auth: 'mobile' },
    { method: 'GET', path: '/api/notifications/settings', consumers: ['Mobile App'], folder: 'Notifications', auth: 'mobile' },
    { method: 'PUT', path: '/api/notifications/settings', consumers: ['Mobile App'], folder: 'Notifications', auth: 'mobile' },
    { method: 'PATCH', path: '/api/notifications/read/:id', consumers: ['Mobile App'], folder: 'Notifications', auth: 'mobile' },

    { method: 'GET', path: '/api/wallet', consumers: ['Mobile App'], folder: 'Wallet', auth: 'mobile' },

    { method: 'GET', path: '/api/buyer/bidding-history', consumers: ['Mobile App'], folder: 'History', auth: 'mobile' },

    { method: 'GET', path: '/api/seller/earnings', consumers: ['Mobile App'], folder: 'Earnings', auth: 'mobile' },

    // --- SHARED / PUBLIC / HYBRID ---
    // Banners: Mobile views, Admin manages.
    { method: 'GET', path: '/api/banners', consumers: ['Mobile App'], folder: 'Banners', auth: false },
    { method: 'GET', path: '/api/banners/:id', consumers: ['Mobile App'], folder: 'Banners', auth: false },
    { method: 'POST', path: '/api/banners', consumers: ['Admin Panel'], folder: 'Banners', auth: 'admin' },
    { method: 'PUT', path: '/api/banners/:id', consumers: ['Admin Panel'], folder: 'Banners', auth: 'admin' },
    { method: 'DELETE', path: '/api/banners/:id', consumers: ['Admin Panel'], folder: 'Banners', auth: 'admin' },

    // Categories: Mobile views, Admin manages.
    { method: 'GET', path: '/api/categories', consumers: ['Mobile App'], folder: 'Categories', auth: false },
    { method: 'GET', path: '/api/categories/:id', consumers: ['Mobile App'], folder: 'Categories', auth: false },
    { method: 'POST', path: '/api/categories', consumers: ['Admin Panel'], folder: 'Categories', auth: 'admin' },
    { method: 'PUT', path: '/api/categories/:id', consumers: ['Admin Panel'], folder: 'Categories', auth: 'admin' },
    { method: 'DELETE', path: '/api/categories/:id', consumers: ['Admin Panel'], folder: 'Categories', auth: 'admin' },

    // Uploads
    { method: 'POST', path: '/api/uploads/image', consumers: ['Mobile App'], folder: 'Uploads', auth: 'mobile' },
    { method: 'POST', path: '/api/uploads/images', consumers: ['Mobile App'], folder: 'Uploads', auth: 'mobile' },
    { method: 'POST', path: '/api/uploads/admin/image', consumers: ['Admin Panel'], folder: 'Uploads', auth: 'admin' },
    { method: 'POST', path: '/api/uploads/admin/images', consumers: ['Admin Panel'], folder: 'Uploads', auth: 'admin' },

    // Referrals
    { method: 'GET', path: '/api/referral/my-code', consumers: ['Mobile App'], folder: 'Referrals', auth: 'mobile' },
    { method: 'GET', path: '/api/referral/history', consumers: ['Mobile App'], folder: 'Referrals', auth: 'mobile' }
];

const COLLECTION_PATH = path.join(__dirname, '../../BidMaster_89_APIs.postman_collection.json');

const updateCollection = () => {
    try {
        // START FRESH to ensure clean structure
        // We will build a new Items array
        const newCollectionItems = [
            {
                name: "Mobile App",
                item: [] // Will contain sub-folders
            },
            {
                name: "Admin Panel",
                item: [] // Will contain sub-folders
            }
        ];

        // Helper to find or create subfolder under a parent
        const getSubFolder = (parentItem, folderName) => {
            let folder = parentItem.item.find(f => f.name === folderName);
            if (!folder) {
                folder = {
                    name: folderName,
                    item: []
                };
                parentItem.item.push(folder);
            }
            return folder;
        };

        // Helper to normalize path for variables
        const normalizeVariables = (path) => {
            const variables = [];
            const pathParts = path.split('/').filter(p => p.length > 0);
            pathParts.forEach(part => {
                if (part.startsWith(':')) {
                    variables.push({
                        key: part.substring(1),
                        value: "1"
                    });
                }
            });
            return variables;
        };

        let addedCount = 0;

        ALL_ENDPOINTS.forEach(endpoint => {
            // Loop through consumers for this endpoint (it might be in both)
            endpoint.consumers.forEach(consumerName => {
                // Find the root folder (Mobile App or Admin Panel)
                const rootFolder = newCollectionItems.find(r => r.name === consumerName);
                if (rootFolder) {
                    // Find or create the Category folder
                    const categoryFolder = getSubFolder(rootFolder, endpoint.folder);

                    // Create the Request Item
                    // Postman expects path array
                    const pathParts = endpoint.path.replace(/^\/api\//, '').split('/').filter(p => p.length > 0);

                    const newItem = {
                        name: `${endpoint.method} ${endpoint.path}`, // Use full path for clarity
                        request: {
                            method: endpoint.method,
                            header: [
                                { key: 'Content-Type', value: 'application/json' }
                            ],
                            url: {
                                raw: `{{base_url}}${endpoint.path.replace(/^\/api/, '')}`, // Strip /api leader if base_url has it? 
                                // Wait, previous script assumed base_url had /api? No, previous script stripped it.
                                // If base_url = http://localhost:5000/api then stripping is correct.

                                host: ["{{base_url}}"],
                                path: pathParts,
                                variable: normalizeVariables(endpoint.path)
                            }
                        }
                    };

                    // Auth Header logic
                    if (endpoint.auth) {
                        let tokenVar = '';
                        if (endpoint.auth === 'admin') tokenVar = '{{admin_token}}';
                        if (endpoint.auth === 'mobile') tokenVar = '{{mobile_token}}';
                        if (endpoint.auth === true) {
                            // Context dependent
                            tokenVar = consumerName === 'Admin Panel' ? '{{admin_token}}' : '{{mobile_token}}';
                        }

                        if (tokenVar) {
                            newItem.request.header.unshift({
                                key: 'Authorization',
                                value: `Bearer ${tokenVar}`
                            });
                        }
                    }

                    // Body Body
                    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
                        newItem.request.body = {
                            mode: 'raw',
                            raw: '{}'
                        };
                    }

                    categoryFolder.item.push(newItem);
                    addedCount++;
                }
            });
        });

        // Read original file to keep IDs/Info if possible, but we are prioritizing STRUCTURE
        let collection = {};
        if (fs.existsSync(COLLECTION_PATH)) {
            collection = JSON.parse(fs.readFileSync(COLLECTION_PATH, 'utf8'));
        } else {
            collection = { info: {}, item: [] };
        }

        collection.item = newCollectionItems;
        collection.info.name = "BidMaster API (Mobile & Admin)";
        collection.info.description = "Organized by Consumer (Mobile vs Admin). Shared endpoints appear in both with appropriate context.";

        fs.writeFileSync(COLLECTION_PATH, JSON.stringify(collection, null, 2), 'utf8');
        console.log(`\nSuccess! Reorganized collection with ${addedCount} endpoints.`);
        console.log(`Collection updated at: ${COLLECTION_PATH}`);

    } catch (error) {
        console.error('Error updating collection:', error);
    }
};

updateCollection();
