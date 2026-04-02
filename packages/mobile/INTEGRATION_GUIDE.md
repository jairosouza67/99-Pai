# Frontend Integration Guide

## Overview

This mobile frontend (React Native + Expo) is now fully integrated with the NestJS backend API. All Firebase authentication and Firestore database calls have been replaced with REST API calls using JWT tokens.

## Architecture

```
Mobile App (Expo/React Native)
├── Auth Context (JWT token management)
├── API Client (Axios with token injection)
├── AsyncStorage (Session persistence)
└── 4 Role-Based Dashboards
    ├── Elderly (voice-enabled)
    ├── Caregiver (management)
    ├── Provider (marketplace - stub)
    └── Admin (system - stub)
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm i -g expo-cli`
- Backend API running on `http://localhost:3000/api` (configurable via env)

### Installation

```bash
cd mobile-app
npm install
# or
yarn install
```

### Environment Setup

Create `.env.local`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

Or override at runtime in `.env`:
```env
# Development
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
# Production  
# EXPO_PUBLIC_API_URL=https://api.99por1.com/api
```

### Running

**Expo Go (fastest for development):**
```bash
npm start
# Then press 'i' for iOS simulator or 'a' for Android emulator
```

**Web Preview:**
```bash
npm start -- --web
```

**Build for production:**
```bash
eas build --platform ios
eas build --platform android
```

## Authentication Flow

1. **Sign Up**: `POST /auth/signup` with name, email, password, role
2. **Login**: `POST /auth/login` with email, password
3. **Response**: Contains `access_token` and `user` object
4. **Persistence**: Token + user stored in AsyncStorage
5. **API Calls**: Token automatically injected as `Authorization: Bearer {token}`
6. **Session Restore**: On app start, validates token with `GET /auth/me`

### Testing Login

**Elderly User**:
- Email: elderly@test.com
- Password: 123456
- Role: elderly

**Caregiver User**:
- Email: caregiver@test.com
- Password: 123456
- Role: caregiver

**Provider User** (stub):
- Email: provider@test.com
- Password: 123456
- Role: provider

**Admin User** (stub):
- Email: admin@test.com
- Password: 123456
- Role: admin

## API Integration Points

### Elderly Dashboard
| Feature | Endpoint | Method |
|---------|----------|--------|
| Profile | `/elderly/profile` | GET |
| Weather | `/weather` | GET |
| Today's Meds | `/medications/today` | GET |
| Confirm Med | `/medications/{id}/confirm` | POST |
| Contacts | `/contacts` | GET |
| Mark Called | `/contacts/{id}/called` | POST |
| Agenda | `/agenda/today` | GET |
| Onboarding | `/elderly/profile` | PATCH |

### Caregiver Dashboard
| Feature | Endpoint | Method |
|---------|----------|--------|
| Linked Elderly | `/caregiver/elderly` | GET |
| Link Elderly | `/caregiver/link` | POST |
| Meds (specific) | `/elderly/{id}/medications` | GET/POST/DELETE |
| Contacts (specific) | `/elderly/{id}/contacts` | GET/POST/DELETE |
| Agenda (specific) | `/elderly/{id}/agenda` | GET/POST/DELETE |
| Med History | `/elderly/{id}/medication-history` | GET |

### Push Notifications
| Feature | Endpoint | Method |
|---------|----------|--------|
| Register Token | `/notifications/register` | POST |

## Key Files

### Authentication
- `src/contexts/AuthContext.tsx` - Auth state & login/logout logic
- `src/lib/authStorage.ts` - AsyncStorage wrapper for tokens
- `src/services/api.ts` - Axios client with auto-token injection

### Navigation
- `app/_layout.tsx` - Root layout with role-based routing
- `app/index.tsx` - Entry point with auth check
- `app/auth/` - Login/signup screens for each role
- `NAVIGATION_MAP.md` - Complete routing documentation

### Screens
- `app/elderly/` - Dashboard screens (home, meds, contacts, agenda, settings, onboarding)
- `app/caregiver/` - Management screens (dashboard, elderly detail)
- `app/provider/dashboard.tsx` - Provider dashboard (stub)
- `app/admin/dashboard.tsx` - Admin dashboard (stub)

## Common Tasks

### Add New API Endpoint

1. **In API client** (`src/services/api.ts`):
```typescript
// Method already exists: api.get(), api.post(), api.patch(), api.delete()
```

2. **In component**:
```typescript
import { api } from '../../src/services/api';

const fetchData = async () => {
  try {
    const response = await api.get('/new-endpoint');
    setData(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Update API Base URL

Edit `.env.local`:
```env
EXPO_PUBLIC_API_URL=https://new-api.com/api
```

Or modify in `src/services/api.ts`:
```typescript
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
```

### Test Authentication

1. Open app (Web or Emulator)
2. Click "Idoso" on role select
3. Click "Criar Conta"
4. Fill form and submit
5. Check AsyncStorage: `debug > AsyncStorage > view all data`
6. Verify `auth_token` and `auth_user` keys exist

### Debug Network Calls

**In Expo DevTools:**
```javascript
console.log(error.response?.data) // Backend error message
console.log(error.response?.status) // HTTP status code
```

**Network Interception** (optional - Flipper):
```bash
npm install --save-dev flipper react-native-flipper
# Then enable in development
```

## Testing Checklist

- [ ] Backend API is running and accessible
- [ ] Environment variable EXPO_PUBLIC_API_URL is set correctly
- [ ] Can sign up as elderly user
- [ ] Can login with created account
- [ ] Token persists across app restarts
- [ ] Can view elderly dashboard (home, meds, contacts, agenda)
- [ ] Can confirm medication from frontend
- [ ] Can call contact from contacts screen
- [ ] Onboarding questionnaire completes successfully
- [ ] Can logout and return to role select
- [ ] Can repeat flow for caregiver role
- [ ] Provider and admin dashboards load (stubs work)

## Troubleshooting

### API Connection Failed
- Check backend is running: `curl http://localhost:3000/api/health`
- Verify EXPO_PUBLIC_API_URL is correct
- Check device network: same WiFi as backend for localhost testing

### Token Expired
- Automatic: Session restore will fail, redirect to login
- Manual: Clear app cache → AsyncStorage cleared → login again

### Login Returns 401 Unauthorized
- Verify user credentials are correct
- Check backend is validating passwords
- Review backend auth errors in console

### Screens Stuck Loading
- Check network tab for failed requests
- Verify all required endpoints exist on backend
- Check error logs in console (Xcode/Android Studio)

## Future Enhancements

- [ ] Implement meaningful provider dashboard (offerings list, CRUD)
- [ ] Implement admin dashboard (user management, categories)
- [ ] Add offline support with local cache
- [ ] Implement real-time notifications (Firebase Cloud Messaging)
- [ ] Add more sophisticated error handling and retry logic
- [ ] Implement permission scoping (caregiver can't access other caregiver's elderly)
- [ ] Add biometric authentication (face/fingerprint)

## Support

For issues with:
- **Frontend**: Check `app/` structure and React Native debugging
- **Backend**: Check `src/` structure and NestJS documentation
- **API Integration**: Review `src/services/api.ts` and endpoint definitions

Refer to NAVIGATION_MAP.md for complete routing structure.
