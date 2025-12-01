# Conventions

## Naming Conventions

### Files and Folders
- **Files**: camelCase (e.g., `model.js`, `createUser.js`)
- **Folders**: camelCase or kebab-case (e.g., `__tests__/`, `modules/`)
- **Test files**: `*.test.js` suffix (e.g., `model.test.js`)

### Functions
- **Functions**: camelCase (e.g., `createUser`, `findUserByEmail`)
- **Async functions**: Use `async/await` pattern
- **Error handling**: Use try-catch blocks

### Variables
- **Variables**: camelCase (e.g., `testUser`, `createdUser`)
- **Constants**: UPPER_SNAKE_CASE for module-level constants
- **Database fields**: snake_case in schema, camelCase in JavaScript

## Code Patterns

### Model Layer (Database)
- **Thin layer**: Focus only on database operations (CRUD)
- Use Prisma `select` to exclude sensitive fields (e.g., password)
- Return sanitized objects without passwords
- Handle Prisma errors appropriately (P2002, P2009, P2000, etc.)
- **No input validation**: Trust that service layer provides valid input
- Let Prisma handle invalid database queries naturally

### Service Layer
- Contains business logic
- **Input validation**: Uses Zod schemas for declarative validation (see `docs/validation-rules.md`)
- Validation schemas defined in `validations.js` files per module
- Calls model layer functions
- Handles error transformation and business rules
- Orchestrates multiple model calls if needed

### Controller Layer
- Handles HTTP requests/responses
- Calls service layer
- Returns appropriate status codes

### Test Structure
- Use `describe` blocks for grouping tests
- Use `beforeEach` for test setup
- Use `after` for cleanup
- Follow AAA pattern: Arrange (Definition), Act (Execution), Assert (Assertion)
- Test comments use: `//Definition`, `//Execution`, `//Assertion`

## Rules

### Security
- **Never** return password fields in API responses
- Always hash passwords before storing
- Use Prisma `select` to explicitly exclude sensitive data

### Database
- Always clean up test data in `beforeEach` hooks
- Disconnect Prisma client in `after` hooks
- Use transactions for complex operations when needed

### Error Handling
- Handle Prisma-specific error codes appropriately
- Provide meaningful error messages
- Don't expose internal errors to clients

### Testing
- Write tests before implementation (TDD)
- Test each layer independently
- **Model tests**: Test database operations only (happy path, not found, password exclusion, Prisma errors)
- **Service tests**: Test validation, business logic, error handling, and model orchestration
- **Controller tests**: Test HTTP handling, status codes, request/response transformation
- Use descriptive test names
- Clean up after tests

### Separation of Concerns
- **Model Layer**: 
  - Only database operations (CRUD)
  - No input validation or business logic
  - Trust that service layer provides valid input
  - Let Prisma handle database constraint errors naturally
- **Service Layer**:
  - All input validation (null, undefined, empty, format, business rules)
  - Business logic and orchestration
  - Error transformation (database errors → business errors)
  - Should not directly access database (use model layer)
- **Controller Layer**:
  - HTTP request/response handling only
  - Request parsing and response formatting
  - Status code management
  - Should not contain business logic (delegate to service)
  - Should not access database (delegate to service)
- **Utils Layer**:
  - Pure utility functions
  - No business logic or database access
  - Reusable across modules

