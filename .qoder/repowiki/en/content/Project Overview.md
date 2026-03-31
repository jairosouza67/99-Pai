# Project Overview

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [src/main.ts](file://src/main.ts)
- [src/app.module.ts](file://src/app.module.ts)
- [src/auth/auth.module.ts](file://src/auth/auth.module.ts)
- [src/auth/auth.service.ts](file://src/auth/auth.service.ts)
- [src/auth/jwt-auth.guard.ts](file://src/auth/jwt-auth.guard.ts)
- [src/auth/roles.guard.ts](file://src/auth/roles.guard.ts)
- [src/prisma/prisma.module.ts](file://src/prisma/prisma.module.ts)
- [src/prisma/prisma.service.ts](file://src/prisma/prisma.service.ts)
- [prisma/schema.prisma](file://prisma/schema.prisma)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
99-Pai is a unified elderly care management and service marketplace platform designed to connect elderly users with caregivers and service providers through a centralized API. The platform supports multiple user roles—elderly users, caregivers, service providers, and administrators—enabling secure onboarding, care coordination, medication tracking, appointment scheduling, service offerings, and request management. Built with modern technologies, it emphasizes scalability, maintainability, and developer productivity.

Key capabilities include:
- Role-based authentication and authorization
- Centralized user and profile management
- Care-related workflows such as medication tracking and interaction logging
- Service marketplace with categories, offerings, and requests
- Notification support via push tokens
- Swagger-powered API documentation

## Project Structure
The backend follows a NestJS modular architecture with domain-focused feature modules. The application bootstraps a global prefix, enables CORS, applies validation globally, and exposes Swagger documentation. The central AppModule aggregates all feature modules, ensuring a clean separation of concerns.

```mermaid
graph TB
Main["src/main.ts<br/>Bootstrap and configuration"] --> AppModule["src/app.module.ts<br/>Root module"]
AppModule --> AuthModule["src/auth/auth.module.ts<br/>Authentication"]
AppModule --> ElderlyModule["src/elderly/elderly.module.ts<br/>Elderly profiles"]
AppModule --> CaregiverModule["src/caregiver/caregiver.module.ts<br/>Caregiver links"]
AppModule --> MedicationsModule["src/medications/medications.module.ts<br/>Medications"]
AppModule --> ContactsModule["src/contacts/contacts.module.ts<br/>Emergency contacts"]
AppModule --> AgendaModule["src/agenda/agenda.module.ts<br/>Agenda events"]
AppModule --> NotificationsModule["src/notifications/notifications.module.ts<br/>Push tokens"]
AppModule --> InteractionsModule["src/interactions/interactions.module.ts<br/>Interaction logs"]
AppModule --> WeatherModule["src/weather/weather.module.ts<br/>Weather info"]
AppModule --> CategoriesModule["src/categories/categories.module.ts<br/>Offering categories"]
AppModule --> OfferingsModule["src/offerings/offerings.module.ts<br/>Service offerings"]
AppModule --> ServiceRequestsModule["src/service-requests/service-requests.module.ts<br/>Service requests"]
AppModule --> PrismaModule["src/prisma/prisma.module.ts<br/>Prisma service"]
```

**Diagram sources**
- [src/main.ts:1-43](file://src/main.ts#L1-L43)
- [src/app.module.ts:1-36](file://src/app.module.ts#L1-L36)
- [src/auth/auth.module.ts:1-28](file://src/auth/auth.module.ts#L1-L28)
- [src/prisma/prisma.module.ts:1-10](file://src/prisma/prisma.module.ts#L1-L10)

**Section sources**
- [src/main.ts:1-43](file://src/main.ts#L1-L43)
- [src/app.module.ts:1-36](file://src/app.module.ts#L1-L36)

## Core Components
- Technology Stack
  - Backend framework: NestJS
  - Language: TypeScript
  - Persistence: Prisma ORM with PostgreSQL
  - Authentication: JWT via Passport
  - Validation: Global ValidationPipe
  - API documentation: Swagger
- Modular Design
  - Feature modules encapsulate domain logic (e.g., elderly, caregiver, medications, offerings, service requests)
  - Shared Prisma service provides database connectivity across modules
- Authentication and Authorization
  - JWT-based authentication with Passport
  - Role-based guard restricts access to protected routes
  - User roles include elderly, caregiver, provider, and admin

**Section sources**
- [package.json:22-39](file://package.json#L22-L39)
- [prisma/schema.prisma:1-286](file://prisma/schema.prisma#L1-L286)
- [src/auth/auth.module.ts:1-28](file://src/auth/auth.module.ts#L1-L28)
- [src/auth/auth.service.ts:1-173](file://src/auth/auth.service.ts#L1-L173)
- [src/auth/jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [src/auth/roles.guard.ts:1-22](file://src/auth/roles.guard.ts#L1-L22)
- [src/prisma/prisma.module.ts:1-10](file://src/prisma/prisma.module.ts#L1-L10)
- [src/prisma/prisma.service.ts:1-17](file://src/prisma/prisma.service.ts#L1-L17)

## Architecture Overview
The system architecture centers around a modular NestJS application with a shared Prisma service for data access. Authentication is enforced via JWT guards, and Swagger provides interactive API documentation. The data model integrates two legacy domains (99por1 and PAI) into a unified schema with enums for roles, platforms, interaction types, and service request statuses.

```mermaid
graph TB
subgraph "API Layer"
Controllers["Feature Controllers<br/>(e.g., auth, elderly, offerings)"]
end
subgraph "Domain Services"
AuthSvc["AuthService"]
ElderlySvc["ElderlyService"]
OfferingsSvc["OfferingsService"]
RequestsSvc["ServiceRequestsService"]
end
subgraph "Infrastructure"
PrismaSvc["PrismaService"]
DB["PostgreSQL"]
SwaggerUI["Swagger UI"]
end
Controllers --> AuthSvc
Controllers --> ElderlySvc
Controllers --> OfferingsSvc
Controllers --> RequestsSvc
AuthSvc --> PrismaSvc
ElderlySvc --> PrismaSvc
OfferingsSvc --> PrismaSvc
RequestsSvc --> PrismaSvc
PrismaSvc --> DB
Main["src/main.ts"] --> SwaggerUI
```

**Diagram sources**
- [src/main.ts:1-43](file://src/main.ts#L1-L43)
- [src/auth/auth.service.ts:1-173](file://src/auth/auth.service.ts#L1-L173)
- [src/prisma/prisma.service.ts:1-17](file://src/prisma/prisma.service.ts#L1-L17)
- [prisma/schema.prisma:1-286](file://prisma/schema.prisma#L1-L286)

## Detailed Component Analysis

### Authentication and Authorization
The authentication system uses JWT with Passport. The AuthModule configures JWT signing with a secret from environment variables and registers strategies. The AuthService handles user registration, login, and retrieval of authenticated user details. Guards enforce JWT validation and role-based access control.

```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthCtrl as "AuthController"
participant AuthSvc as "AuthService"
participant Prisma as "PrismaService"
participant JWT as "JwtService"
Client->>AuthCtrl : POST /auth/signup or /auth/login
AuthCtrl->>AuthSvc : delegate signup/login
AuthSvc->>Prisma : find/create user and profile
Prisma-->>AuthSvc : user record
AuthSvc->>JWT : sign token with {userId, email, role}
JWT-->>AuthSvc : signed JWT
AuthSvc-->>AuthCtrl : {token, user}
AuthCtrl-->>Client : response
```

**Diagram sources**
- [src/auth/auth.module.ts:1-28](file://src/auth/auth.module.ts#L1-L28)
- [src/auth/auth.service.ts:1-173](file://src/auth/auth.service.ts#L1-L173)
- [src/auth/jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [src/auth/roles.guard.ts:1-22](file://src/auth/roles.guard.ts#L1-L22)

**Section sources**
- [src/auth/auth.module.ts:1-28](file://src/auth/auth.module.ts#L1-L28)
- [src/auth/auth.service.ts:1-173](file://src/auth/auth.service.ts#L1-L173)
- [src/auth/jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [src/auth/roles.guard.ts:1-22](file://src/auth/roles.guard.ts#L1-L22)

### Data Model and Relationships
The Prisma schema defines core entities and relationships:
- User with role enumeration
- Elderly profile linked to user with onboarding and link code
- Caregiver links between users and elderly profiles
- Medications and history for care coordination
- Contacts and call history
- Agenda events
- Push tokens for notifications
- Categories and offerings for the marketplace
- Service requests linking elderly profiles to offerings

```mermaid
erDiagram
USER {
string id PK
string email UK
string password
string name
enum role
string cellphone UK
string nickname
string document
datetime birthday
datetime created_at
datetime updated_at
}
ELDERLYPROFILE {
string id PK
string user_id UK
string preferred_name
int autonomy_score
string[] interaction_times
string location
boolean onboarding_complete
string link_code UK
datetime last_interaction_at
datetime created_at
datetime updated_at
}
CAREGIVERLINK {
string id PK
string caregiver_user_id
string elderly_profile_id
datetime created_at
}
MEDICATION {
string id PK
string elderly_profile_id
string name
string time
string dosage
boolean active
datetime created_at
datetime updated_at
}
MEDICATIONHISTORY {
string id PK
string elderly_profile_id
string medication_id
boolean confirmed
datetime scheduled_date
datetime responded_at
int retry_count
boolean caregiver_notified
datetime created_at
}
CONTACT {
string id PK
string elderly_profile_id
string name
string phone
int threshold_days
datetime last_call_at
datetime created_at
datetime updated_at
}
AGENDAEVENT {
string id PK
string elderly_profile_id
string description
datetime date_time
boolean reminder
datetime created_at
datetime updated_at
}
PUSH_TOKEN {
string id PK
string user_id
string token
enum platform
datetime created_at
datetime updated_at
}
CATEGORY {
string id PK
string name
string parent_id
datetime created_at
datetime updated_at
}
OFFERING {
string id PK
string title
string description
string image_url
decimal price
boolean active
string user_id
string category_id
string subcategory_id
datetime created_at
datetime updated_at
}
OFFERINGCONTACT {
string id PK
string offering_id
string requester_id
datetime created_at
}
SERVICE_REQUEST {
string id PK
string elderly_profile_id
string offering_id
datetime requested_date_time
enum status
string notes
datetime created_at
datetime updated_at
}
USER ||--o| ELDERLYPROFILE : "has profile"
USER ||--o{ CAREGIVERLINK : "links to"
ELDERLYPROFILE ||--o{ CAREGIVERLINK : "linked by"
ELDERLYPROFILE ||--o{ MEDICATION : "has"
ELDERLYPROFILE ||--o{ MEDICATIONHISTORY : "generates"
MEDICATION ||--o{ MEDICATIONHISTORY : "tracked in"
ELDERLYPROFILE ||--o{ CONTACT : "has"
ELDERLYPROFILE ||--o{ AGENDAEVENT : "has"
USER ||--o{ PUSH_TOKEN : "owns"
CATEGORY ||--o{ OFFERING : "contains"
OFFERING ||--o{ OFFERINGCONTACT : "requested by"
ELDERLYPROFILE ||--o{ SERVICE_REQUEST : "requests"
```

**Diagram sources**
- [prisma/schema.prisma:1-286](file://prisma/schema.prisma#L1-L286)

**Section sources**
- [prisma/schema.prisma:1-286](file://prisma/schema.prisma#L1-L286)

### Data Access Layer
The PrismaModule provides a globally available PrismaService that connects to PostgreSQL. Modules import PrismaModule to gain access to the service, enabling consistent data operations across the application.

```mermaid
classDiagram
class PrismaService {
+onModuleInit()
+onModuleDestroy()
}
class PrismaModule {
+providers : PrismaService
+exports : PrismaService
}
PrismaModule --> PrismaService : "provides"
```

**Diagram sources**
- [src/prisma/prisma.module.ts:1-10](file://src/prisma/prisma.module.ts#L1-L10)
- [src/prisma/prisma.service.ts:1-17](file://src/prisma/prisma.service.ts#L1-L17)

**Section sources**
- [src/prisma/prisma.module.ts:1-10](file://src/prisma/prisma.module.ts#L1-L10)
- [src/prisma/prisma.service.ts:1-17](file://src/prisma/prisma.service.ts#L1-L17)

### API Bootstrapping and Documentation
The application sets a global API prefix, enables CORS, applies a global validation pipe, and mounts Swagger documentation. Environment variables configure ports and database connections.

```mermaid
flowchart TD
Start(["Bootstrap"]) --> SetPrefix["Set global prefix 'api'"]
SetPrefix --> EnableCORS["Enable CORS with credentials"]
EnableCORS --> GlobalValidation["Register ValidationPipe<br/>transform, whitelist, forbidNonWhitelisted"]
GlobalValidation --> Swagger["Build Swagger document<br/>title, description, version, bearer auth"]
Swagger --> SetupDocs["Expose '/docs'"]
SetupDocs --> Listen["Listen on configured port"]
Listen --> End(["Ready"])
```

**Diagram sources**
- [src/main.ts:1-43](file://src/main.ts#L1-L43)

**Section sources**
- [src/main.ts:1-43](file://src/main.ts#L1-L43)

## Dependency Analysis
The application’s runtime dependencies include NestJS core modules, Prisma client, JWT and Passport for authentication, validation libraries, and Swagger for API docs. Development dependencies include Jest for testing, Prettier for formatting, and Prisma CLI for schema management and seeding.

```mermaid
graph TB
NestCore["@nestjs/core"]
NestCommon["@nestjs/common"]
NestJWT["@nestjs/jwt"]
NestPassport["@nestjs/passport"]
NestSwagger["@nestjs/swagger"]
PrismaClient["@prisma/client"]
Bcrypt["bcryptjs"]
ClassValidator["class-validator"]
ClassTransformer["class-transformer"]
AppModule --> NestCore
AppModule --> NestCommon
AppModule --> NestJWT
AppModule --> NestPassport
AppModule --> NestSwagger
AppModule --> PrismaClient
AppModule --> Bcrypt
AppModule --> ClassValidator
AppModule --> ClassTransformer
```

**Diagram sources**
- [package.json:22-39](file://package.json#L22-L39)

**Section sources**
- [package.json:22-39](file://package.json#L22-L39)

## Performance Considerations
- Use pagination for listing endpoints to avoid large payloads.
- Index frequently queried fields in the database (e.g., user email, elderly profile ID, offering category).
- Cache infrequent or static data (e.g., categories) at the application level.
- Monitor JWT token expiration and refresh strategies to reduce re-authentication overhead.
- Keep DTOs minimal and leverage class-validator to prevent unnecessary data transfer.

## Troubleshooting Guide
- Authentication failures
  - Ensure JWT secret is configured and environment variables are loaded.
  - Verify user credentials and hashed passwords stored in the database.
- Validation errors
  - Review global ValidationPipe configuration and DTO constraints.
- Database connectivity
  - Confirm DATABASE_URL is set and PrismaService connects during module initialization.
- API documentation
  - Access Swagger at the configured docs endpoint after startup.

**Section sources**
- [src/auth/auth.service.ts:102-135](file://src/auth/auth.service.ts#L102-L135)
- [src/main.ts:18-25](file://src/main.ts#L18-L25)
- [src/prisma/prisma.service.ts:9-15](file://src/prisma/prisma.service.ts#L9-L15)

## Conclusion
99-Pai delivers a robust, modular backend tailored for elderly care management and service marketplaces. Its NestJS foundation, TypeScript rigor, Prisma ORM, and PostgreSQL persistence provide a scalable and maintainable architecture. With JWT-based authentication, role-aware access control, and a well-defined data model, the platform supports diverse user workflows—from independent elderly users to caregivers and service providers—through a single, unified API.