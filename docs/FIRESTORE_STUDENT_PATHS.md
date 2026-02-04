# Student Profile Data Structure - Firestore Paths

## Primary Student Data

### Path: `students/{studentId}`

This is the main student profile document. Expected fields:

```typescript
{
  // Basic Info
  studentName: string,          // Or could be 'name'
  email: string,
  grade: number,                // Current grade level
  curriculum: string,           // e.g., "CBSE", "ICSE"
  preferredLayout: string,      // "study-era", "mobile-quest-v1", "default"
  
  // Subjects
  enrolledSubjects: string[],   // ["math", "science", "english", ...]
  
  // Practice Settings
  dailyQuestionConfig: {
    weekday: number,            // Questions per weekday
    weekend: number,            // Questions per weekend
    holiday: number             // Questions per holiday
  },
  
  // Boost Periods
  boostPeriods: [{
    name: string,
    startDate: string,
    endDate: string
  }],
  
  // Exam Mode
  examMode: {
    enabled: boolean,
    examName: string,
    startDate: string,
    endDate: string
  },
  
  // Theme Preference (NEW - to be added)
  theme: "light" | "dark",      // User's theme preference
  
  // Timestamps
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

## Alternative Field Names

If `studentName` and `grade` are showing "Not Set", check these alternatives:

### Possible field name variations:
- `studentName` → `name`, `fullName`, `displayName`
- `grade` → `currentGrade`, `gradeLevel`

### Data might be in NinjaStats instead:

**Path:** `students/{studentId}/stats/current` or stored in memory

```typescript
{
  username: string,
  email: string,
  grade: number,              // Grade might be here
  // ... other stats
}
```

## Recommendation

1. **Check actual Firestore data** in Firebase Console:
   - Go to Firestore Database
   - Navigate to `students/{your-test-student-id}`
   - Note the exact field names

2. **Update ProfileInfoTab.tsx** to handle multiple possible field names:
   ```typescript
   studentName: profile.studentName || profile.name || profile.displayName || user?.displayName || 'Not set'
   grade: profile.grade || profile.currentGrade || ninjaStats?.grade || 'Not set'
   ```

3. **Add grade to NinjaStats interface** if it's stored there:
   ```typescript
   export interface NinjaStats {
     // ... existing fields
     grade?: number;
     studentName?: string;
   }
   ```

## Theme Preference

### New Field to Add:
**Path:** `students/{studentId}`
```typescript
{
  theme: "light" | "dark"  // Default: "light"
}
```

### Usage:
- Student can toggle in Profile Info tab
- Saved to Firestore
- Applied globally via context/state management
