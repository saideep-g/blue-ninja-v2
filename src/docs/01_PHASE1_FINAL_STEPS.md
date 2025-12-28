# Phase 1 Completion Guide - Steps 8-10
**Focus**: Complete the foundation to unlock Phase 2
**Estimated Time**: 14-20 hours  
**Status**: Ready to Execute

---

## 🎉 What's Done, What's Next

### Already Complete (Steps 1-7)
- ✅ Repository cleaned
- ✅ TypeScript with strict mode
- ✅ Folder structure organized
- ✅ Need to finalize: Zustand stores (Step 4)
- ✅ Need to finalize: IndexedDB services (Step 5)
- ✅ Need to finalize: Firestore optimization (Step 6)
- ✅ Need to finalize: Authentication (Step 7)

### Ready to Start NOW (Steps 8-10)
- ⏳ Step 8: User Profile System
- ⏳ Step 9: Theme System
- ⏳ Step 10: Logging System

---

## 🔧 Quick Setup (5 minutes)

### Install Zustand

```bash
npm install zustand
```

### Verify Dependencies

```bash
npm ls | grep -E "zustand|zod|dexie|firebase"

# Should see:
# zustand@5.x.x (or latest)
# zod@4.2.1
# dexie@4.2.1
# firebase@12.7.0
```

---

## 🎯 STEP 8: User Profile System

**Goal**: Users can configure their practice preferences  
**Estimated Time**: 6-8 hours  
**Dependencies**: Zustand, Zod, IndexedDB ready

### Step 8.1: Create User Store

**File**: `src/store/userStore.ts`

```typescript
import { create } from 'zustand';
import { User, UserProfile } from '../types';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  
  setUser: (user: User) => set({ user }),
  
  updateProfile: (profile: Partial<UserProfile>) => 
    set((state) => ({
      user: state.user ? {
        ...state.user,
        profile: { ...state.user.profile, ...profile }
      } : null
    })),
  
  clearUser: () => set({ user: null, error: null })
}));
```

### Step 8.2: Create Zod Schemas

**File**: `src/schemas/userSchemas.ts`

```typescript
import { z } from 'zod';

export const UserProfileSchema = z.object({
  class: z.enum(['6', '7', '8']).transform(Number),
  theme: z.enum(['light', 'dark']).default('light'),
  dailyQuestionCount: z.number().min(1).max(15).default(5),
  diagnosticQuestionCount: z.number().min(1).max(30).default(15),
  excludedChapters: z.array(z.string()).default([]),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.enum(['STUDENT', 'ADMIN']).default('STUDENT'),
  profile: UserProfileSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type User = z.infer<typeof UserSchema>;
```

### Step 8.3: Create Profile Settings Component

**File**: `src/components/profile/ProfileSettings.tsx`

```typescript
import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { UserProfileSchema } from '../../schemas/userSchemas';

export const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useUserStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState(user?.profile || {
    class: '6',
    theme: 'light',
    dailyQuestionCount: 5,
    diagnosticQuestionCount: 15,
    excludedChapters: [],
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate with Zod
      const validated = UserProfileSchema.parse(formData);
      
      // Save to store
      updateProfile(validated);
      
      // TODO: Sync to Firestore and IndexedDB
      // await syncProfileToStorage(validated);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Practice Settings</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <form className="space-y-6">
        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Class</label>
          <select
            className="w-full p-2 border rounded"
            value={formData.class}
            onChange={(e) => setFormData({ ...formData, class: e.target.value })}
          >
            <option value="6">Class 6</option>
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
          </select>
        </div>

        {/* Daily Questions */}
        <div>
          <label className="block text-sm font-medium mb-2">Daily Questions (1-15)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            min="1"
            max="15"
            value={formData.dailyQuestionCount}
            onChange={(e) => setFormData({ 
              ...formData, 
              dailyQuestionCount: parseInt(e.target.value) 
            })}
          />
        </div>

        {/* Diagnostic Questions */}
        <div>
          <label className="block text-sm font-medium mb-2">Diagnostic Questions (1-30)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            min="1"
            max="30"
            value={formData.diagnosticQuestionCount}
            onChange={(e) => setFormData({ 
              ...formData, 
              diagnosticQuestionCount: parseInt(e.target.value) 
            })}
          />
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            className="w-full p-2 border rounded"
            value={formData.theme}
            onChange={(e) => setFormData({ 
              ...formData, 
              theme: e.target.value as 'light' | 'dark' 
            })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};
```

### Step 8.4: Create IndexedDB User Service

**File**: `src/services/idb/userService.ts`

```typescript
import { openDB } from 'dexie';
import { User } from '../../types';
import { logger } from '../logging/logger';

class UserService {
  private dbName = 'blue-ninja';
  private storeName = 'users';

  async saveUser(user: User): Promise<void> {
    try {
      const db = await openDB(this.dbName);
      await db.table(this.storeName).put(user);
      logger.info('User saved to IndexedDB', { userId: user.id });
    } catch (err) {
      logger.error('Failed to save user', { error: err });
      throw err;
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    try {
      const db = await openDB(this.dbName);
      const user = await db.table(this.storeName).get(userId);
      logger.debug('User retrieved', { userId, found: !!user });
      return user;
    } catch (err) {
      logger.error('Failed to get user', { userId, error: err });
      throw err;
    }
  }

  async updateUserProfile(userId: string, profile: any): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('User not found');
      
      user.profile = { ...user.profile, ...profile };
      user.updatedAt = new Date();
      await this.saveUser(user);
      logger.info('User profile updated', { userId });
    } catch (err) {
      logger.error('Failed to update profile', { userId, error: err });
      throw err;
    }
  }
}

export const userService = new UserService();
```

### Step 8.5: Integration & Testing

```bash
# Test in browser console:
# 1. Navigate to ProfileSettings component
# 2. Try changing settings
# 3. Verify Zod validation works
# 4. Check browser DevTools -> Application -> IndexedDB

# Command line test:
npm run type-check  # Should pass
npm run build       # Should build successfully
```

---

## 🎨 STEP 9: Theme System

**Goal**: Light/dark theme with smooth transitions  
**Estimated Time**: 4-6 hours  
**Dependencies**: Theme folder exists, user profile ready

### Step 9.1: Create Theme Provider

**File**: `src/theme/ThemeProvider.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserStore } from '../store/userStore';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useUserStore();
  const [theme, setTheme] = useState<Theme>(
    user?.profile?.theme || 'light'
  );

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update in localStorage for persistence
    localStorage.setItem('theme', theme);
    
    // Persist in user profile
    if (user) {
      updateProfile({ theme });
    }
  }, [theme, user, updateProfile]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Step 9.2: CSS Variables

**File**: `src/theme/theme.css`

```css
/* Light theme (default) */
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #000000;
  --color-text-secondary: #666666;
  --color-border: #cccccc;
  --color-accent: #4CAF50;
  --color-error: #ff5252;
  --transition: color 0.3s ease, background-color 0.3s ease;
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg-primary: #1e1e1e;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #ffffff;
  --color-text-secondary: #aaaaaa;
  --color-border: #444444;
  --color-accent: #66bb6a;
  --color-error: #ff6e6e;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: var(--transition);
}
```

### Step 9.3: Theme Toggle Component

**File**: `src/components/theme/ThemeToggle.tsx`

```typescript
import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
    </button>
  );
};
```

### Step 9.4: Update Main App

**File**: `src/App.tsx` (update)

```typescript
import { ThemeProvider } from './theme/ThemeProvider';
import './theme/theme.css';

function App() {
  return (
    <ThemeProvider>
      {/* Your existing app content */}
    </ThemeProvider>
  );
}
```

---

## 📝 STEP 10: Logging System

**Goal**: Comprehensive logging for debugging  
**Estimated Time**: 4-6 hours  
**Dependencies**: All previous steps

### Step 10.1: Create Logger Service

**File**: `src/services/logging/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;

  debug(message: string, data?: Record<string, any>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, any>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, any>) {
    this.log('error', message, data);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console.log(
        `%c[${level.toUpperCase()}]%c ${message}`,
        style,
        'color: inherit',
        data || ''
      );
    }

    // Could send to remote service in production
    // if (level === 'error') {
    //   this.sendToRemote(entry);
    // }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #888; font-style: italic;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #ff0000; font-weight: bold;',
    };
    return styles[level];
  }

  getLogs(filter?: { level?: LogLevel; limit?: number }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
```

### Step 10.2: Error Boundary Component

**File**: `src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';
import { logger } from '../services/logging/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-100 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-700">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 10.3: Integrate Into App

**File**: `src/App.tsx` (add)

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* Your app content */}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

---

## ✅ Phase 1 Completion Checklist

```markdown
## STEP 8: User Profile
- [ ] Create userStore.ts
- [ ] Create UserProfileSchema with Zod
- [ ] Create ProfileSettings component
- [ ] Create userService (IndexedDB)
- [ ] Test profile form
- [ ] Verify Zod validation
- [ ] Commit: "Step 8: User Profile System Complete"

## STEP 9: Theme System
- [ ] Create ThemeProvider
- [ ] Create theme.css with variables
- [ ] Create ThemeToggle component
- [ ] Update App.tsx to use ThemeProvider
- [ ] Test theme switching
- [ ] Verify persistence
- [ ] Commit: "Step 9: Theme System Complete"

## STEP 10: Logging
- [ ] Create logger service
- [ ] Create ErrorBoundary component
- [ ] Update App.tsx with ErrorBoundary
- [ ] Test logging in console
- [ ] Test error boundary
- [ ] Commit: "Step 10: Logging System Complete"

## PHASE 1 FINAL
- [ ] All 10 steps complete
- [ ] npm run type-check passes
- [ ] npm run build succeeds
- [ ] No console errors
- [ ] Create tag: v1.0.0-phase1-complete
- [ ] Update PROGRESS.md
```

---

## 🚀 Ready for Phase 2?

Once Steps 8-10 are complete:

✅ Foundation is solid  
✅ State management ready  
✅ Error handling in place  
✅ Logging for debugging  
✅ Theme system working  
✅ Type safety with TypeScript + Zod  

**Next**: Start Phase 2 with core features:
- Diagnostic test system
- Daily missions
- Student dashboard
- Admin dashboard
- Question authoring

---

**Status**: 🟢 READY TO BUILD  
**Difficulty**: Medium (Clear requirements, good dependencies)  
**Timeline**: This week (14-20 hours)

