# Company Products Add Karne Ka Tareeqa

## 📍 Company Products Kahan Se Add Hongi?

**Answer: Admin Panel se - Products & Auctions page par**

---

## 🎯 Step-by-Step Guide

### Step 1: Login
1. Admin Panel open karein (`localhost:3000`)
2. **Employee** role select karein
3. Koi bhi Iraq phone number enter karein (e.g., `+9647700923000`)
4. Login button click karein

### Step 2: Products Page Par Jao
1. Login ke baad dashboard open hoga
2. Left sidebar me **"Products & Auctions"** ya **"Products"** menu click karein
3. Products management page open hoga

### Step 3: Add Company Product Button
1. Page ke top right corner me **"Add Company Product"** button dikhega
2. Button par click karein
3. Modal/form open hoga

### Step 4: Form Fill Karein
**Required Fields:**
- **Product Title** (required) - e.g., "Apple iPhone 15 Pro Max"
- **Category** (required) - Dropdown se select karein
- **Starting Price** (required) - e.g., 1000
- **Duration** (required) - 1, 2, ya 3 days select karein

**Optional Fields:**
- **Description** - Product ki details
- **Image URL** - Product ki image ka URL

### Step 5: Create Product
1. Form fill karne ke baad **"Create Product"** button click karein
2. Product create ho jayega
3. Status automatically **"Pending"** set hoga
4. Admin approve karega to auction start hoga

---

## 🔧 Local URL Set Karne Ka Tareeqa

### Method 1: Browser Console Se (Quick Fix)

1. Admin Panel open karein (`localhost:3000`)
2. **F12** press karein (Developer Tools open hoga)
3. **Console** tab select karein
4. Ye command run karein:

```javascript
localStorage.setItem('API_BASE_URL', 'http://localhost:5000/api');
location.reload();
```

5. Page reload hoga aur ab local backend use hoga

### Method 2: localStorage Clear Karein

Agar live URL remove karna hai:

```javascript
localStorage.removeItem('API_BASE_URL');
location.reload();
```

### Method 3: Backend Check Karein

Pehle ensure karein ke backend local par chal raha hai:

```bash
cd "Bid app Backend"
npm start
```

Backend `http://localhost:5000` par chalna chahiye.

---

## ✅ Verification

### Check Karo Ke Local URL Set Hai:
1. Browser Console open karein (F12)
2. Console me ye dikhna chahiye:
   ```
   🌐 [Admin Panel] Localhost detected - Using LOCAL API: http://localhost:5000/api
   ```

### Agar Live URL Dikh Raha Hai:
- Console me ye command run karein:
  ```javascript
  localStorage.setItem('API_BASE_URL', 'http://localhost:5000/api'); location.reload();
  ```

---

## 📝 Complete Flow

1. **Backend Start Karein:**
   ```bash
   cd "Bid app Backend"
   npm start
   ```

2. **Frontend Start Karein:**
   ```bash
   cd "Bid app admin  Frontend"
   npm run dev
   ```

3. **Browser Me:**
   - `localhost:3000` open karein
   - Console me local URL check karein
   - Employee se login karein
   - Products page par jao
   - "Add Company Product" button click karein
   - Form fill karein aur create karein

---

## 🎯 Company Products Features

- ✅ Employees add kar sakte hain
- ✅ Status = Pending (admin approval ke liye)
- ✅ `seller_id = NULL` (company products)
- ✅ Admin approve karega to auction start hoga
- ✅ Timer approve ke baad hi start hoga

---

**Company products ab admin panel se add ho sakti hain!**

