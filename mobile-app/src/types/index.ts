export type UserRole = 'elderly' | 'caregiver' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  onboardingComplete?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ElderlyProfile {
  id: string;
  userId: string;
  preferredName: string | null;
  autonomyScore: number | null;
  interactionTimes: string[];
  location: string | null;
  onboardingComplete: boolean;
  linkCode: string;
}

export interface Medication {
  id: string;
  name: string;
  time: string;
  dosage: string;
  active: boolean;
  createdAt: string;
}

export interface TodayMedication {
  id: string;
  name: string;
  time: string;
  dosage: string;
  status: 'pending' | 'confirmed' | 'missed';
  historyId: string | null;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  thresholdDays: number;
  lastCallAt: string | null;
  createdAt: string;
}

export interface ContactWithStatus extends Contact {
  daysOverdue: number;
  isOverdue: boolean;
}

export interface AgendaEvent {
  id: string;
  description: string;
  dateTime: string;
  reminder: boolean;
  createdAt: string;
}

export interface WeatherData {
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  weatherDescription: string;
  clothingAdvice: string;
}

export interface ElderlyProfileSummary {
  id: string;
  preferredName: string;
  autonomyScore: number | null;
  todayMedicationStats: {
    total: number;
    confirmed: number;
    missed: number;
  };
  lastInteraction: string | null;
  hasAlert: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  subcategories?: Category[];
}

export interface Offering {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  price: number;
  active: boolean;
  category: {
    id: string;
    name: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ServiceRequest {
  id: string;
  offeringId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  requestedDateTime?: string;
  notes?: string;
  createdAt: string;
}

export interface MedicationHistory {
  id: string;
  medicationId: string;
  medicationName: string;
  confirmed: boolean;
  timestamp: string;
}

export interface CallHistory {
  id: string;
  contactId: string;
  contactName: string;
  calledAt: string;
}