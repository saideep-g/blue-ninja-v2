import Dexie, { type Table } from 'dexie';
import type {
  User,
  UserProfile,
  Question,
  Assessment,
  Progress,
  DailyMission,
  AdminData,
  SyncLog,
} from '../../types/idb';

export class BlueNinjaDB extends Dexie {
  users!: Table<User>;
  userProfiles!: Table<UserProfile>;
  questions!: Table<Question>;
  assessments!: Table<Assessment>;
  progress!: Table<Progress>;
  dailyMissions!: Table<DailyMission>;
  adminData!: Table<AdminData>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('BlueNinjaDB');
    this.version(1).stores({
      users: 'id, email',
      userProfiles: 'userId',
      questions: 'id, subject, topic, level',
      assessments: 'id, userId, type, [userId+type]',
      progress: 'id, userId, date, [userId+date]',
      dailyMissions: 'id, userId, date, [userId+date]',
      adminData: 'id, key',
      syncLogs: '++id, timestamp, entity, status',
    });
  }
}

// Create singleton instance
export const db = new BlueNinjaDB();

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Try to access the database
    const count = await db.users.count();
    console.log(`✅ Database healthy. Users: ${count}`);
    return true;
  } catch (error) {
    console.error('❌ Database error:', error);
    return false;
  }
}
