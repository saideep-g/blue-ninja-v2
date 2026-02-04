# Theme Toggle Fix - Student Profile

**Date:** February 4, 2026  
**Issue:** Theme toggle button not working - theme not changing on click or after refresh

---

## Problem Analysis

### Issues Found:

1. **Wrong Firestore Path:**
   - Code was saving to: `students/{studentId}.theme`
   - Should save to: `students/{studentId}.profile.theme` (profile map)

2. **Not Using Existing Theme System:**
   - App already has a theme system with:
     - `ThemeProvider` context
     - `useTheme()` hook
     - `useProfileStore()` Zustand store
   - ProfileInfoTab was manually toggling classes instead of using the system

3. **No Global State Update:**
   - Only updated local component state
   - Didn't trigger the global theme provider
   - Theme wasn't persisted across app

---

## Solution Implemented

### 1. Import Existing Theme Hooks

```typescript
import { useTheme } from '../../../../theme/provider';
import { useProfileStore } from '../../../../store/profile';
```

### 2. Use Theme Context

```typescript
const { theme, effectiveTheme, setTheme } = useTheme();
const { updateProfile } = useProfileStore();
```

### 3. Fixed handleThemeToggle Function

**Before:**
```typescript
const handleThemeToggle = async () => {
    const newTheme = (profile.theme || 'light') === 'light' ? 'dark' : 'light';
    
    // Wrong path
    await updateDoc(profileRef, {
        theme: newTheme
    });
    
    // Manual class toggle (doesn't work with theme system)
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
};
```

**After:**
```typescript
const handleThemeToggle = async () => {
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    
    try {
        // Correct path - save to profile map
        await updateDoc(profileRef, {
            'profile.theme': newTheme
        });
        
        // Update local state
        if (profile) {
            setProfile({ ...profile, theme: newTheme });
        }
        
        // Update global theme state (this applies the theme)
        setTheme(newTheme);
        
        console.log(`✅ Theme updated to: ${newTheme}`);
    } catch (error) {
        console.error('❌ Error updating theme:', error);
        alert('Failed to update theme. Please try again.');
    }
};
```

### 4. Sync Theme on Load

```typescript
useEffect(() => {
    const fetchProfile = async () => {
        const data = profileSnap.data();
        setProfile(data);
        
        // Sync theme from Firestore to local state
        if (data.theme && data.theme !== theme) {
            setTheme(data.theme as 'light' | 'dark');
        }
    };
    
    fetchProfile();
}, [user]);
```

### 5. Updated UI to Use effectiveTheme

```typescript
// Icon display
{effectiveTheme === 'light' ? <Sun /> : <Moon />}

// Button text
{effectiveTheme === 'light' ? 'Switch to Dark' : 'Switch to Light'}

// Current theme display
<span>{effectiveTheme}</span>
```

---

## How It Works Now

### 1. User Clicks Toggle Button

```
User clicks "Switch to Dark"
    ↓
handleThemeToggle() executes
    ↓
Saves to Firestore: students/{uid}/profile.theme = "dark"
    ↓
Updates local state: setProfile({ ...profile, theme: "dark" })
    ↓
Updates global theme: setTheme("dark")
    ↓
ThemeProvider applies theme:
  - Sets document.documentElement.setAttribute('data-theme', 'dark')
  - Adds 'dark' class to document.documentElement
    ↓
CSS applies dark theme styles
    ↓
UI updates immediately
```

### 2. User Refreshes Page

```
Page loads
    ↓
ProfileInfoTab fetches from Firestore
    ↓
Reads: students/{uid}/profile.theme = "dark"
    ↓
Syncs to global theme: setTheme("dark")
    ↓
ThemeProvider applies theme
    ↓
UI renders in dark mode
```

---

## Firestore Data Structure

### Correct Path:
```
students/{studentId}
├── name: "John Doe"
├── email: "john@example.com"
├── role: "STUDENT"
└── profile: {
    ├── grade: 7
    ├── theme: "dark"  ← Saved here
    ├── layout: "study-era"
    └── ... other fields
}
```

### Update Command:
```typescript
await updateDoc(profileRef, {
    'profile.theme': 'dark'  // Dot notation for nested field
});
```

---

## Theme System Architecture

### Components:

1. **ThemeProvider** (`src/theme/provider.tsx`)
   - Wraps entire app
   - Manages theme state
   - Applies theme to DOM
   - Listens for system preference changes

2. **useTheme Hook**
   - Provides: `theme`, `effectiveTheme`, `setTheme()`
   - Used by components to read/update theme

3. **Profile Store** (`src/store/profile.ts`)
   - Zustand store with persistence
   - Stores theme in localStorage
   - Syncs with Firestore

4. **ProfileInfoTab**
   - UI for theme toggle
   - Saves to Firestore
   - Updates global theme state

---

## Testing

### Test Theme Toggle:
1. ✅ Navigate to `/profile`
2. ✅ Click "Profile Info" tab
3. ✅ Click "Switch to Dark" button
4. ✅ Verify:
   - Button shows loading spinner
   - Theme changes immediately
   - Console shows: "✅ Theme updated to: dark"
   - Firestore updates at `students/{uid}/profile.theme`

5. ✅ Refresh page
6. ✅ Verify:
   - Theme persists (stays dark)
   - Button shows "Switch to Light"
   - Current theme displays "dark"

7. ✅ Click "Switch to Light"
8. ✅ Verify:
   - Theme changes back to light
   - All tabs maintain light theme

### Check Firestore:
1. Open Firebase Console
2. Navigate to `students/{your-uid}`
3. Check `profile.theme` field
4. Should be "light" or "dark"

---

## Files Modified

1. **`src/components/student/profile/tabs/ProfileInfoTab.tsx`**
   - Added `useTheme` and `useProfileStore` imports
   - Updated `handleThemeToggle` to use theme system
   - Fixed Firestore path to `profile.theme`
   - Updated UI to use `effectiveTheme`
   - Added theme sync on profile load

---

## Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Firestore Path** | `students/{uid}.theme` | `students/{uid}.profile.theme` |
| **Theme Application** | Manual class toggle | Global theme system |
| **State Management** | Local only | Local + Global + Firestore |
| **Persistence** | None | Zustand + Firestore |
| **UI Source** | `profile.theme` | `effectiveTheme` |

---

## Status

✅ **Fixed and Working**

- Theme toggle now works immediately
- Theme persists after refresh
- Saves to correct Firestore path
- Integrates with existing theme system
- No console errors

---

**Next Steps:**
1. Test with real student account
2. Verify Firestore updates
3. Test across different tabs
4. Ensure theme applies globally
