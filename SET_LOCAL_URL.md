# Local URL Set Karne Ka Tareeqa

## 🚀 Quick Fix (Browser Console)

### Step 1: Admin Panel Open Karein
- `localhost:3000` par jao

### Step 2: Developer Tools Open Karein
- **F12** press karein
- Ya **Right Click → Inspect**

### Step 3: Console Tab Select Karein
- Console tab par click karein

### Step 4: Ye Command Run Karein

```javascript
localStorage.setItem('API_BASE_URL', 'http://localhost:5000/api');
location.reload();
```

### Step 5: Verify
- Console me ye dikhna chahiye:
  ```
  🌐 [Admin Panel] Using API URL from localStorage: http://localhost:5000/api
  ```

---

## ✅ Backend Check

Pehle ensure karein ke backend chal raha hai:

```bash
cd "Bid app Backend"
npm start
```

Backend `http://localhost:5000` par chalna chahiye.

---

## 🔄 Live URL Se Local URL Switch

Agar abhi live URL set hai (`https://api.mazaadati.com/api`), to:

1. Console me ye command run karein:
   ```javascript
   localStorage.setItem('API_BASE_URL', 'http://localhost:5000/api');
   location.reload();
   ```

2. Ya localStorage clear karein:
   ```javascript
   localStorage.removeItem('API_BASE_URL');
   location.reload();
   ```

---

## 📍 Company Products Add Karne Ka Tareeqa

1. **Login:** Employee role se login karein
2. **Products Page:** Left sidebar me "Products & Auctions" click karein
3. **Add Button:** Top right me "Add Company Product" button click karein
4. **Form Fill:**
   - Title (required)
   - Category (required)
   - Starting Price (required)
   - Duration: 1, 2, ya 3 days (required)
   - Description (optional)
   - Image URL (optional)
5. **Create:** "Create Product" button click karein
6. **Result:** Product create hoga, status = Pending

---

**Ab local URL set ho jayega aur company products add kar sakte hain!**

