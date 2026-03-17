export type EmissionCategory = 'travel' | 'electricity' | 'food';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  totalPoints: number;
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  badges: string[];
}

export interface EmissionEntry {
  id?: string;
  userId: string;
  date: any; // Firestore Timestamp
  category: EmissionCategory;
  value: number;
  unit: string;
  co2Amount: number; // in kg
  details: {
    mode?: string;
    foodItem?: string;
    servings?: number;
    distance?: number;
    consumption?: number;
  };
  pointsEarned: number;
}

export interface EmissionFactor {
  category: EmissionCategory;
  label: string;
  factor: number; // kg CO2 per unit
  unit: string;
}
