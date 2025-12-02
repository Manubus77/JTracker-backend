# Validation Rules Documentation

This document contains all validation schemas and rules used in the JTracker backend, implemented using Zod.

## Auth Module Validation Rules

### Register Schema

**Location**: `src/modules/auth/validations.js`

**Schema**: `registerSchema`

**Fields**:

1. **email** (required)
   - Type: `string`
   - Validation Rules:
     - Must be a non-empty string (after trimming)
     - Must be a valid email address format
     - Automatically trimmed (leading/trailing whitespace removed)
   - Error Messages:
     - Missing: "Email is required"
     - Invalid type: "Email must be a string"
     - Empty after trim: "Email must be a non-empty string"
     - Invalid format: "Email must be a valid email address"

2. **password** (required)
   - Type: `string`
   - Validation Rules:
     - Minimum length: 8 characters
     - Maximum length: 15 characters
     - Must contain at least one capital letter (A-Z)
     - Must contain at least one symbol from: `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`
   - Error Messages:
     - Missing: "Password is required"
     - Invalid type: "Password must be a string"
     - Too short: "Password must be at least 8 characters long"
     - Too long: "Password must be at most 15 characters long"
     - No capital: "Password must contain at least one capital letter"
     - No symbol: "Password must contain at least one symbol"

3. **name** (required)
   - Type: `string`
   - Validation Rules:
     - Must be a non-empty string (after trimming)
     - Automatically trimmed (leading/trailing whitespace removed)
   - Error Messages:
     - Missing: "Name is required"
     - Invalid type: "Name must be a string"
     - Empty after trim: "Name must be a non-empty string"

**Example Valid Data**:
```javascript
{
  email: 'user@example.com',
  password: 'TestPass123!',
  name: 'John Doe' // required
}
```

**Example Invalid Data**:
```javascript
// Missing email
{ password: 'TestPass123!' } // Error: "Email is required"

// Invalid password
{ email: 'user@example.com', password: 'short' } // Error: "Password must be at least 8 characters long"

// Password without capital
{ email: 'user@example.com', password: 'testpass123!' } // Error: "Password must contain at least one capital letter"
```

### Login Schema

**Location**: `src/modules/auth/validations.js`

**Schema**: `loginSchema`

**Fields**:

1. **email** (required)
   - Type: `string`
   - Validation Rules:
     - Must be a non-empty string (after trimming)
     - Automatically trimmed
   - Error Message: "Invalid credentials" (generic for security)

2. **password** (required)
   - Type: `string`
   - Validation Rules:
     - Must be a non-empty string
   - Error Message: "Invalid credentials" (generic for security)

**Note**: Login uses generic error messages to prevent user enumeration attacks.

### Token Schema

**Location**: `src/modules/auth/validations.js`

**Schema**: `tokenSchema`

**Validation Rules**:
- Type: `string`
- Must be a non-empty string (after trimming)
- Automatically trimmed
- Error Message: "Token must be a non-empty string"

## Validation Helper Function

### `parseWithErrorHandling(schema, data)`

**Purpose**: Wraps Zod's `parse()` method to provide consistent error handling and user-friendly error messages.

**Features**:
- Converts Zod errors to simple `Error` objects
- Handles missing fields by converting "received undefined" to "Field is required"
- Extracts field names from error paths
- Capitalizes field names in error messages
- Handles TypeErrors that may occur during validation

**Usage**:
```javascript
const validated = parseWithErrorHandling(registerSchema, userData);
```

## Implementation Details

### Error Handling Strategy

1. **Missing Fields**: When a required field is missing from the input object, Zod returns "Invalid input: expected string, received undefined". Our error handler converts this to "FieldName is required".

2. **Type Errors**: If a TypeError occurs (e.g., accessing properties on undefined), the handler attempts to get a proper Zod error using `safeParse()`.

3. **Field Name Extraction**: Error messages include the field name (capitalized) for better user experience.

### Data Transformation

- **Email**: Automatically trimmed using `z.preprocess()` before validation
- **Name**: Trimmed after validation if provided
- **Password**: No transformation (validated as-is for security)

## Usage in Service Layer

### Register Function
```javascript
const register = async (data) => {
    // Ensure all fields exist (even if undefined)
    const dataToValidate = {
        email: data?.email,
        password: data?.password,
        name: data?.name,
    };
    
    // Validate using Zod schema
    const validated = parseWithErrorHandling(registerSchema, dataToValidate);
    
    // Use validated data (email already trimmed)
    // ...
};
```

## Testing

All validation rules are tested in:
- `src/modules/auth/__tests__/service.test.js`

Test coverage includes:
- ✅ Missing fields (email, password)
- ✅ Null/undefined values
- ✅ Empty strings
- ✅ Invalid formats (email, password strength)
- ✅ Edge cases (whitespace, special characters)
- ✅ Optional fields (name)

## Future Enhancements

Potential improvements:
1. Add validation for other modules (applications, analytics)
2. Create shared validation utilities
3. Add custom validators for business rules
4. Implement validation middleware for Express routes
5. Add validation error aggregation (show all errors at once)



