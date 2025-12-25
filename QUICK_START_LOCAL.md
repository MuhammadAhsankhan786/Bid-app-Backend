# 🚀 Quick Start - Local Testing

## ✅ Code Updated!

**Ab localhost par automatically local URL use hoga!**

---

## 📋 Steps to Test Locally

### Step 1: Backend Start Karein
```bash
cd "Bid app Backend"
npm start
```
Backend `http://localhost:5000` par chalna chahiye.

### Step 2: Frontend Start Karein
```bash
cd "Bid app admin  Frontend"
npm run dev
```
Frontend `http://localhost:3000` par chalna chahiye.

### Step 3: Admin Panel Open Karein
- Browser me `localhost:3000` open karein
- **Automatically local URL use hoga** (code me fix kar diya hai)

### Step 4: Employee Se Login Karein
1. **Employee** role select karein
2. Koi bhi Iraq number enter karein (e.g., `+9647700923000`)
3. Login button click karein

### Step 5: Company Product Add Karein
1. Left sidebar me **"Products & Auctions"** click karein
2. Top right me **"Add Company Product"** button click karein
3. Form fill karein:
   - **Title:** e.g., "Apple iPhone 15 Pro Max"
   - **Category:** Dropdown se select karein
   - **Starting Price:** e.g., 1000
   - **Duration:** 1, 2, ya 3 days
   - **Description:** (optional)
   - **Image URL:** (optional)
4. **"Create Product"** button click karein
5. ✅ Product create ho jayega!

---

## 🔧 Manual URL Set (If Needed)

Agar phir bhi live URL use ho raha hai, to:

### Method 1: Browser Console
1. F12 press karein
2. Console me ye command run karein:
```javascript
localStorage.setItem('API_BASE_URL', 'http://localhost:5000/api');
location.reload();
```

### Method 2: Helper HTML File
1. `set-local-url.html` file open karein browser me
2. "Set Local URL" button click karein
3. Automatically admin panel redirect ho jayega

---

## ✅ Verification

Console me ye dikhna chahiye:
```
🌐 [Admin Panel] Localhost detected - Using LOCAL API: http://localhost:5000/api
```

---

## 🎯 Company Products Features

- ✅ Employees add kar sakte hain
- ✅ Status = Pending (admin approval ke liye)
- ✅ `seller_id = NULL` (company products)
- ✅ Admin approve karega to auction start hoga
- ✅ Timer approve ke baad hi start hoga

---

**Ab local testing ke liye ready hai!**

