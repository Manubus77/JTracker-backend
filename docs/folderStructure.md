# Folder Structure

```
JTracker-backend/
├── docs/                    # Documentation (not committed)
│   ├── architecture.md
│   ├── folderStructure.md
│   └── conventions.md
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migration files
├── src/
│   ├── config/              # Configuration files
│   ├── db/                  # Database setup
│   ├── generated/           # Prisma generated client (gitignored)
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication module
│   │   │   ├── __tests__/   # Test files
│   │   │   ├── controller.js
│   │   │   ├── model.js
│   │   │   ├── service.js
│   │   │   └── utils.js
│   │   ├── applications/    # Job applications module
│   │   └── analytics/       # Analytics module
│   ├── utils/               # Shared utilities
│   │   ├── __tests__/
│   │   ├── logger.js
│   │   └── prisma.js
│   └── server.js            # Application entry point
├── .gitignore
├── package.json
└── prisma.config.js
```

## Module Structure

Each module follows a consistent structure:

- **model.js** - Database layer (Prisma queries)
- **service.js** - Business logic layer
- **controller.js** - HTTP request/response handling
- **utils.js** - Module-specific utilities
- **__tests__/** - Test files for each layer

