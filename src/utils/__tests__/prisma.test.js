const { expect } = require('chai');
const prisma = require('../prisma');

describe('Prisma PostgreSQL Connection Tests', () => {
  // Test database connection
  describe('Database Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      try {
        await prisma.$connect();
        expect(true).to.be.true;
      } catch (error) {
        throw new Error(`Failed to connect to database: ${error.message}`);
      }
    });

    it('should execute raw SQL query', async () => {
      try {
        const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as pg_version`;
        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('current_time');
        expect(result[0]).to.have.property('pg_version');
        expect(result[0].pg_version).to.include('PostgreSQL');
      } catch (error) {
        throw new Error(`Failed to execute raw query: ${error.message}`);
      }
    });

    it('should check database version', async () => {
      try {
        const result = await prisma.$queryRaw`SELECT version() as version`;
        expect(result[0].version).to.be.a('string');
        console.log(`PostgreSQL Version: ${result[0].version}`);
      } catch (error) {
        throw new Error(`Failed to get database version: ${error.message}`);
      }
    });
  });

  // Test User model CRUD operations
  describe('User Model Operations', () => {
    let testUserId;

    afterEach(async () => {
      // Clean up test data
      if (testUserId) {
        try {
          await prisma.user.delete({
            where: { id: testUserId },
          });
          testUserId = null;
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create a new user', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          name: 'Test User',
        },
      });

      expect(user).to.have.property('id');
      expect(user.email).to.equal(testEmail);
      expect(user.name).to.equal('Test User');
      testUserId = user.id;
    });

    it('should read a user by email', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const createdUser = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          name: 'Test User',
        },
      });
      testUserId = createdUser.id;

      const foundUser = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(foundUser).to.not.be.null;
      expect(foundUser.email).to.equal(testEmail);
    });

    it('should update a user', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const createdUser = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          name: 'Original Name',
        },
      });
      testUserId = createdUser.id;

      const updatedUser = await prisma.user.update({
        where: { id: testUserId },
        data: { name: 'Updated Name' },
      });

      expect(updatedUser.name).to.equal('Updated Name');
    });

    it('should delete a user', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const createdUser = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
        },
      });
      const userId = createdUser.id;

      await prisma.user.delete({
        where: { id: userId },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(deletedUser).to.be.null;
    });

    it('should enforce unique email constraint', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
        },
      });

      try {
        await prisma.user.create({
          data: {
            email: testEmail,
            password: 'anotherpassword',
          },
        });
        throw new Error('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.code).to.equal('P2002'); // Prisma unique constraint error code
      }
    });
  });

  // Test JobApplication model with relationships
  describe('JobApplication Model with Relationships', () => {
    let testUserId;
    let testApplicationId;

    beforeEach(async () => {
      // Create a test user
      const testEmail = `test-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
          name: 'Test User',
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      // Clean up test data (cascade delete should handle related records)
      if (testUserId) {
        try {
          await prisma.user.delete({
            where: { id: testUserId },
          });
          testUserId = null;
          testApplicationId = null;
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create a job application with user relationship', async () => {
      const application = await prisma.jobApplication.create({
        data: {
          position: 'Software Engineer',
          company: 'Tech Corp',
          url: 'https://example.com/job',
          status: 'APPLIED',
          userId: testUserId,
        },
      });

      expect(application).to.have.property('id');
      expect(application.position).to.equal('Software Engineer');
      expect(application.company).to.equal('Tech Corp');
      expect(application.userId).to.equal(testUserId);
      testApplicationId = application.id;
    });

    it('should fetch user with applications (include)', async () => {
      await prisma.jobApplication.create({
        data: {
          position: 'Software Engineer',
          company: 'Tech Corp',
          userId: testUserId,
        },
      });

      const userWithApplications = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          applications: true,
        },
      });

      expect(userWithApplications).to.have.property('applications');
      expect(userWithApplications.applications).to.be.an('array');
      expect(userWithApplications.applications.length).to.be.greaterThan(0);
    });

    it('should cascade delete applications when user is deleted', async () => {
      await prisma.jobApplication.create({
        data: {
          position: 'Software Engineer',
          company: 'Tech Corp',
          userId: testUserId,
        },
      });

      await prisma.user.delete({
        where: { id: testUserId },
      });

      const applications = await prisma.jobApplication.findMany({
        where: { userId: testUserId },
      });

      expect(applications).to.be.an('array');
      expect(applications.length).to.equal(0);
    });
  });

  // Test File model with multiple relationships
  describe('File Model with Relationships', () => {
    let testUserId;
    let testApplicationId;
    let testFileId;

    beforeEach(async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
        },
      });
      testUserId = user.id;

      const application = await prisma.jobApplication.create({
        data: {
          position: 'Software Engineer',
          company: 'Tech Corp',
          userId: testUserId,
        },
      });
      testApplicationId = application.id;
    });

    afterEach(async () => {
      if (testUserId) {
        try {
          await prisma.user.delete({
            where: { id: testUserId },
          });
          testUserId = null;
          testApplicationId = null;
          testFileId = null;
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create a file with user and optional job application', async () => {
      const file = await prisma.file.create({
        data: {
          type: 'CV',
          filename: 'resume.pdf',
          url: 'https://example.com/files/resume.pdf',
          userId: testUserId,
          jobApplicationId: testApplicationId,
        },
      });

      expect(file).to.have.property('id');
      expect(file.type).to.equal('CV');
      expect(file.userId).to.equal(testUserId);
      expect(file.jobApplicationId).to.equal(testApplicationId);
      testFileId = file.id;
    });

    it('should create a file without job application', async () => {
      const file = await prisma.file.create({
        data: {
          type: 'COVER_LETTER',
          filename: 'cover.pdf',
          url: 'https://example.com/files/cover.pdf',
          userId: testUserId,
        },
      });

      expect(file.jobApplicationId).to.be.null;
      testFileId = file.id;
    });
  });

  // Test transactions
  describe('Transactions', () => {
    it('should execute a transaction successfully', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      let testUserId;

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: testEmail,
              password: 'hashedpassword123',
              name: 'Transaction User',
            },
          });

          const application = await tx.jobApplication.create({
            data: {
              position: 'Software Engineer',
              company: 'Tech Corp',
              userId: user.id,
            },
          });

          return { user, application };
        });

        expect(result.user).to.have.property('id');
        expect(result.application).to.have.property('id');
        testUserId = result.user.id;

        // Cleanup
        await prisma.user.delete({
          where: { id: testUserId },
        });
      } catch (error) {
        if (testUserId) {
          await prisma.user.delete({
            where: { id: testUserId },
          });
        }
        throw error;
      }
    });

    it('should rollback transaction on error', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      let testUserId;

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: testEmail,
              password: 'hashedpassword123',
            },
          });
          testUserId = user.id;

          // Try to create a duplicate email which will fail due to unique constraint
          await tx.user.create({
            data: {
              email: testEmail, // Duplicate email should cause error
              password: 'anotherpassword',
            },
          });
        });

        throw new Error('Transaction should have rolled back');
      } catch (error) {
        // Transaction should have rolled back, so user should not exist
        if (testUserId) {
          const user = await prisma.user.findUnique({
            where: { id: testUserId },
          });
          expect(user).to.be.null;
        }
        expect(error).to.exist;
        expect(error.code).to.equal('P2002'); // Prisma unique constraint error
      }
    });
  });

  // Test enums
  describe('Enum Types', () => {
    let testUserId;
    let testApplicationId;

    beforeEach(async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'hashedpassword123',
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      if (testUserId) {
        try {
          await prisma.user.delete({
            where: { id: testUserId },
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should accept valid ApplicationStatus enum values', async () => {
      const statuses = ['APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER'];

      for (const status of statuses) {
        const application = await prisma.jobApplication.create({
          data: {
            position: 'Software Engineer',
            company: 'Tech Corp',
            status: status,
            userId: testUserId,
          },
        });

        expect(application.status).to.equal(status);
        await prisma.jobApplication.delete({
          where: { id: application.id },
        });
      }
    });

    it('should accept valid FileType enum values', async () => {
      const fileTypes = ['CV', 'COVER_LETTER', 'OTHER'];

      for (const fileType of fileTypes) {
        const file = await prisma.file.create({
          data: {
            type: fileType,
            filename: 'test.pdf',
            url: 'https://example.com/test.pdf',
            userId: testUserId,
          },
        });

        expect(file.type).to.equal(fileType);
        await prisma.file.delete({
          where: { id: file.id },
        });
      }
    });
  });

  // Cleanup after all tests
  after(async () => {
    await prisma.$disconnect();
  });
});

