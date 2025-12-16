# User Province Filtering Implementation

## Overview

Added province-based filtering to the Admin Users tab, similar to the dashboard export table. This allows admins to filter users by their province location from their Firebase address data.

## Implementation Details

### Data Source Hierarchy

The system checks user addresses in the following order:

1. **Primary**: `User > addresses` array (Firebase standard)
   - Looks for `isDefault: true` address first
   - Falls back to first address with province data
2. **Fallback**: `User > shippingAddresses` array (legacy)
   - Checks for default address with province
   - Falls back to first address object with province

### Province Code Mapping

Supports both field names:

- `provinceCode` (preferred, matches select-philippines-address format)
- `province` (fallback for legacy data)

### Address Structure

```typescript
interface UserAddress {
  city?: string;
  cityName?: string;
  addressLine1?: string;
  province?: string;
  provinceCode?: string; // Matches province codes from API
  isDefault?: boolean; // Prioritized in filtering
  [key: string]: any;
}
```

## Files Modified

### 1. **types.ts** - Type Definitions

**Location**: `/src/components/users/types.ts`

**Changes:**

- Added `UserAddress` interface
- Updated `User.addresses` field to support address objects
- Changed filter from `location` to `province`
- Updated `Filters` type: `location: string` → `province: string`

### 2. **UserFilters.tsx** - Filter UI Component

**Location**: `/src/components/users/UserFilters.tsx`

**Changes:**

- Replaced "Location" dropdown with "Province" dropdown
- Now accepts `provinces: Array<{ code: string; name: string }>` prop
- Uses province codes (e.g., `"0128"` for Metro Manila) as values
- Displays province names (e.g., "Metro Manila") to users

**UI Update:**

```tsx
// Before: Location dropdown with city names
<Label>Location</Label>
<Select value={filters.location}>
  {locations.map(city => ...)}
</Select>

// After: Province dropdown with province codes
<Label>Province</Label>
<Select value={filters.province}>
  {provinces.map(p => <SelectItem value={p.code}>{p.name}</SelectItem>)}
</Select>
```

### 3. **UsersTab.tsx** - Main Logic Component

**Location**: `/src/components/users/UsersTab.tsx`

**Changes:**

- Imported `getProvinces` from `@/lib/phLocations`
- Added `phProvinces` state to store loaded provinces
- Added `useEffect` to load provinces on mount
- Implemented `getUserProvince()` helper function
- Updated filtering logic to use province codes
- Removed old `locations` memo (city-based)
- Updated `UserFilters` component props

**Key Functions:**

#### `getUserProvince(user: User): string | null`

Extracts user's province code with the following logic:

1. Check `user.addresses` array:

   - Find address with `isDefault: true`
   - Extract `provinceCode` or `province`
   - If no default, use first address with province data

2. Fallback to `user.shippingAddresses`:

   - Find default address
   - Extract province from first available address object

3. Return `null` if no province found

## Benefits

### ✅ **Standardized Filtering**

- Consistent with admin dashboard export table
- Uses province codes instead of free-text city names
- Reduces ambiguity (e.g., multiple cities with same name)

### ✅ **Default Address Priority**

- Respects `isDefault: true` flag in addresses
- More accurate representation of user's primary location
- Falls back gracefully to first available address

### ✅ **Backward Compatible**

- Supports both `addresses` and `shippingAddresses` fields
- Handles both `provinceCode` and `province` field names
- Works with existing user data

### ✅ **Better UX**

- Dropdown shows readable province names
- Stores efficient province codes internally
- Matches familiar location selection pattern

## Testing

### Test Cases

1. **User with default address:**

   ```javascript
   {
     addresses: [
       { city: "Manila", provinceCode: "0128", isDefault: true },
       { city: "Quezon City", provinceCode: "0128", isDefault: false },
     ];
   }
   ```

   Expected: Uses "0128" (Metro Manila) from default address

2. **User with no default address:**

   ```javascript
   {
     addresses: [
       { city: "Cebu", provinceCode: "0722" },
       { city: "Manila", provinceCode: "0128" },
     ];
   }
   ```

   Expected: Uses "0722" (Cebu) from first address

3. **User with legacy shippingAddresses:**

   ```javascript
   {
     shippingAddresses: [{ city: "Davao", province: "1182" }];
   }
   ```

   Expected: Uses "1182" (Davao del Sur) from fallback field

4. **User with no province data:**
   ```javascript
   {
     addresses: [{ city: "Unknown City" }];
   }
   ```
   Expected: Excluded when province filter is active, included when filter is "All"

### Manual Testing Steps

1. Navigate to **Admin > Users** tab
2. Check that Province dropdown shows all Philippine provinces
3. Select a specific province (e.g., "Metro Manila")
4. Verify only users from that province are displayed
5. Select "All Provinces"
6. Verify all users are shown again
7. Test with users having:
   - Default addresses
   - Multiple addresses
   - Legacy shippingAddresses
   - No address data

## Province Code Reference

Common province codes (from `select-philippines-address`):

- `0128` - Metro Manila (NCR)
- `0314` - Cavite
- `0410` - Batangas
- `0722` - Cebu
- `1182` - Davao del Sur

Full list loaded from `@/lib/phLocations` API.

## Database Schema Reference

### Firebase Structure

```
User (collection)
├── {userId}
    ├── firstName: string
    ├── lastName: string
    ├── email: string
    ├── addresses: array
    │   ├── [0]
    │   │   ├── city: string
    │   │   ├── provinceCode: string
    │   │   ├── province: string (legacy)
    │   │   ├── isDefault: boolean
    │   │   └── ...other fields
    │   └── [1]
    │       └── ...
    └── shippingAddresses: array (legacy fallback)
        └── ...
```

## Future Enhancements

### Potential Improvements

1. **City/Municipality Filter**: Add second-level filtering by city within province
2. **Address Validation**: Ensure all users have valid province codes
3. **Bulk Address Update**: Tool to normalize legacy address data
4. **Address Analytics**: Dashboard showing user distribution by province
5. **Multi-Province Filter**: Allow selecting multiple provinces at once
6. **Address Migration Script**: Convert all `province` to `provinceCode`

### Related Features

- Export user list filtered by province (CSV/PDF)
- User location heatmap visualization
- Province-based marketing campaigns
- Regional admin access controls

## Related Files

- `/src/components/users/UsersTab.tsx` - Main component
- `/src/components/users/UserFilters.tsx` - Filter UI
- `/src/components/users/types.ts` - Type definitions
- `/src/lib/phLocations.ts` - Province data API
- `/src/pages/Dashboard.tsx` - Similar implementation reference

## Rollback Instructions

If you need to revert to city-based location filtering:

1. Restore `location` field in `Filters` type
2. Restore `locations` prop in `UserFilters`
3. Restore city extraction logic in `UsersTab`
4. Update filtering to use city names instead of province codes

---

**Last Updated**: December 15, 2025  
**Implementation**: Province Filtering v1.0  
**Related**: PRIVACY-PROTECTION.md (name masking feature)
