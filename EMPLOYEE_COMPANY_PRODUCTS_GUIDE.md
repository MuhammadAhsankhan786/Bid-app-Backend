# Employee - Company Products Add Karne Ka Complete Guide

## 📋 Client Requirement (Yaad Rakhna)

**"In company products - Must my employees have access to admin panel to enter products manually. And this part only includes products that my employees will add it."**

✅ **Status: IMPLEMENTED**

---

## 🎯 Company Products Kahan Se Add Hongi?

### Location: Admin Panel → Products & Auctions Page

---

## 📝 Step-by-Step Guide

### Step 1: Login (Employee Role)
1. Admin Panel open karein: `localhost:3000`
2. **"Employee"** role select karein
3. **Koi bhi Iraq phone number** enter karein (e.g., `+9647700923000`)
4. Login button click karein
5. ✅ Login successful (user auto-create hoga agar nahi hai)

### Step 2: Dashboard (Optional)
- Login ke baad dashboard open hoga
- Stats dikhenge (ab 403 error fix ho gaya)

### Step 3: Products Page Par Jao
**Method 1: Left Sidebar**
- Left sidebar me **"Products & Auctions"** ya **"Products"** menu click karein

**Method 2: Direct URL**
- Browser me: `localhost:3000/#products`

### Step 4: Add Company Product Button
1. Page ke **top right corner** me **"Add Company Product"** button dikhega
2. Button par click karein
3. Modal/form open hoga

### Step 5: Form Fill Karein

#### Required Fields (Red * mark):
1. **Product Title** ⭐
   - Example: "Apple iPhone 15 Pro Max"
   - Product ka name

2. **Category** ⭐
   - Dropdown se select karein
   - Example: "Electronics", "Fashion", etc.

3. **Starting Price** ⭐
   - Number enter karein
   - Example: 1000 (dollars me)

4. **Duration** ⭐
   - Dropdown se select karein:
     - 1 Day
     - 2 Days
     - 3 Days

#### Optional Fields:
5. **Description**
   - Product ki details
   - Features, condition, specifications, etc.

6. **Image URL**
   - Product ki image ka URL
   - Example: `https://example.com/image.jpg`
   - Note: At least 1 image required (lekin optional field hai)

### Step 6: Create Product
1. Form fill karne ke baad **"Create Product"** button click karein
2. Button enabled hoga jab sab required fields fill ho jayenge
3. ✅ Product create ho jayega
4. ✅ Status automatically **"Pending"** set hoga
5. ✅ `seller_id = NULL` set hoga (company product)
6. ✅ Success message dikhega

### Step 7: Product Approval
1. Product create hone ke baad **"Pending"** tab me dikhega
2. Admin (Super Admin/Moderator) ya Employee khud approve kar sakta hai
3. Approve hone ke baad:
   - Status = `approved`
   - `auction_end_time` set hoga (approved_at + duration)
   - Timer start hoga
   - Product "Live Auctions" me dikhega

---

## ✅ What Happens After Creation?

### Database Entry:
```sql
INSERT INTO products (
  seller_id = NULL,        -- ✅ Company product
  status = 'pending',       -- ✅ Pending approval
  auction_end_time = NULL, -- ✅ Timer start nahi hoga
  duration = 1/2/3,        -- ✅ Selected duration
  ...
)
```

### After Approval:
```sql
UPDATE products SET
  status = 'approved',
  approved_at = CURRENT_TIMESTAMP,
  auction_end_time = approved_at + duration days
```

---

## 🔒 Employee Permissions

### ✅ Employee Kar Sakta Hai:
- ✅ Dashboard dekh sakta hai (ab fix ho gaya)
- ✅ Company products create kar sakta hai
- ✅ Company products approve kar sakta hai
- ✅ Company products reject kar sakta hai
- ✅ Company products edit kar sakta hai
- ✅ Company products delete kar sakta hai
- ✅ Company products view kar sakta hai (sirf company products)

### ❌ Employee Nahi Kar Sakta:
- ❌ Seller products dekh nahi sakta
- ❌ Seller products manage nahi kar sakta
- ❌ Users manage nahi kar sakta
- ❌ Orders manage nahi kar sakta
- ❌ Settings change nahi kar sakta

---

## 🎯 Company Products vs Seller Products

### Company Products (Employee Add Karega):
- `seller_id = NULL`
- Employee admin panel se add karega
- Status = Pending (approval ke liye)
- Timer approve ke baad start hoga

### Seller Products (Sellers Add Karengi):
- `seller_id = seller's ID`
- Sellers Flutter app se add karengi
- Employee ko nahi dikhenge
- Status = Pending (approval ke liye)

---

## 📍 Exact Location

**Admin Panel → Products & Auctions Page → Top Right → "Add Company Product" Button**

---

## 🧪 Testing Checklist

- [ ] Employee login successful
- [ ] Dashboard load ho raha hai (403 fix)
- [ ] Products page accessible hai
- [ ] "Add Company Product" button visible hai
- [ ] Form open ho raha hai
- [ ] Categories load ho rahe hain
- [ ] Product create ho raha hai
- [ ] Product pending status me dikh raha hai
- [ ] Employee approve kar sakta hai
- [ ] Timer approve ke baad start hota hai

---

**Company products ab employee admin panel se add kar sakta hai!**

