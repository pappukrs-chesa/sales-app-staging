# Woson Bundle Discount Implementation

## Overview
Implemented Woson bundle discount logic across both web dashboard and mobile app. The discount applies when a customer purchases both Woson Tanda Autoclave (ATC/WOS/001) and Water Distiller (STE 404) together.

## Discount Rules by Price List

### DP (Price List 3) & SDP (Price List 4)
- **Benefit**: Water Distiller is **100% FREE**
- **Implementation**: Full distiller price is deducted from order total
- **Display**: Shows "FREE" tag on distiller item

### MRP (Price List 1)
- **Benefit**: ₹3,500 discount (post-tax)
- **Pre-tax discount**: ₹3,333.33 (₹3,500 / 1.05)
- **Implementation**: Fixed discount amount applied to order total

### MSP (Price List 2)
- **Benefit**: ₹6,000 discount (post-tax)
- **Pre-tax discount**: ₹5,714.29 (₹6,000 / 1.05)
- **Implementation**: Fixed discount amount applied to order total

## Files Modified

### Mobile App
1. **D:\sales-app\app\Cart\index.js**
   - Added `calculateWosonDiscount()` function
   - Loads PriceList from AsyncStorage
   - Highlights free distiller with green background
   - Shows discount breakdown in order summary
   - Passes wosonBundle data to checkout

2. **D:\sales-app\app\Checkout\index.js**
   - Receives and processes wosonBundle data
   - Displays Woson bundle notice at top of order summary
   - Shows discount breakdown (subtotal, discount, final total)
   - Applies 100% discount to distiller when applicable
   - Calculates correct order totals with discount

### Web Dashboard
The web implementation already exists in:
- **D:\sales-final\src\components\Pages\AllOrders\NewOrderForm.js**
- **D:\sales-final\src\Notification\Cartpage\CartPage.js**

## Key Features

### Visual Indicators
- **Mobile App**:
  - Green highlighted border for free distiller items
  - "(FREE)" tag next to distiller name
  - Green discount row in order summary
  - Celebration emoji (🎉) in bundle notice

- **Web Dashboard**:
  - Green background for free distiller row
  - "(FREE)" label with green text
  - Discount breakdown in order summary

### Calculation Logic
```javascript
// Check if both products exist
const wosonTanda = cart.find(item => item.code === 'ATC/WOS/001');
const waterDistiller = cart.find(item => item.code === 'STE 404');

if (wosonTanda && waterDistiller) {
  // Apply discount based on price list
  if (priceList === '3' || priceList === '4') {
    // FREE distiller
    discount = distillerPrice * 1.05; // Include tax
  } else if (priceList === '1') {
    // ₹3,500 post-tax discount
    discount = 3500 / 1.05; // Convert to pre-tax
  } else if (priceList === '2') {
    // ₹6,000 post-tax discount
    discount = 6000 / 1.05; // Convert to pre-tax
  }
}
```

### Order Summary Display
```
Subtotal: ₹XX,XXX
Woson Bundle Discount (Post-Tax: ₹X,XXX): - ₹X,XXX
Grand Total: ₹XX,XXX
```

## Testing Checklist

### Mobile App
- [ ] Add Woson Tanda (ATC/WOS/001) to cart
- [ ] Add Water Distiller (STE 404) to cart
- [ ] Verify discount appears in cart page
- [ ] Verify free distiller shows green highlight (DP/SDP)
- [ ] Verify discount amount is correct (MRP/MSP)
- [ ] Verify checkout page shows bundle notice
- [ ] Verify order total is calculated correctly
- [ ] Test with different price lists (1, 2, 3, 4)

### Web Dashboard
- [ ] Same tests as mobile app
- [ ] Verify discount input is disabled for free distiller
- [ ] Verify order submission includes correct pricing

## Price List Storage
- **Mobile**: AsyncStorage key `PriceList`
- **Web**: sessionStorage key `PriceList`

## Notes
- Discount is calculated on pre-tax amount
- Post-tax discount is shown for reference
- Free distiller applies 100% discount automatically
- Discount only applies when BOTH products are in cart
- Removing either product removes the discount
