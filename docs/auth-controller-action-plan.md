# Auth Controller Development Action Plan

## Overview
This document outlines the step-by-step action plan for developing the auth controller endpoints following TDD (Test-Driven Development) principles.

## Development Approach: TDD (Test First, Then Implementation)

---

## Phase 1: Test Setup and Infrastructure

### Step 1.1: Set Up Test Infrastructure
**File**: `src/modules/auth/__tests__/controller.test.js`

**Actions**:
1. Import required dependencies:
   - `supertest` for HTTP testing
   - `chai` for assertions (`expect`)
   - Express `app` from `src/server.js` or create test app instance
   - `service` module from `../service`
   - `prisma` for database cleanup
   - `utils` for token generation (for authenticated tests)

2. Create test structure:
   - Main `describe` block: `'Auth Controller (HTTP Layer)'`
   - Nested `describe` blocks for each endpoint:
     - `describe('POST /register', ...)`
     - `describe('POST /login', ...)`
     - `describe('GET /me', ...)`

3. Set up test hooks:
   - `beforeEach`: Clean database (delete all users)
   - `after`: Disconnect Prisma client
   - Consider using test database or transactions if available

4. Define test data constants:
   - `validUserData`: `{ email, password, name }` with valid values
   - `validPassword`: `'TestPass123!'` (meets all requirements)
   - `validEmail`: `'test@example.com'`

---

## Phase 2: Write Tests for POST /register Endpoint

### Step 2.1: Success Cases Tests

**Test 1: Register with valid data (all fields)**
- **Request**: POST `/register` with `{ email, password, name }`
- **Expected Status**: `201 Created`
- **Expected Response Body**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "name": "Test User",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    },
    "token": "jwt-token-string"
  }
  ```
- **Assertions**:
  - Status code is 201
  - Response has `user` and `token` properties
  - `user` object has required fields (id, email, name, createdAt, updatedAt)
  - `user` object does NOT have `password` field
  - `token` is a non-empty string
  - User exists in database (verify via Prisma)
  - User's password in DB is hashed (starts with `$2a$` or `$2b$`)

### Step 2.2: Validation Error Tests (400 Bad Request)

**Test 2: Missing email**
- **Request**: POST `/register` with `{ password, name }` (no email)
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Email is required" }` or similar
- **Assertions**: Status 400, error message contains "email" and "required"

**Test 3: Missing password**
- **Request**: POST `/register` with `{ email, name }` (no password)
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Password is required" }`
- **Assertions**: Status 400, error message contains "password" and "required"

**Test 4: Missing name**
- **Request**: POST `/register` with `{ email, password }` (no name)
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Name is required" }`
- **Assertions**: Status 400, error message contains "name" and "required"

**Test 5: Invalid email format**
- **Request**: POST `/register` with `{ email: "invalid-email", password, name }`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Email must be a valid email address" }`
- **Assertions**: Status 400, error message about email format

**Test 6: Password too short**
- **Request**: POST `/register` with `{ email, password: "Short1!", name }`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Password must be at least 8 characters long" }`
- **Assertions**: Status 400, error message about password length

**Test 7: Password too long**
- **Request**: POST `/register` with `{ email, password: "VeryLongPassword123!", name }`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Password must be at most 15 characters long" }`
- **Assertions**: Status 400, error message about max length

**Test 8: Password missing capital letter**
- **Request**: POST `/register` with `{ email, password: "testpass123!", name }`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Password must contain at least one capital letter" }`
- **Assertions**: Status 400, error message about capital letter

**Test 9: Password missing symbol**
- **Request**: POST `/register` with `{ email, password: "TestPass123", name }`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{ "error": "Password must contain at least one symbol" }`
- **Assertions**: Status 400, error message about symbol

**Test 10: Empty request body**
- **Request**: POST `/register` with `{}`
- **Expected Status**: `400 Bad Request`
- **Expected Response**: Error about missing required fields
- **Assertions**: Status 400, appropriate error message

**Test 11: Invalid JSON in request body**
- **Request**: POST `/register` with malformed JSON
- **Expected Status**: `400 Bad Request`
- **Expected Response**: Express JSON parse error
- **Assertions**: Status 400 (Express handles this automatically)

### Step 2.3: Business Logic Error Tests

**Test 12: Duplicate email (409 Conflict)**
- **Setup**: Register a user first
- **Request**: POST `/register` with same email
- **Expected Status**: `409 Conflict`
- **Expected Response**: `{ "error": "Email already exists" }`
- **Assertions**: Status 409, error message about duplicate email

### Step 2.4: Security and Edge Cases Tests

**Test 13: Password not in response**
- **Request**: POST `/register` with valid data
- **Assertions**: 
  - Response `user` object does NOT have `password` property
  - Response `user` object does NOT have `passwordHash` property
  - Use `expect(response.body.user).to.not.have.property('password')`

**Test 14: Email trimming**
- **Request**: POST `/register` with `{ email: "  test@example.com  ", password, name }`
- **Assertions**: 
  - Registration succeeds (201)
  - User in database has trimmed email (no leading/trailing spaces)
  - Response email is trimmed

**Test 15: Name trimming**
- **Request**: POST `/register` with `{ email, password, name: "  Test User  " }`
- **Assertions**: 
  - Registration succeeds (201)
  - User in database has trimmed name
  - Response name is trimmed

---

## Phase 3: Write Tests for POST /login Endpoint

### Step 3.1: Success Cases Tests

**Test 1: Login with valid credentials**
- **Setup**: Register a user first
- **Request**: POST `/login` with `{ email, password }` (correct credentials)
- **Expected Status**: `200 OK`
- **Expected Response Body**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "name": "Test User",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    },
    "token": "jwt-token-string"
  }
  ```
- **Assertions**:
  - Status code is 200
  - Response has `user` and `token` properties
  - `user` object does NOT have `password` field
  - `token` is a non-empty string
  - Token is valid (can be verified with `utils.verifyToken`)

### Step 3.2: Validation Error Tests

**Test 2: Missing email**
- **Request**: POST `/login` with `{ password }` (no email)
- **Expected Status**: `400 Bad Request` or `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid credentials" }` (generic for security)
- **Assertions**: Status 400/401, generic error message

**Test 3: Missing password**
- **Request**: POST `/login` with `{ email }` (no password)
- **Expected Status**: `400 Bad Request` or `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid credentials" }`
- **Assertions**: Status 400/401, generic error message

**Test 4: Empty request body**
- **Request**: POST `/login` with `{}`
- **Expected Status**: `400 Bad Request` or `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid credentials" }`
- **Assertions**: Status 400/401, generic error message

**Test 5: Invalid JSON**
- **Request**: POST `/login` with malformed JSON
- **Expected Status**: `400 Bad Request`
- **Assertions**: Status 400 (Express handles this)

### Step 3.3: Authentication Error Tests (401 Unauthorized)

**Test 6: Invalid email (user not found)**
- **Request**: POST `/login` with `{ email: "nonexistent@example.com", password }`
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid credentials" }` (generic)
- **Assertions**: 
  - Status 401
  - Generic error message (doesn't reveal user doesn't exist)

**Test 7: Invalid password (wrong password)**
- **Setup**: Register a user first
- **Request**: POST `/login` with `{ email, password: "WrongPass123!" }`
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid credentials" }` (generic)
- **Assertions**: 
  - Status 401
  - Generic error message (doesn't reveal which field is wrong)

**Test 8: Email with whitespace**
- **Setup**: Register a user with `email: "test@example.com"`
- **Request**: POST `/login` with `{ email: "  test@example.com  ", password }`
- **Expected Status**: `200 OK` (should trim and work)
- **Assertions**: Login succeeds with trimmed email

### Step 3.4: Security Tests

**Test 9: Password not in response**
- **Request**: POST `/login` with valid credentials
- **Assertions**: 
  - Response `user` object does NOT have `password` property
  - Response `user` object does NOT have `passwordHash` property

**Test 10: Generic error messages**
- **Test multiple failure scenarios**:
  - Missing email → "Invalid credentials"
  - Missing password → "Invalid credentials"
  - Wrong email → "Invalid credentials"
  - Wrong password → "Invalid credentials"
- **Assertions**: All return same generic message (security best practice)

---

## Phase 4: Write Tests for GET /me Endpoint

### Step 4.1: Success Cases Tests

**Test 1: Get current user with valid token**
- **Setup**: 
  - Register a user
  - Login to get a token
- **Request**: GET `/me` with `Authorization: Bearer <token>` header
- **Expected Status**: `200 OK`
- **Expected Response Body**:
  ```json
  {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
  ```
- **Assertions**:
  - Status code is 200
  - Response has user fields (id, email, name, createdAt, updatedAt)
  - Response does NOT have `password` field
  - User data matches logged-in user

### Step 4.2: Authentication Error Tests (401 Unauthorized)

**Test 2: Missing Authorization header**
- **Request**: GET `/me` with no headers
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Token is required" }` or `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401, appropriate error message

**Test 3: Invalid token format (not Bearer)**
- **Request**: GET `/me` with `Authorization: InvalidFormat token123`
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Token is required" }` or `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401, error message

**Test 4: Missing token (empty Bearer)**
- **Request**: GET `/me` with `Authorization: Bearer ` (empty after Bearer)
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Token is required" }`
- **Assertions**: Status 401, error message

**Test 5: Invalid token (malformed JWT)**
- **Request**: GET `/me` with `Authorization: Bearer invalid.jwt.token`
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401, error message

**Test 6: Expired token**
- **Setup**: 
  - Register and login to get token
  - Generate token with short expiration (1 second)
  - Wait 2 seconds
- **Request**: GET `/me` with expired token
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401, error message

**Test 7: Token signed with wrong secret**
- **Setup**: Generate token with different secret using `jsonwebtoken.sign()`
- **Request**: GET `/me` with wrong-secret token
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401, error message

**Test 8: Token missing userId**
- **Setup**: Generate token with payload `{ email: "test@example.com" }` (no userId)
- **Request**: GET `/me` with token missing userId
- **Expected Status**: `401 Unauthorized`
- **Expected Response**: `{ "error": "Invalid token: missing userId" }`
- **Assertions**: Status 401, specific error message

**Test 9: Token with non-existent userId**
- **Setup**: Generate token with `userId` that doesn't exist in database
- **Request**: GET `/me` with token containing non-existent userId
- **Expected Status**: `401 Unauthorized` or `404 Not Found`
- **Expected Response**: `{ "error": "User not found" }` or `{ "error": "Invalid or expired token" }`
- **Assertions**: Status 401/404, appropriate error message

### Step 4.3: Security Tests

**Test 10: Password not in response**
- **Request**: GET `/me` with valid token
- **Assertions**: 
  - Response does NOT have `password` property
  - Response does NOT have `passwordHash` property

**Test 11: Token extraction from header**
- **Test cases**:
  - `Authorization: Bearer <token>` (standard format)
  - `authorization: bearer <token>` (case-insensitive)
  - `Authorization: Bearer  <token>` (extra spaces)
- **Assertions**: All should work correctly (extract token properly)

---

## Phase 5: Implement Controller Functions

### Step 5.1: Create Controller Structure

**File**: `src/modules/auth/controller.js`

**Actions**:
1. Import dependencies:
   - `service` module from `./service`
   - Express `Request`, `Response` types (if using TypeScript) or just use standard Express handlers

2. Create controller functions:
   - `register` - async function `(req, res, next) => {}`
   - `login` - async function `(req, res, next) => {}`
   - `getCurrentUser` - async function `(req, res, next) => {}`

3. Export functions:
   ```javascript
   module.exports = {
     register,
     login,
     getCurrentUser,
   };
   ```

### Step 5.2: Implement register Controller

**Function**: `register(req, res, next)`

**Implementation Steps**:
1. Extract request body: `const { email, password, name } = req.body;`
2. Call service layer: `await service.register({ email, password, name })`
3. Handle success:
   - Set status: `res.status(201)`
   - Return JSON: `res.json({ user: result.user, token: result.token })`
4. Handle errors:
   - Use try-catch block
   - Check error message to determine status code:
     - Validation errors (email/password/name validation) → `400 Bad Request`
     - "Email already exists" → `409 Conflict`
     - Other errors → `500 Internal Server Error`
   - Return error: `res.status(statusCode).json({ error: error.message })`
5. Consider using `next(error)` for error handling middleware (if implemented)

**Error Handling Logic**:
```javascript
try {
  // service call
} catch (error) {
  if (error.message.includes('required') || 
      error.message.includes('must be') || 
      error.message.includes('valid')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message.includes('already exists')) {
    return res.status(409).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Internal server error' });
}
```

### Step 5.3: Implement login Controller

**Function**: `login(req, res, next)`

**Implementation Steps**:
1. Extract request body: `const { email, password } = req.body;`
2. Call service layer: `await service.login({ email, password })`
3. Handle success:
   - Set status: `res.status(200)`
   - Return JSON: `res.json({ user: result.user, token: result.token })`
4. Handle errors:
   - Use try-catch block
   - Check error message:
     - "Invalid credentials" → `401 Unauthorized`
     - Validation errors → `400 Bad Request` or `401 Unauthorized` (your choice)
     - Other errors → `500 Internal Server Error`
   - Return error: `res.status(statusCode).json({ error: error.message })`

**Note**: All login errors should return generic "Invalid credentials" for security

### Step 5.4: Implement getCurrentUser Controller

**Function**: `getCurrentUser(req, res, next)`

**Implementation Steps**:
1. Extract token from Authorization header:
   - Get header: `const authHeader = req.headers.authorization;`
   - Check if header exists
   - Extract Bearer token: `const token = authHeader?.split(' ')[1];` or use regex
   - Handle case-insensitive header name
   - Handle missing/invalid format
2. Call service layer: `await service.getCurrentUser(token)`
3. Handle success:
   - Set status: `res.status(200)`
   - Return JSON: `res.json(result.user)` or `res.json(result)`
4. Handle errors:
   - Use try-catch block
   - Check error message:
     - "Token is required" → `401 Unauthorized`
     - "Invalid or expired token" → `401 Unauthorized`
     - "User not found" → `401 Unauthorized` or `404 Not Found`
     - Other errors → `500 Internal Server Error`
   - Return error: `res.status(statusCode).json({ error: error.message })`

**Token Extraction Logic**:
```javascript
const authHeader = req.headers.authorization || req.headers.Authorization;
if (!authHeader) {
  return res.status(401).json({ error: 'Token is required' });
}

const parts = authHeader.split(' ');
if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
  return res.status(401).json({ error: 'Token is required' });
}

const token = parts[1];
if (!token || token.trim() === '') {
  return res.status(401).json({ error: 'Token is required' });
}
```

---

## Phase 6: Create Routes File

### Step 6.1: Create Routes Structure

**File**: `src/modules/auth/routes.js` (or `src/modules/auth/index.js`)

**Actions**:
1. Import Express Router: `const router = require('express').Router();`
2. Import controller functions: `const { register, login, getCurrentUser } = require('./controller');`
3. Define routes:
   - `router.post('/register', register);`
   - `router.post('/login', login);`
   - `router.get('/me', getCurrentUser);`
4. Export router: `module.exports = router;`

### Step 6.2: Wire Up Routes in Main App

**File**: `src/server.js`

**Actions**:
1. Import auth routes: `const authRoutes = require('./modules/auth/routes');`
2. Mount routes: `app.use('/api/auth', authRoutes);` (or your preferred base path)
3. Final routes will be:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/auth/me`

---

## Phase 7: Error Handling Middleware (Optional but Recommended)

### Step 7.1: Create Error Handler

**Considerations**:
- Create centralized error handling middleware
- Handle different error types consistently
- Log errors for debugging
- Don't expose internal errors to clients

**Implementation** (if desired):
1. Create error handler middleware
2. Use `next(error)` in controllers
3. Register middleware in `server.js`

---

## Phase 8: Testing and Validation

### Step 8.1: Run All Tests
- Run: `npm test -- src/modules/auth/__tests__/controller.test.js`
- Verify all tests pass
- Fix any failing tests

### Step 8.2: Manual Testing
- Start server: `npm start` or `npm run dev`
- Test endpoints with:
  - Postman
  - curl commands
  - Browser (for GET requests)
- Verify:
  - Status codes are correct
  - Response bodies match expected format
  - Error messages are appropriate
  - Security measures work (no password exposure)

### Step 8.3: Integration Testing
- Test full flow:
  1. Register user → get token
  2. Use token to call GET /me
  3. Login with credentials
  4. Use new token to call GET /me

---

## Phase 9: Documentation and Cleanup

### Step 9.1: Update Documentation
- Update API documentation (if exists)
- Update README with endpoint information
- Document request/response formats
- Document error codes and messages

### Step 9.2: Code Review Checklist
- [ ] All tests pass
- [ ] No password fields in responses
- [ ] Proper HTTP status codes
- [ ] Error messages are user-friendly
- [ ] Security best practices followed
- [ ] Code follows project conventions
- [ ] No console.logs in production code
- [ ] Proper error handling

---

## Summary

### Test Count
- **POST /register**: ~15 tests
- **POST /login**: ~10 tests
- **GET /me**: ~11 tests
- **Total**: ~36 tests

### Implementation Order
1. ✅ Write all tests first (TDD)
2. ✅ Implement `register` controller
3. ✅ Implement `login` controller
4. ✅ Implement `getCurrentUser` controller
5. ✅ Create routes file
6. ✅ Wire up routes in server
7. ✅ Test and validate
8. ✅ Document

### Key Security Considerations
- Never return password in responses
- Use generic error messages for login failures
- Proper token extraction and validation
- Input sanitization (trimming)
- Appropriate HTTP status codes

---

## Next Steps After Controller Implementation

1. **Authentication Middleware** (if needed for other routes):
   - Create middleware to extract and verify tokens
   - Attach user to `req.user`
   - Use in protected routes

2. **Rate Limiting** (security enhancement):
   - Implement rate limiting for login/register endpoints
   - Prevent brute force attacks

3. **Request Validation Middleware** (optional):
   - Move validation to middleware layer
   - Use Zod schemas in middleware

4. **Logging** (monitoring):
   - Add request logging
   - Log authentication attempts
   - Log errors


