# Authentication & Authorization System

<cite>
**Referenced Files in This Document**
- [auth.controller.ts](file://src/auth/auth.controller.ts)
- [auth.service.ts](file://src/auth/auth.service.ts)
- [auth.module.ts](file://src/auth/auth.module.ts)
- [jwt.strategy.ts](file://src/auth/jwt.strategy.ts)
- [jwt-auth.guard.ts](file://src/auth/jwt-auth.guard.ts)
- [roles.guard.ts](file://src/auth/roles.guard.ts)
- [roles.decorator.ts](file://src/auth/roles.decorator.ts)
- [user.decorator.ts](file://src/common/decorators/user.decorator.ts)
- [login.dto.ts](file://src/auth/dto/login.dto.ts)
- [signup.dto.ts](file://src/auth/dto/signup.dto.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [app.module.ts](file://src/app.module.ts)
- [package.json](file://package.json)
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
10. [Appendices](#appendices)

## Introduction
This document explains the authentication and authorization system for the 99-Pai platform. It covers JWT-based authentication, token generation and validation, role-based access control (RBAC), Passport.js integration, guard patterns, DTO validation, password hashing with bcrypt, and security best practices. Practical examples demonstrate protected routes, role decorators, and permission checks grounded in the actual implementation.

## Project Structure
The authentication subsystem resides under the auth module and integrates with Prisma for persistence and Swagger for API documentation. The application module wires the AuthModule and other domain modules.

```mermaid
graph TB
subgraph "Application Layer"
APP["AppModule<br/>imports: ConfigModule, PrismaModule, AuthModule, ..."]
end
subgraph "Auth Module"
AM["AuthModule"]
AC["AuthController"]
AS["AuthService"]
JSG["JwtAuthGuard"]
JST["JwtStrategy"]
RG["RolesGuard"]
RD["Roles decorator"]
UD["User decorator"]
end
subgraph "Persistence"
PRISMA["PrismaService"]
SCHEMA["Prisma Schema<br/>Role enum, user model, elderlyProfile"]
end
subgraph "Security"
JWT["@nestjs/jwt<br/>JWT Module"]
PASS["@nestjs/passport<br/>PassportModule"]
BC["bcryptjs"]
end
APP --> AM
AM --> AC
AM --> AS
AM --> JSG
AM --> JST
AM --> RG
AC --> AS
AS --> PRISMA
PRISMA --> SCHEMA
AM --> JWT
AM --> PASS
AS --> BC
```

**Diagram sources**
- [app.module.ts:17-35](file://src/app.module.ts#L17-L35)
- [auth.module.ts:10-27](file://src/auth/auth.module.ts#L10-L27)
- [auth.controller.ts:14-44](file://src/auth/auth.controller.ts#L14-L44)
- [auth.service.ts:14-173](file://src/auth/auth.service.ts#L14-L173)
- [jwt.strategy.ts:6-24](file://src/auth/jwt.strategy.ts#L6-L24)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [roles.guard.ts:6-22](file://src/auth/roles.guard.ts#L6-L22)
- [roles.decorator.ts:1-6](file://src/auth/roles.decorator.ts#L1-L6)
- [user.decorator.ts:1-9](file://src/common/decorators/user.decorator.ts#L1-L9)
- [schema.prisma:17-65](file://prisma/schema.prisma#L17-L65)
- [package.json:22-39](file://package.json#L22-L39)

**Section sources**
- [app.module.ts:17-35](file://src/app.module.ts#L17-L35)
- [auth.module.ts:10-27](file://src/auth/auth.module.ts#L10-L27)
- [schema.prisma:17-65](file://prisma/schema.prisma#L17-L65)
- [package.json:22-39](file://package.json#L22-L39)

## Core Components
- AuthController: Exposes endpoints for user registration, login, and retrieving current user information. Uses guards and decorators for protection and user extraction.
- AuthService: Implements signup, login, and profile retrieval. Handles DTO validation, password hashing, and JWT signing.
- JwtStrategy: Passport strategy that validates JWT tokens and extracts user identity.
- JwtAuthGuard: Guard that enforces JWT authentication via the "jwt" strategy.
- RolesGuard and Roles decorator: Enforce role-based access control by checking required roles against the authenticated user.
- User decorator: Extracts the authenticated user from the request context.
- DTOs: Validate request payloads for login and signup operations.
- Prisma schema: Defines the Role enum and user model used by the auth system.

**Section sources**
- [auth.controller.ts:14-44](file://src/auth/auth.controller.ts#L14-L44)
- [auth.service.ts:14-173](file://src/auth/auth.service.ts#L14-L173)
- [jwt.strategy.ts:6-24](file://src/auth/jwt.strategy.ts#L6-L24)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [roles.guard.ts:6-22](file://src/auth/roles.guard.ts#L6-L22)
- [roles.decorator.ts:1-6](file://src/auth/roles.decorator.ts#L1-L6)
- [user.decorator.ts:1-9](file://src/common/decorators/user.decorator.ts#L1-L9)
- [login.dto.ts:1-13](file://src/auth/dto/login.dto.ts#L1-L13)
- [signup.dto.ts:1-53](file://src/auth/dto/signup.dto.ts#L1-L53)
- [schema.prisma:17-65](file://prisma/schema.prisma#L17-L65)

## Architecture Overview
The authentication flow combines Passport.js with NestJS guards and the @nestjs/jwt module. The system uses bearer tokens and enforces RBAC via a dedicated guard and decorator.

```mermaid
sequenceDiagram
participant C as "Client"
participant CTRL as "AuthController"
participant SVC as "AuthService"
participant PRISMA as "PrismaService"
participant JWT as "JwtService"
rect rgb(255,255,255)
Note over C,CTRL : "Signup Flow"
C->>CTRL : "POST /signup"
CTRL->>SVC : "signup(dto)"
SVC->>PRISMA : "findUnique(email)"
PRISMA-->>SVC : "Existing user?"
SVC->>PRISMA : "bcrypt.hash(password)"
SVC->>PRISMA : "create(user)"
SVC->>PRISMA : "create elderlyProfile (if role=elderly)"
SVC->>JWT : "sign({userId,email,role})"
JWT-->>SVC : "token"
SVC-->>CTRL : "{token,user}"
CTRL-->>C : "201 Created"
end
rect rgb(255,255,255)
Note over C,CTRL : "Login Flow"
C->>CTRL : "POST /auth/login"
CTRL->>SVC : "login(dto)"
SVC->>PRISMA : "findUnique(email)"
PRISMA-->>SVC : "User"
SVC->>PRISMA : "bcrypt.compare(password)"
SVC->>JWT : "sign({userId,email,role})"
JWT-->>SVC : "token"
SVC-->>CTRL : "{token,user}"
CTRL-->>C : "200 OK"
end
```

**Diagram sources**
- [auth.controller.ts:19-33](file://src/auth/auth.controller.ts#L19-L33)
- [auth.service.ts:23-100](file://src/auth/auth.service.ts#L23-L100)
- [auth.service.ts:102-135](file://src/auth/auth.service.ts#L102-L135)

**Section sources**
- [auth.controller.ts:19-33](file://src/auth/auth.controller.ts#L19-L33)
- [auth.service.ts:23-100](file://src/auth/auth.service.ts#L23-L100)
- [auth.service.ts:102-135](file://src/auth/auth.service.ts#L102-L135)

## Detailed Component Analysis

### JWT Strategy and Guard
- JwtStrategy initializes passport-jwt with a secret from configuration and extracts the JWT from the Authorization header. It validates the token and returns a user object for downstream use.
- JwtAuthGuard leverages the "jwt" strategy to enforce authentication at route level.

```mermaid
classDiagram
class JwtStrategy {
+constructor(configService)
+validate(payload) object
}
class JwtAuthGuard {
+canActivate(context) boolean
}
JwtAuthGuard --> JwtStrategy : "uses 'jwt' strategy"
```

**Diagram sources**
- [jwt.strategy.ts:6-24](file://src/auth/jwt.strategy.ts#L6-L24)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)

**Section sources**
- [jwt.strategy.ts:6-24](file://src/auth/jwt.strategy.ts#L6-L24)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)

### Role-Based Access Control (RBAC)
- Roles decorator sets metadata indicating required roles for a handler or controller.
- RolesGuard reads the required roles from metadata and compares against the authenticated user’s role.

```mermaid
flowchart TD
Start(["Route invoked"]) --> GetMeta["Read required roles from metadata"]
GetMeta --> HasMeta{"Any required roles?"}
HasMeta --> |No| Allow["Allow access"]
HasMeta --> |Yes| GetUser["Extract user from request"]
GetUser --> CheckRole{"Does user role match any required?"}
CheckRole --> |Yes| Allow
CheckRole --> |No| Deny["Deny access (Forbidden)"]
Allow --> End(["Proceed"])
Deny --> End
```

**Diagram sources**
- [roles.guard.ts:10-21](file://src/auth/roles.guard.ts#L10-L21)
- [roles.decorator.ts:4-5](file://src/auth/roles.decorator.ts#L4-L5)

**Section sources**
- [roles.guard.ts:6-22](file://src/auth/roles.guard.ts#L6-L22)
- [roles.decorator.ts:1-6](file://src/auth/roles.decorator.ts#L1-L6)

### Protected Routes and Decorators
- AuthController exposes three endpoints:
  - POST /signup: Creates a new user, performs duplicate checks, hashes the password, optionally creates an elderly profile, and signs a JWT.
  - POST /auth/login: Authenticates an existing user by verifying credentials and returns a JWT.
  - GET /auth/me: Protected by JwtAuthGuard and returns the current user’s information.
- The User decorator extracts the authenticated user from the request for use in handlers.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "AuthController"
participant Guard as "JwtAuthGuard"
participant Svc as "AuthService"
participant Prisma as "PrismaService"
Client->>Ctrl : "GET /auth/me"
Ctrl->>Guard : "Enforce JWT"
Guard-->>Ctrl : "Authenticated user injected"
Ctrl->>Svc : "getMe(userId)"
Svc->>Prisma : "findUnique(id)"
Prisma-->>Svc : "User with elderlyProfile"
Svc-->>Ctrl : "User info"
Ctrl-->>Client : "200 OK"
```

**Diagram sources**
- [auth.controller.ts:35-42](file://src/auth/auth.controller.ts#L35-L42)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [auth.service.ts:137-162](file://src/auth/auth.service.ts#L137-L162)
- [user.decorator.ts:3-8](file://src/common/decorators/user.decorator.ts#L3-L8)

**Section sources**
- [auth.controller.ts:35-42](file://src/auth/auth.controller.ts#L35-L42)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [auth.service.ts:137-162](file://src/auth/auth.service.ts#L137-L162)
- [user.decorator.ts:1-9](file://src/common/decorators/user.decorator.ts#L1-L9)

### DTO Validation and Password Hashing
- LoginDto and SignupDto define validation rules enforced by class-validator and swagger metadata.
- AuthService hashes passwords using bcrypt and compares during login. It throws appropriate exceptions for invalid credentials or conflicts.

```mermaid
flowchart TD
A["Signup Request"] --> V1["Validate DTO (class-validator)"]
V1 --> DUPE{"Duplicate email/phone?"}
DUPE --> |Yes| CONFLICT["Throw ConflictException"]
DUPE --> |No| HASH["Hash password with bcrypt"]
HASH --> CREATE["Create user in database"]
CREATE --> ELD{"Role == elderly?"}
ELD --> |Yes| EProf["Create elderlyProfile"]
ELD --> |No| SKIP["Skip elderlyProfile"]
EProf --> SIGN["Sign JWT"]
SKIP --> SIGN
SIGN --> RESP["Return token + user"]
B["Login Request"] --> V2["Validate DTO"]
V2 --> FIND["Find user by email"]
FIND --> FOUND{"User exists?"}
FOUND --> |No| UNAUTH["Throw UnauthorizedException"]
FOUND --> |Yes| COMPARE["Compare password with bcrypt"]
COMPARE --> VALID{"Password valid?"}
VALID --> |No| UNAUTH
VALID --> |Yes| SIGN2["Sign JWT"]
SIGN2 --> RESP2["Return token + user"]
```

**Diagram sources**
- [signup.dto.ts:12-52](file://src/auth/dto/signup.dto.ts#L12-L52)
- [login.dto.ts:4-12](file://src/auth/dto/login.dto.ts#L4-L12)
- [auth.service.ts:23-100](file://src/auth/auth.service.ts#L23-L100)
- [auth.service.ts:102-135](file://src/auth/auth.service.ts#L102-L135)

**Section sources**
- [signup.dto.ts:12-52](file://src/auth/dto/signup.dto.ts#L12-L52)
- [login.dto.ts:4-12](file://src/auth/dto/login.dto.ts#L4-L12)
- [auth.service.ts:23-100](file://src/auth/auth.service.ts#L23-L100)
- [auth.service.ts:102-135](file://src/auth/auth.service.ts#L102-L135)

### Token Generation and Validation
- JwtModule registers the JWT secret and expiration options via ConfigService.
- JwtStrategy defines how tokens are extracted and validated.
- AuthService signs tokens containing userId, email, and role.

```mermaid
sequenceDiagram
participant CFG as "ConfigService"
participant JWTMod as "JwtModule"
participant Strat as "JwtStrategy"
participant Svc as "AuthService"
CFG-->>JWTMod : "Provide JWT_SECRET"
CFG-->>Strat : "Provide JWT_SECRET"
Svc->>Strat : "Validate token (from request)"
Strat-->>Svc : "Decoded payload {userId,email,role}"
```

**Diagram sources**
- [auth.module.ts:14-21](file://src/auth/auth.module.ts#L14-L21)
- [jwt.strategy.ts:8-19](file://src/auth/jwt.strategy.ts#L8-L19)
- [auth.service.ts:83-87](file://src/auth/auth.service.ts#L83-L87)

**Section sources**
- [auth.module.ts:14-21](file://src/auth/auth.module.ts#L14-L21)
- [jwt.strategy.ts:8-19](file://src/auth/jwt.strategy.ts#L8-L19)
- [auth.service.ts:83-87](file://src/auth/auth.service.ts#L83-L87)

### Multi-Role System and Data Model
- Role enum includes elderly, caregiver, provider, and admin.
- The user model stores role and other attributes. Elderly users have an associated elderlyProfile with a unique link code and onboarding flag.

```mermaid
erDiagram
USER {
string id PK
string email UK
string password
string name
enum role
string cellphone
string nickname
string document
datetime birthday
}
ELDERLYPROFILE {
string id PK
string user_id UK
string link_code UK
boolean onboarding_complete
}
USER ||--o{ ELDERLYPROFILE : "has optional profile"
```

**Diagram sources**
- [schema.prisma:17-22](file://prisma/schema.prisma#L17-L22)
- [schema.prisma:47-65](file://prisma/schema.prisma#L47-L65)
- [schema.prisma:71-96](file://prisma/schema.prisma#L71-L96)

**Section sources**
- [schema.prisma:17-22](file://prisma/schema.prisma#L17-L22)
- [schema.prisma:47-65](file://prisma/schema.prisma#L47-L65)
- [schema.prisma:71-96](file://prisma/schema.prisma#L71-L96)

## Dependency Analysis
- AuthModule depends on PrismaModule, PassportModule, JwtModule, and exports AuthService for use across the application.
- AuthController depends on AuthService and guards.
- AuthService depends on PrismaService, JwtService, and bcrypt for password operations.
- Guards and decorators rely on NestJS reflection and request context.

```mermaid
graph LR
AM["AuthModule"] --> AC["AuthController"]
AM --> AS["AuthService"]
AM --> JSG["JwtAuthGuard"]
AM --> JST["JwtStrategy"]
AM --> RG["RolesGuard"]
AC --> AS
AS --> PRISMA["PrismaService"]
AS --> JWT["@nestjs/jwt"]
AS --> BC["bcryptjs"]
JSG --> PASS["@nestjs/passport"]
JST --> PASS
RG --> REF["@nestjs/core Reflector"]
```

**Diagram sources**
- [auth.module.ts:10-27](file://src/auth/auth.module.ts#L10-L27)
- [auth.controller.ts:14-44](file://src/auth/auth.controller.ts#L14-L44)
- [auth.service.ts:14-173](file://src/auth/auth.service.ts#L14-L173)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [jwt.strategy.ts:1-24](file://src/auth/jwt.strategy.ts#L1-L24)
- [roles.guard.ts:1-22](file://src/auth/roles.guard.ts#L1-L22)

**Section sources**
- [auth.module.ts:10-27](file://src/auth/auth.module.ts#L10-L27)
- [auth.controller.ts:14-44](file://src/auth/auth.controller.ts#L14-L44)
- [auth.service.ts:14-173](file://src/auth/auth.service.ts#L14-L173)
- [jwt-auth.guard.ts:1-6](file://src/auth/jwt-auth.guard.ts#L1-L6)
- [jwt.strategy.ts:1-24](file://src/auth/jwt.strategy.ts#L1-L24)
- [roles.guard.ts:1-22](file://src/auth/roles.guard.ts#L1-L22)

## Performance Considerations
- Token expiration is configured to seven days. Consider short-lived access tokens with a refresh mechanism for higher security if needed.
- Password hashing cost is set implicitly by bcryptjs; ensure the server environment is tuned appropriately.
- Database queries for duplicate checks and user retrieval are minimal; ensure proper indexing on email and cellphone fields.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Missing JWT_SECRET: JwtStrategy throws an error if the secret is not defined in configuration.
- Invalid credentials: Login and signup throw UnauthorizedException for invalid email/password combinations.
- Duplicate email or phone: Signup throws ConflictException when attempting to reuse an existing email or phone number.
- User not found: getMe throws UnauthorizedException if the user does not exist.
- Missing Authorization header: Requests without a valid bearer token fail JwtAuthGuard.

**Section sources**
- [jwt.strategy.ts:9-12](file://src/auth/jwt.strategy.ts#L9-L12)
- [auth.service.ts:107-115](file://src/auth/auth.service.ts#L107-L115)
- [auth.service.ts:39-41](file://src/auth/auth.service.ts#L39-L41)
- [auth.service.ts:48-51](file://src/auth/auth.service.ts#L48-L51)
- [auth.service.ts:149-151](file://src/auth/auth.service.ts#L149-L151)

## Conclusion
The 99-Pai authentication and authorization system is built on a robust JWT foundation with Passport.js, validated by DTOs, secured by bcrypt, and governed by role-based guards. The design cleanly separates concerns across modules and decorators, enabling secure and maintainable access control across the platform’s multi-role environment.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Practical Examples Index
- Protected route example: GET /auth/me guarded by JwtAuthGuard
  - [auth.controller.ts:35-42](file://src/auth/auth.controller.ts#L35-L42)
- Role-decorated endpoint example: Apply Roles(...) to restrict access to specific roles
  - [roles.decorator.ts:4-5](file://src/auth/roles.decorator.ts#L4-L5)
  - [roles.guard.ts:10-21](file://src/auth/roles.guard.ts#L10-L21)
- Permission checking: RolesGuard evaluates required roles against the authenticated user
  - [roles.guard.ts:10-21](file://src/auth/roles.guard.ts#L10-L21)
- DTO validation for login/signup:
  - [login.dto.ts:4-12](file://src/auth/dto/login.dto.ts#L4-L12)
  - [signup.dto.ts:12-52](file://src/auth/dto/signup.dto.ts#L12-L52)
- Password hashing with bcrypt:
  - [auth.service.ts:54](file://src/auth/auth.service.ts#L54)
  - [auth.service.ts:112](file://src/auth/auth.service.ts#L112)

**Section sources**
- [auth.controller.ts:35-42](file://src/auth/auth.controller.ts#L35-L42)
- [roles.decorator.ts:4-5](file://src/auth/roles.decorator.ts#L4-L5)
- [roles.guard.ts:10-21](file://src/auth/roles.guard.ts#L10-L21)
- [login.dto.ts:4-12](file://src/auth/dto/login.dto.ts#L4-L12)
- [signup.dto.ts:12-52](file://src/auth/dto/signup.dto.ts#L12-L52)
- [auth.service.ts:54](file://src/auth/auth.service.ts#L54)
- [auth.service.ts:112](file://src/auth/auth.service.ts#L112)