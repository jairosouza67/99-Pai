# API Response Types & Contracts

This document defines the expected request/response shapes for all API endpoints used by the mobile frontend.

## Authentication

### POST /auth/signup
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "elderly" | "caregiver" | "provider" | "admin"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "elderly",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "elderly",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /auth/me
**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "elderly",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Elderly Profile

### GET /elderly/profile
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "preferredName": "João",
  "autonomyScore": 75,
  "interactionTimes": ["08:00", "12:00", "16:00", "19:00"],
  "linkCode": "ABC123",
  "onboardingComplete": true,
  "createdAt": "2024-01-10T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### PATCH /elderly/profile
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Request:**
```json
{
  "preferredName": "João",
  "autonomyScore": 75,
  "interactionTimes": ["08:00", "12:00", "16:00", "19:00"],
  "onboardingComplete": true
}
```

**Response (200):** Same as GET

---

## Medications

### GET /medications/today
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Aspirina",
      "dosage": "500mg",
      "time": "08:00",
      "confirmed": false,
      "confirmedAt": null,
      "elderlyId": "uuid"
    },
    {
      "id": "uuid",
      "name": "Omeprazol",
      "dosage": "20mg",
      "time": "12:00",
      "confirmed": true,
      "confirmedAt": "2024-01-15T12:30:00Z",
      "elderlyId": "uuid"
    }
  ]
}
```

### POST /medications/{id}/confirm
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Request:**
```json
{
  "confirmed": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Aspirina",
  "dosage": "500mg",
  "time": "08:00",
  "confirmed": true,
  "confirmedAt": "2024-01-15T08:05:00Z",
  "elderlyId": "uuid"
}
```

### GET /elderly/{elderlyId}/medications
**Headers:** `Authorization: Bearer {token}` (caregiver role managing specific elderly)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Aspirina",
      "dosage": "500mg",
      "time": "08:00",
      "active": true,
      "elderlyId": "uuid"
    }
  ]
}
```

### POST /elderly/{elderlyId}/medications
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Request:**
```json
{
  "name": "Novo Remédio",
  "dosage": "100mg",
  "time": "14:00",
  "active": true
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Novo Remédio",
  "dosage": "100mg",
  "time": "14:00",
  "active": true,
  "elderlyId": "uuid"
}
```

### DELETE /elderly/{elderlyId}/medications/{medId}
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (202):** No content

---

## Contacts

### GET /contacts
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "phone": "+5511999999999",
      "thresholdDays": 7,
      "lastCallAt": "2024-01-08T15:30:00Z",
      "daysOverdue": 7,
      "isOverdue": true
    },
    {
      "id": "uuid",
      "name": "Pedro Costa",
      "phone": "+5511888888888",
      "thresholdDays": 14,
      "lastCallAt": "2024-01-14T10:00:00Z",
      "daysOverdue": 1,
      "isOverdue": false
    }
  ]
}
```

### POST /contacts/{id}/called
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Request:** (empty body)

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Maria Silva",
  "phone": "+5511999999999",
  "thresholdDays": 7,
  "lastCallAt": "2024-01-15T14:30:00Z",
  "daysOverdue": 0,
  "isOverdue": false
}
```

### GET /elderly/{elderlyId}/contacts
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "phone": "+5511999999999",
      "thresholdDays": 7
    }
  ]
}
```

### POST /elderly/{elderlyId}/contacts
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Request:**
```json
{
  "name": "Novo Contato",
  "phone": "+5511777777777",
  "thresholdDays": 14
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Novo Contato",
  "phone": "+5511777777777",
  "thresholdDays": 14
}
```

### DELETE /elderly/{elderlyId}/contacts/{contactId}
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (202):** No content

---

## Agenda

### GET /agenda/today
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "description": "Consulta com Dr. Silva",
      "dateTime": "2024-01-15T14:30:00Z",
      "reminder": true
    },
    {
      "id": "uuid",
      "description": "Tomar remédio",
      "dateTime": "2024-01-15T19:00:00Z",
      "reminder": true
    }
  ]
}
```

### GET /elderly/{elderlyId}/agenda
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "description": "Consulta com Dr. Silva",
      "dateTime": "2024-01-15T14:30:00Z",
      "reminder": true
    }
  ]
}
```

### POST /elderly/{elderlyId}/agenda
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Request:**
```json
{
  "description": "Novo compromisso",
  "dateTime": "2024-01-20T10:00:00Z",
  "reminder": true
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "description": "Novo compromisso",
  "dateTime": "2024-01-20T10:00:00Z",
  "reminder": true
}
```

### DELETE /elderly/{elderlyId}/agenda/{eventId}
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (202):** No content

---

## Additional Features

### GET /weather
**Headers:** `Authorization: Bearer {token}` (elderly role)

**Response (200):**
```json
{
  "location": "São Paulo, SP",
  "temperature": 28,
  "condition": "Ensolarado",
  "humidity": 65,
  "windSpeed": 12
}
```

### GET /elderly/{elderlyId}/medication-history
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "medicationId": "uuid",
      "medicationName": "Aspirina",
      "confirmed": true,
      "timestamp": "2024-01-15T08:05:00Z"
    },
    {
      "id": "uuid",
      "medicationId": "uuid",
      "medicationName": "Omeprazol",
      "confirmed": false,
      "timestamp": "2024-01-15T13:00:00Z"
    }
  ]
}
```

### GET /caregiver/elderly
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "preferredName": "João da Silva",
      "autonomyScore": 75,
      "hasAlert": false,
      "lastInteraction": "2024-01-15T14:30:00Z",
      "todayMedicationStats": {
        "confirmed": 2,
        "total": 4
      }
    }
  ]
}
```

### POST /caregiver/link
**Headers:** `Authorization: Bearer {token}` (caregiver role)

**Request:**
```json
{
  "linkCode": "ABC123"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "preferredName": "João da Silva",
  "autonomyScore": 75,
  "lastInteraction": "2024-01-15T14:30:00Z"
}
```

### POST /notifications/register
**Headers:** `Authorization: Bearer {token}` (any role)

**Request:**
```json
{
  "pushToken": "ExponentPushToken[...",
  "platform": "ios" | "android" | "web"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "pushToken": "ExponentPushToken[...",
  "platform": "ios",
  "userId": "uuid"
}
```

---

## Error Response Format

All error responses follow this format:

**Response (4xx/5xx):**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequest"
}
```

### Common Status Codes
- `200` - OK
- `201` - Created
- `202` - Accepted (async operations)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes for Backend Implementation

1. **All endpoints require JWT authentication** (except `/auth/signup` and `/auth/login`)
2. **Field names** must match exactly as shown in examples
3. **Date formats** must be ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
4. **Phone numbers** should include country code (+55...)
5. **Response wrappers** use `items` array for lists, direct object for single items
6. **Pagination** not yet implemented (all items returned as-is)
7. **Rate limiting** recommended for production
8. **CORS** must be enabled for frontend domain
