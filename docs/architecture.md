# Architecture

## Tech Stack

### Backend Framework
- **Express.js** - Web application framework
- **Node.js** - Runtime environment

### Database
- **PostgreSQL** - Relational database
- **Prisma** - ORM and database toolkit

### Authentication
- **bcrypt** - Password hashing
- **jsonwebtoken (JWT)** - Token-based authentication

### Testing
- **Mocha** - Test framework
- **Chai** - Assertion library

### Development Tools
- **nodemon** - Development server auto-reload
- **cross-env** - Cross-platform environment variables

### Validation
- **Zod** - Schema validation library for runtime type checking and validation
- Declarative validation schemas in `validations.js` files per module
- See `docs/validation-rules.md` for detailed validation rules

## Key Decisions

### Database Layer
- Using Prisma as ORM for type safety and migrations
- Prisma client generated in `/src/generated/` directory

### Project Structure
- Modular (Monolithic) architecture with feature-based modules
- Each module contains: `model.js`, `service.js`, `controller.js`, `utils.js`
- Test files co-located in `__tests__/` directories

### Security
- Password hashing using bcrypt
- Passwords excluded from API responses at model layer using Prisma `select`

### Testing Strategy
- Test-driven development (TDD) approach
- Tests organized by layer (model, service, controller, utils)
- Database cleanup in `beforeEach` and `after` hooks

