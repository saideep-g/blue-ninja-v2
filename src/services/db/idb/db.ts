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
  Streak,
  Badge,
  MissionCompletion,
} from '../../../types/idb';

export class BlueNinjaDB extends Dexie {
  users!: Table<User>;
  userProfiles!: Table<UserProfile>;
  questions!: Table<Question>;
  assessments!: Table<Assessment>;
  progress!: Table<Progress>;
  dailyMissions!: Table<DailyMission>;
  adminData!: Table<AdminData>;
  syncLogs!: Table<SyncLog>;
  streaks!: Table<Streak>;
  badges!: Table<Badge>;
  missionCompletions!: Table<MissionCompletion>;

  constructor() {
    super('BlueNinjaDB');
    this.version(2).stores({
      users: 'id, email',
      userProfiles: 'userId',
      questions: 'id, subject, topic, level',
      assessments: 'id, userId, type, [userId+type], synced',
      progress: 'id, userId, date, [userId+date], synced',
      dailyMissions: 'id, userId, date, [userId+date], synced',
      adminData: 'id, key',
      syncLogs: '++id, timestamp, entity, status',
      streaks: 'id, userId',
      badges: 'id, userId, type',
      missionCompletions: 'id, userId, missionId, date, [userId+date]',
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
