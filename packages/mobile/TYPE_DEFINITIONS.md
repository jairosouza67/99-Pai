# Frontend Type Definitions & Expected Backend Schemas

This document describes the TypeScript types used on the frontend to ensure backend implementation matches expected shapes.

## Source File
All these types are defined in: `src/types/index.ts`

## Core Types

### UserRole
```typescript
type UserRole = 'elderly' | 'caregiver' | 'provider' | 'admin';
```

### User
```typescript
interface User {
  id: string;              // UUID
  email: string;           // User's email
  name: string;            // Full name
  role: UserRole;          // One of 4 roles
  onboardingComplete?: boolean;
}
```

### AuthResponse  
```typescript
interface AuthResponse {
  token: string;          // JWT access token
  user: User;            // User object
}
```

## Domain Models

### ElderlyProfile
Stores elderly person's data.

```typescript
interface ElderlyProfile {
  id: string;
  userId: string;                    // FK to User.id
  preferredName: string | null;      // What they want to be called
  autonomyScore: number | null;      // 0-100 (from onboarding)
  interactionTimes: string[];        // ["08:00", "12:00", ...]
  location: string | null;           // Home address?
  onboardingComplete: boolean;       // Has completed setup?
  linkCode: string;                  // 6-char code for caregiver linking
}
```

### Medication
Base medication record.

```typescript
interface Medication {
  id: string;
  name: string;                      // E.g., "Aspirina"
  time: string;                      // "08:00" or "HH:mm"
  dosage: string;                    // E.g., "500mg"
  active: boolean;                   // Is this medication still active?
  createdAt: string;                 // ISO 8601 timestamp
}
```

### TodayMedication
Today's medication with confirmation status.

```typescript
interface TodayMedication {
  id: string;
  name: string;
  time: string;
  dosage: string;
  status: 'pending' | 'confirmed' | 'missed';
  historyId: string | null;          // Link to history record if confirmed
}
```

### Contact
Contact person record.

```typescript
interface Contact {
  id: string;
  name: string;                      // Contact's name
  phone: string;                     // Should include country code
  thresholdDays: number;             // Remind every N days
  lastCallAt: string | null;         // ISO 8601 timestamp or null
  createdAt: string;
}
```

### ContactWithStatus
Contact with calculated overdue info.

```typescript
interface ContactWithStatus extends Contact {
  daysOverdue: number;               // Days since last call vs threshold
  isOverdue: boolean;                // Is call overdue?
}
```

**Note:** `daysOverdue` and `isOverdue` can be calculated on frontend or backend.

### AgendaEvent
Event/appointment.

```typescript
interface AgendaEvent {
  id: string;
  description: string;               // E.g., "Doctor appointment"
  dateTime: string;                  // ISO 8601 full datetime
  reminder: boolean;                 // Should notify?
  createdAt: string;
}
```

### WeatherData
Current weather conditions.

```typescript
interface WeatherData {
  temperature: number;               // In Celsius
  temperatureUnit: string;           // "C" or "F"
  weatherCode: number;               // WMO weather code
  weatherDescription: string;        // "Sunny", "Rainy", etc.
  clothingAdvice: string;           // Voice suggestion: "Leve um guarda-chuva"
}
```

### MedicationHistory
Record of medication taken/missed.

```typescript
interface MedicationHistory {
  id: string;
  medicationId: string;              // FK to Medication
  medicationName: string;            // Denormalized name
  confirmed: boolean;                // Was it taken?
  timestamp: string;                 // ISO 8601 when confirmed/missed
}
```

### CallHistory
Record of contact calls.

```typescript
interface CallHistory {
  id: string;
  contactId: string;                 // FK to Contact
  contactName: string;               // Denormalized
  calledAt: string;                  // ISO 8601 when called
}
```

## Marketplace Types (For Future Use)

### Category
Service categories for the marketplace.

```typescript
interface Category {
  id: string;
  name: string;                      // E.g., "Limpeza", "Saúde"
  parentId: string | null;           // Null for top-level, ref to parent for subcategory
  subcategories?: Category[];        // Nested array (optional)
}
```

### Offering
Service offering by a provider.

```typescript
interface Offering {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;                 // Provider's service photo
  price: number;                     // In cents (e.g., 5000 = R$ 50.00)
  active: boolean;
  category: {
    id: string;
    name: string;
  };
  subcategory?: {                    // Optional for subcategory offerings
    id: string;
    name: string;
  };
  user: {                            // Provider who created it
    id: string;
    name: string;
    email: string;
  };
}
```

### ServiceRequest
Request for a provider's offering.

```typescript
interface ServiceRequest {
  id: string;
  offeringId: string;                // FK to Offering
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  requestedDateTime?: string;        // When elderly wants service (optional)
  notes?: string;                    // Special requests
  createdAt: string;
}
```

## Summary Lists

### ElderlyProfileSummary
Summary for caregiver's elderly list.

```typescript
interface ElderlyProfileSummary {
  id: string;
  preferredName: string;
  autonomyScore: number | null;
  todayMedicationStats: {
    total: number;                   // Total meds for today
    confirmed: number;               // Confirmed taken
    missed: number;                  // Missed
  };
  lastInteraction: string | null;    // ISO 8601 of last activity
  hasAlert: boolean;                 // Is something wrong (overdue med, etc)?
}
```

## Frontend Assumptions About Backend

1. **All IDs are UUIDs** - Alphanumeric strings
2. **All timestamps are ISO 8601** - Format: `YYYY-MM-DDTHH:mm:ssZ`
3. **Prices in cents** - Backend returns 5000 for R$ 50.00
4. **Phone format** - Includes country code (+55...)
5. **Time format** - HH:mm (24-hour)
6. **Date arithmetic** - Frontend calculates `daysOverdue` if not provided
7. **Permissions enforced** - Backend validates role/access on all endpoints
8. **Cascade deletes** - Deleting user deletes elderly profile, medications, etc
9. **Soft deletes** - Deleted records marked but not removed (for history)
10. **Audit fields** - createdAt/updatedAt on all entities

## Implementation Checklist for Backend

- [ ] All interfaces match expected API responses
- [ ] All fields are present in responses
- [ ] Timestamps always in ISO 8601 format
- [ ] UUIDs used for all IDs
- [ ] Phone numbers include country code
- [ ] Prices in cents for business logic
- [ ] `daysOverdue` calculated correctly (or frontend calculates)
- [ ] `isOverdue` matches business rules (>= thresholdDays)
- [ ] `todayMedicationStats` includes missed count
- [ ] `hasAlert` set if any overdue contacts or missed meds
- [ ] Array responses wrapped in `{ items: [...] }`
- [ ] Single object responses unwrapped (no wrapper)
- [ ] Errors always include statusCode and message
- [ ] No field is undefined (use null instead)
- [ ] All required fields always present

## Field Validation Rules

### Email
- Must be valid email format
- Unique across system
- Case-insensitive comparison

### Password
- Minimum 8 characters (frontend UI suggests 8+)
- Backend should hash with bcrypt or similar
- Never returned in API responses

### LinkCode
- 6 alphanumeric characters
- Case-insensitive
- Unique per elderly
- Backend generates automatically

### Autonomy Score
- Integer 0-100
- Calculated from onboarding answers:
  - Each yes = 3 points
  - Sometimes = 2 points
  - No = 1 point
  - Total / 12 * 100
- Null if onboarding not complete

### Threshold Days
- Positive integer
- Default 7 for contacts
- Backend can enforce minimum/maximum

### Time Format
- HH:mm (24-hour)
- Valid times: 00:00 to 23:59
- Can be optional (for one-time events)

### Dosage
- Free text
- Examples: "500mg", "1 tablet", "10ml"
- Should be human-readable

## Testing Data Contracts

For integration testing, ensure these example values work:

```typescript
// Example User
{
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: "user@example.com",
  name: "João Silva",
  role: "elderly"
}

// Example Medication
{
  id: "223e4567-e89b-12d3-a456-426614174001",
  name: "Aspirina",
  time: "08:00",
  dosage: "500mg",
  active: true,
  createdAt: "2024-01-10T08:00:00Z"
}

// Example Contact
{
  id: "323e4567-e89b-12d3-a456-426614174002",
  name: "Maria Silva",
  phone: "+5511999999999",
  thresholdDays: 7,
  lastCallAt: "2024-01-12T14:30:00Z",
  createdAt: "2024-01-01T00:00:00Z"
}

// Example Contact With Status
{
  ...contact,
  daysOverdue: 3,
  isOverdue: true
}

// Example TodayMedication
{
  id: "423e4567-e89b-12d3-a456-426614174003",
  name: "Aspirina",
  time: "08:00",
  dosage: "500mg",
  status: "pending",
  historyId: null
}

// Example MedicationHistory
{
  id: "523e4567-e89b-12d3-a456-426614174004",
  medicationId: "223e4567-e89b-12d3-a456-426614174001",
  medicationName: "Aspirina",
  confirmed: true,
  timestamp: "2024-01-15T08:05:00Z"
}
```

---

**Last Updated:** January 2025  
**Status:** Ready for backend implementation
