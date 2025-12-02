# Auth Controller Tests Plan

## Overview
This document outlines all required tests for the auth controller endpoints to ensure proper functionality and security.

## Testing Library
- **supertest**: For HTTP endpoint testing
- **chai**: For assertions

## Test Structure

### POST /register Endpoint

#### Success Cases
1. **Register with valid data (email, password, name)**
   - Status: `201 Created`
   - Response body: `{ user: { id, email, name, createdAt, updatedAt }, token: string }`
   - User object should NOT contain password
   - Token should be a valid JWT string
   - User should be created in database

2. **Register with missing name**
   - Status: `400 Bad Request`
   - Error message: "Name is required"

#### Validation Error Cases (400 Bad Request)
2. **Missing name**
   - Status: `400 Bad Request`
   - Error message: "Name is required"

3. **Missing email**
   - Status: `400 Bad Request`
   - Error message: "Email is required"

4. **Missing password**
   - Status: `400 Bad Request`
   - Error message: "Password is required"

5. **Invalid email format**
   - Status: `400 Bad Request`
   - Error message: "Email must be a valid email address"

6. **Password too short (< 8 characters)**
   - Status: `400 Bad Request`
   - Error message: "Password must be at least 8 characters long"

7. **Password too long (> 15 characters)**
   - Status: `400 Bad Request`
   - Error message: "Password must be at most 15 characters long"

8. **Password missing capital letter**
   - Status: `400 Bad Request`
   - Error message: "Password must contain at least one capital letter"

9. **Password missing symbol**
   - Status: `400 Bad Request`
   - Error message: "Password must contain at least one symbol"

11. **Empty request body**
    - Status: `400 Bad Request`
    - Error message: "Email is required" or "Password is required"

12. **Invalid JSON in request body**
    - Status: `400 Bad Request`
    - Express should handle this automatically

#### Business Logic Error Cases
13. **Duplicate email (409 Conflict)**
    - Status: `409 Conflict`
    - Error message: "Email already exists"
    - Should not create duplicate user

#### Security Checks
14. **Password not in response**
    - Verify response.user does NOT have password field
    - Verify password hash is not exposed

15. **Email trimming**

16. **Name trimming**
   - Register with name containing leading/trailing spaces
   - Should trim name before validation and storage
    - Register with email containing leading/trailing spaces
    - Should trim email before validation and storage

---

### POST /login Endpoint

#### Success Cases
1. **Login with valid credentials**
   - Status: `200 OK`
   - Response body: `{ user: { id, email, name, createdAt, updatedAt }, token: string }`
   - User object should NOT contain password
   - Token should be a valid JWT string

#### Validation Error Cases (400 Bad Request)
2. **Missing email**
   - Status: `400 Bad Request` or `401 Unauthorized`
   - Error message: "Invalid credentials" (generic for security)

3. **Missing password**
   - Status: `400 Bad Request` or `401 Unauthorized`
   - Error message: "Invalid credentials" (generic for security)

4. **Empty request body**
   - Status: `400 Bad Request` or `401 Unauthorized`
   - Error message: "Invalid credentials"

5. **Invalid JSON in request body**
   - Status: `400 Bad Request`
   - Express should handle this automatically

#### Authentication Error Cases (401 Unauthorized)
6. **Invalid email (user not found)**
   - Status: `401 Unauthorized`
   - Error message: "Invalid credentials" (generic for security)
   - Should not reveal that user doesn't exist

7. **Invalid password (wrong password)**
   - Status: `401 Unauthorized`
   - Error message: "Invalid credentials" (generic for security)
   - Should not reveal which field is wrong

8. **Email with whitespace**
   - Login with email containing leading/trailing spaces
   - Should trim email before lookup

#### Security Checks
9. **Password not in response**
    - Verify response.user does NOT have password field
    - Verify password hash is not exposed

10. **Generic error messages**
    - All authentication failures return "Invalid credentials"
    - No field-specific error messages that could help attackers

---

### GET /me Endpoint (Get Current User)

#### Success Cases
1. **Get current user with valid token**
   - Status: `200 OK`
   - Response body: `{ id, email, name, createdAt, updatedAt }`
   - User object should NOT contain password
   - Should extract token from `Authorization: Bearer <token>` header

#### Authentication Error Cases (401 Unauthorized)
2. **Missing Authorization header**
   - Status: `401 Unauthorized`
   - Error message: "Token is required" or "Invalid or expired token"

3. **Invalid token format (not Bearer)**
   - Status: `401 Unauthorized`
   - Error message: "Token is required" or "Invalid or expired token"

4. **Missing token (empty Bearer)**
   - Status: `401 Unauthorized`
   - Error message: "Token is required"

5. **Invalid token (malformed JWT)**
   - Status: `401 Unauthorized`
   - Error message: "Invalid or expired token"

6. **Expired token**
   - Status: `401 Unauthorized`
   - Error message: "Invalid or expired token"

7. **Token signed with wrong secret**
   - Status: `401 Unauthorized`
   - Error message: "Invalid or expired token"

8. **Token missing userId**
   - Status: `401 Unauthorized`
   - Error message: "Invalid token: missing userId"

9. **Token with non-existent userId**
   - Status: `401 Unauthorized` or `404 Not Found`
   - Error message: "User not found" or "Invalid or expired token"

#### Security Checks
10. **Password not in response**
    - Verify response does NOT have password field
    - Verify password hash is not exposed

11. **Token extraction from header**
    - Should extract token from `Authorization: Bearer <token>` header
    - Should handle case-insensitive header names
    - Should handle extra whitespace

---

## Security Best Practices to Test

### 1. Password Protection
- ✅ Never return password in any response
- ✅ Never return password hash in any response
- ✅ Use Prisma `select` to exclude password fields

### 2. Error Message Security
- ✅ Login errors are generic ("Invalid credentials")
- ✅ Don't reveal which field is invalid
- ✅ Don't reveal if user exists or not

### 3. Token Security
- ✅ Tokens only in Authorization header (not query params)
- ✅ Proper token validation and expiration handling
- ✅ No sensitive data in JWT payload

### 4. Input Sanitization
- ✅ Email trimming before validation
- ✅ Proper validation of all inputs
- ✅ Protection against SQL injection (Prisma handles this)

### 5. HTTP Status Codes
- ✅ 201 for successful registration
- ✅ 200 for successful login
- ✅ 200 for successful user retrieval
- ✅ 400 for validation errors
- ✅ 401 for authentication errors
- ✅ 409 for duplicate resources

---

## Test Implementation Notes

### Setup
- Use `supertest` to make HTTP requests
- Use `beforeEach` to clean database
- Use `after` to disconnect Prisma
- Mock or use real Express app instance

### Test Data
- Use valid test passwords: `'TestPass123!'` (meets all requirements)
- Use valid test emails: `'test@example.com'`
- Clean up test users after each test

### Assertions
- Check status codes
- Check response body structure
- Check error messages
- Verify database state when needed
- Verify password exclusion

---

## Summary

**Total Tests Required:**
- POST /register: ~16 tests (name is now required)
- POST /login: ~10 tests  
- GET /me: ~11 tests
- **Total: ~35 tests**

**Key Security Focus Areas:**
1. Password never exposed in responses
2. Generic error messages for authentication failures
3. Proper HTTP status codes
4. Token extraction and validation
5. Input sanitization (trimming, validation)

