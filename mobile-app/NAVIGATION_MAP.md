# Frontend Navigation & Routing Map

## Root Navigation (`app/_layout.tsx`)

```
/
├── /auth/
│   ├── /role-select         → Choose role (4 options: idoso, cuidador, prestador, admin)
│   ├── /elderly/
│   │   ├── /login           → Email/password login
│   │   └── /signup          → Register new elderly account
│   ├── /caregiver/
│   │   ├── /login           → Email/password login
│   │   └── /signup          → Register new caregiver
│   ├── /provider/
│   │   ├── /login           → Email/password login
│   │   └── /signup          → Register new provider
│   └── /admin/
│       ├── /login           → Email/password login
│       └── /signup          → Register new admin
│
├── /elderly/                 (Protected: role === 'elderly')
│   ├── /home                → Dashboard with greeting, weather, quick actions
│   ├── /medications         → Today's medications + voice feedback + confirm
│   ├── /contacts            → List contacts, mark called, voice suggestions
│   ├── /agenda              → Today's schedule, voice read-aloud
│   ├── /settings            → Profile, link code, logout
│   └── /onboarding          → Guided voice questionnaire (autonomy scoring)
│
├── /caregiver/              (Protected: role === 'caregiver')
│   ├── /dashboard           → List linked elderly, link new one via code
│   └── /elderly/[id]/
│       └── /                → Manage specific elderly
│           ├── Tab: Medications (CRUD)
│           ├── Tab: Contacts (CRUD)
│           ├── Tab: Agenda (CRUD)
│           └── Tab: History (view medication confirmation log)
│
├── /provider/               (Protected: role === 'provider')
│   └── /dashboard           → Dashboard (stub - future: marketplace features)
│
└── /admin/                  (Protected: role === 'admin')
    └── /dashboard           → Dashboard (stub - future: system management)
```

## Auth Flow

1. User opens app → `app/index.tsx` checks if logged in
2. If NOT logged in → `/auth/role-select`
3. User picks role → Routes to `/auth/{role}/login`
4. After successful login:
   - Token stored in AsyncStorage
   - User object stored in AsyncStorage
   - Redirect by role:
     - elderly → `/elderly/home`
     - caregiver → `/caregiver/dashboard`
     - provider → `/provider/dashboard`
     - admin → `/admin/dashboard`

## Protected Navigation

Auth context in `app/_layout.tsx` monitors `user` state:
- If `user` is null → Force to `/auth/role-select`
- If `user.role` doesn't match current section → Redirect to appropriate dashboard

## API Headers

All requests include:
```
Authorization: Bearer {jwt_token_from_storage}
```

Token is automatically injected by `api.ts` client after login.

## Role-Based Features

| Feature | Elderly | Caregiver | Provider | Admin |
|---------|---------|-----------|----------|-------|
| Login/Signup | ✅ | ✅ | ✅ (stub) | ✅ (stub) |
| Dashboard | ✅ home | ✅ manage elderly | ✅ (empty) | ✅ (empty) |
| Voice Commands | ✅ | ❌ | ❌ | ❌ |
| Manage Self | ✅ | ❌ | ❌ | ❌ |
| Manage Others | ❌ | ✅ (link elderly) | ❌ | ❌ |
| System Admin | ❌ | ❌ | ❌ | ✅ (future) |

## Data Flow by Role

### Elderly
1. Login → `/elderly/home`
2. Home page loads:
   - `/elderly/profile` → Display greeting with preferred name
   - `/weather` → Show weather + voice notification
3. View medications → `/medications/today` (auto-loaded on entry)
4. Confirm med taken → `POST /medications/{id}/confirm`
5. View contacts → `GET /contacts` (shows daysOverdue)
6. Mark contact called → `POST /contacts/{id}/called`
7. View agenda → `GET /agenda/today` (voice read-aloud all events)
8. View settings → Display profile info from cache + logout button

### Caregiver  
1. Login → `/caregiver/dashboard`
2. Dashboard loads:
   - `GET /caregiver/elderly` → List all linked elderly
3. Click elderly → `/caregiver/elderly/{id}` with tabs
4. Each tab loads:
   - Medications: `GET /elderly/{id}/medications`
   - Contacts: `GET /elderly/{id}/contacts`
   - Agenda: `GET /elderly/{id}/agenda`
   - History: `GET /elderly/{id}/medication-history`
5. CRUD operations:
   - Create: `POST /elderly/{id}/{resource}`
   - Delete: `DELETE /elderly/{id}/{resource}/{itemId}`

### Provider & Admin
- Stubs created, routes functional
- Full feature implementation pending

## Session Persistence

1. User logs in → Token + user object stored in AsyncStorage
2. App closed and reopened:
   - `bootstrapSession()` runs on mount
   - Loads token from storage
   - Calls `GET /auth/me` to validate token
   - If valid → Restore user state
   - If invalid → Clear storage, redirect to `/auth/role-select`
3. User logout → Calls `authStorage.clear()`, nullifies user

## Notes
- All nav errors handled by `/index.tsx` universal redirect
- Logout available via header icon or settings screen
- Role selector accessible after any logout
- Voice features only available to elderly role
