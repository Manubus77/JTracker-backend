const { expect } = require('chai');
const prisma = require('../../../utils/prisma');
const service = require('../service');
const model = require('../model');
const utils = require('../utils');

describe('Auth (Business Logic Layer)', () => {
    // Definition: static data
    const validUserData = {
        email: 'test@jtracker.com',
        password: 'TestPass123!', // Valid: 8-15 chars, has capital, has symbol
        name: 'Test User',
    };

    // Clear table before each test
    beforeEach(async () => {
        await prisma.user.deleteMany();
    });

    // Cleanup: Disconnect after all tests run
    after(async () => {
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    describe('register', () => {
        it('Register a new user successfully and return user with token', async () => {
            // Execution
            const result = await service.register(validUserData);

            // Assertion: Returns user object and token
            expect(result).to.be.an('object');
            expect(result).to.have.property('user');
            expect(result).to.have.property('token');
            expect(result.user).to.have.property('id').that.is.a('number');
            expect(result.user.email).to.equal(validUserData.email);
            expect(result.user.name).to.equal(validUserData.name);
            expect(result.user).to.not.have.property('password');
            expect(result.token).to.be.a('string').that.is.not.empty;
        });

        it('Hash password before storing in database', async () => {
            // Execution
            const result = await service.register(validUserData);

            // Assertion: Password is hashed in database
            const userInDb = await prisma.user.findUnique({ where: { id: result.user.id } });
            expect(userInDb.password).to.not.equal(validUserData.password);
            expect(userInDb.password).to.be.a('string');
            // Verify it's hash starts with $2b$ or $2a$ (bcrypt hash)
            expect(userInDb.password).to.match(/^\$2[ab]\$/);
        });

        it('Throw error when email is missing, null, or undefined', async () => {
            // Definition: Test missing email
            const invalidDataMissing = {
                password: 'TestPass123!',
                name: 'Test User',
            };
            
            // Execution and Assertion: Missing email
            try {
                await service.register(invalidDataMissing);
                throw new Error('Should have thrown an error for missing email');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('email');
            }

            // Definition: Test null email
            const invalidDataNull = {
                email: null,
                password: 'TestPass123!',
                name: 'Test User',
            };
            
            // Execution and Assertion: Null email
            try {
                await service.register(invalidDataNull);
                throw new Error('Should have thrown an error for null email');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('email');
            }

            // Definition: Test undefined email
            const invalidDataUndefined = {
                email: undefined,
                password: 'TestPass123!',
                name: 'Test User',
            };
            
            // Execution and Assertion: Undefined email
            try {
                await service.register(invalidDataUndefined);
                throw new Error('Should have thrown an error for undefined email');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('email');
            }
        });

        it('Throw error when email is empty string', async () => {
            // Definition
            const invalidData = {
                email: '',
                password: 'TestPass123!',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for empty email');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('email');
            }
        });

        it('Throw error when email format is invalid', async () => {
            // Definition
            const invalidData = {
                email: 'notanemail',
                password: 'TestPass123!',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for invalid email format');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('email');
            }
        });

        it('Throw error when password is missing, null, or undefined', async () => {
            // Definition: Test missing password
            const invalidDataMissing = {
                email: 'test@jtracker.com',
                name: 'Test User',
            };
            
            // Execution and Assertion: Missing password
            try {
                await service.register(invalidDataMissing);
                throw new Error('Should have thrown an error for missing password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }

            // Definition: Test null password
            const invalidDataNull = {
                email: 'test@jtracker.com',
                password: null,
                name: 'Test User',
            };
            
            // Execution and Assertion: Null password
            try {
                await service.register(invalidDataNull);
                throw new Error('Should have thrown an error for null password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }

            // Definition: Test undefined password
            const invalidDataUndefined = {
                email: 'test@jtracker.com',
                password: undefined,
                name: 'Test User',
            };
            
            // Execution and Assertion: Undefined password
            try {
                await service.register(invalidDataUndefined);
                throw new Error('Should have thrown an error for undefined password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }
        });

        it('Throw error when password is empty string', async () => {
            // Definition
            const invalidData = {
                email: 'test@jtracker.com',
                password: '',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for empty password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }
        });

        it('Throw error when password is too short (less than 8 characters)', async () => {
            // Definition
            const invalidData = {
                email: 'test@jtracker.com',
                password: 'Short1!',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for short password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }
        });

        it('Throw error when password is too long (more than 15 characters)', async () => {
            // Definition
            const invalidData = {
                email: 'test@jtracker.com',
                password: 'VeryLongPass123!',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for long password');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('password');
            }
        });

        it('Throw error when password lacks capital letter', async () => {
            // Definition
            const invalidData = {
                email: 'test@jtracker.com',
                password: 'testpass123!',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for password without capital letter');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('capital');
            }
        });

        it('Throw error when password lacks symbol', async () => {
            // Definition
            const invalidData = {
                email: 'test@jtracker.com',
                password: 'TestPass123',
                name: 'Test User',
            };

            // Execution and Assertion
            try {
                await service.register(invalidData);
                throw new Error('Should have thrown an error for password without symbol');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('symbol');
            }
        });

        it('Throw error when attempting to register with duplicate email', async () => {
            // Definition
            await service.register(validUserData);

            // Execution and Assertion
            try {
                await service.register(validUserData);
                throw new Error('Should have thrown an error for duplicate email');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('email') || message.includes('already exists') || message.includes('duplicate')).to.be.true;
            }
        });

        it('Generate a valid JWT token with user id and email in payload', async () => {
            // Execution
            const result = await service.register(validUserData);

            // Assertion: Token is valid and contains user data
            const decoded = utils.verifyToken(result.token);
            expect(decoded).to.not.be.null;
            expect(decoded).to.have.property('userId');
            expect(decoded.userId).to.equal(result.user.id);
            expect(decoded).to.have.property('email');
            expect(decoded.email).to.equal(validUserData.email);
        });

        it('Throw error when name is missing', async () => {
            // Definition
            const userDataWithoutName = {
                email: 'noname@jtracker.com',
                password: 'TestPass123!',
            };

            // Execution & Assertion
            try {
                await service.register(userDataWithoutName);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.an('Error');
                expect(error.message.toLowerCase()).to.include('name');
                expect(error.message.toLowerCase()).to.include('required');
            }
        });

        it('Trim email before validation and storage', async () => {
            // Definition: Email with leading and trailing spaces
            const userDataWithSpaces = {
                email: '  trimmed@jtracker.com  ',
                password: 'TestPass123!',
                name: 'Trimmed User',
            };

            // Execution
            const result = await service.register(userDataWithSpaces);

            // Assertion: Email is trimmed and stored correctly
            expect(result.user.email).to.equal('trimmed@jtracker.com');
            expect(result.user.email).to.not.include(' ');
        });

        it('Prevent duplicate registration with email that differs only by whitespace', async () => {
            // Definition: Register with normal email
            await service.register({
                email: 'duplicate@jtracker.com',
                password: 'TestPass123!',
                name: 'Test User',
            });

            // Execution and Assertion: Try to register with same email but with spaces
            try {
                await service.register({
                    email: '  duplicate@jtracker.com  ',
                    password: 'TestPass123!',
                    name: 'Test User',
                });
                throw new Error('Should have thrown an error for duplicate email with spaces');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('email') || message.includes('already exists') || message.includes('duplicate')).to.be.true;
            }
        });
    });

    describe('login', () => {
        let registeredUser;
        const loginCredentials = {
            email: 'login@jtracker.com',
            password: 'LoginPass123!',
        };

        beforeEach(async () => {
            // Register a user before each login test
            const result = await service.register({
                email: loginCredentials.email,
                password: loginCredentials.password,
                name: 'Login Test User',
            });
            registeredUser = result.user;
        });

        it('Login successfully with valid credentials and return user with token', async () => {
            // Execution
            const result = await service.login(loginCredentials);

            // Assertion: Returns user object and token
            expect(result).to.be.an('object');
            expect(result).to.have.property('user');
            expect(result).to.have.property('token');
            expect(result.user.id).to.equal(registeredUser.id);
            expect(result.user.email).to.equal(loginCredentials.email);
            expect(result.user).to.not.have.property('password');
            expect(result.token).to.be.a('string').that.is.not.empty;
        });

        it('Generate a valid JWT token with user id and email in payload', async () => {
            // Execution
            const result = await service.login(loginCredentials);

            // Assertion: Token is valid and contains user data
            const decoded = utils.verifyToken(result.token);
            expect(decoded).to.not.be.null;
            expect(decoded).to.have.property('userId');
            expect(decoded.userId).to.equal(result.user.id);
            expect(decoded).to.have.property('email');
            expect(decoded.email).to.equal(loginCredentials.email);
        });

        it('Throw error when email is missing', async () => {
            // Definition
            const invalidCredentials = {
                password: 'TestPass123!',
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for missing email');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when email is null', async () => {
            // Definition
            const invalidCredentials = {
                email: null,
                password: 'TestPass123!',
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for null email');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when email is empty string', async () => {
            // Definition
            const invalidCredentials = {
                email: '',
                password: 'TestPass123!',
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for empty email');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when password is missing', async () => {
            // Definition
            const invalidCredentials = {
                email: 'test@jtracker.com',
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for missing password');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when password is null', async () => {
            // Definition
            const invalidCredentials = {
                email: 'test@jtracker.com',
                password: null,
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for null password');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when password is empty string', async () => {
            // Definition
            const invalidCredentials = {
                email: 'test@jtracker.com',
                password: '',
            };

            // Execution and Assertion
            try {
                await service.login(invalidCredentials);
                throw new Error('Should have thrown an error for empty password');
            } catch (error) {
                expect(error.message).to.equal('Invalid credentials');
            }
        });

        it('Throw error when user with email does not exist', async () => {
            // Definition
            const nonExistentCredentials = {
                email: 'nonexistent@jtracker.com',
                password: 'SomePass123!',
            };

            // Execution and Assertion
            try {
                await service.login(nonExistentCredentials);
                throw new Error('Should have thrown an error for non-existent user');
            } catch (error) {
                expect(error.message).to.include('Invalid credentials');
            }
        });

        it('Throw error when password is incorrect', async () => {
            // Definition
            const wrongPasswordCredentials = {
                email: loginCredentials.email,
                password: 'WrongPass123!',
            };

            // Execution and Assertion
            try {
                await service.login(wrongPasswordCredentials);
                throw new Error('Should have thrown an error for incorrect password');
            } catch (error) {
                expect(error.message).to.include('Invalid credentials');
            }
        });
    });

    describe('getCurrentUser', () => {
        let registeredUser;
        let validToken;

        beforeEach(async () => {
            // Register a user and get a valid token
            const result = await service.register({
                email: 'current@jtracker.com',
                password: 'CurrentPass123!',
                name: 'Current User',
            });
            registeredUser = result.user;
            validToken = result.token;
        });

        it('Return user successfully with valid token', async () => {
            // Execution
            const user = await service.getCurrentUser(validToken);

            // Assertion: Returns correct user data
            expect(user).to.be.an('object');
            expect(user).to.not.be.null;
            expect(user.id).to.equal(registeredUser.id);
            expect(user.email).to.equal(registeredUser.email);
            expect(user.name).to.equal(registeredUser.name);
            expect(user).to.not.have.property('password');
        });

        it('Throw error when token is missing', async () => {
            // Execution and Assertion
            try {
                await service.getCurrentUser(null);
                throw new Error('Should have thrown an error for missing token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is undefined', async () => {
            // Execution and Assertion
            try {
                await service.getCurrentUser(undefined);
                throw new Error('Should have thrown an error for undefined token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is empty string', async () => {
            // Execution and Assertion
            try {
                await service.getCurrentUser('');
                throw new Error('Should have thrown an error for empty token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is invalid', async () => {
            // Definition
            const invalidToken = 'invalid.token.here';

            // Execution and Assertion
            try {
                await service.getCurrentUser(invalidToken);
                throw new Error('Should have thrown an error for invalid token');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('token') || message.includes('invalid') || message.includes('expired')).to.be.true;
            }
        });

        it('Throw error when token is expired', async () => {
            // Definition: Generate an expired token
            const expiredToken = utils.generateToken(
                { userId: registeredUser.id, email: registeredUser.email },
                { expiresIn: 1 } // 1 second
            );
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Execution and Assertion
            try {
                await service.getCurrentUser(expiredToken);
                throw new Error('Should have thrown an error for expired token');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('token') || message.includes('invalid') || message.includes('expired')).to.be.true;
            }
        });

        it('Throw error when user from token does not exist in database', async () => {
            // Definition: Generate token for non-existent user
            const tokenForNonExistentUser = utils.generateToken({
                userId: 999999,
                email: 'nonexistent@jtracker.com',
            });

            // Execution and Assertion
            try {
                await service.getCurrentUser(tokenForNonExistentUser);
                throw new Error('Should have thrown an error for non-existent user');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('user') || message.includes('not found')).to.be.true;
            }
        });
    });

    describe('logout', () => {
        let registeredUser;
        let validToken;

        beforeEach(async () => {
            // Register a user and get a valid token
            const result = await service.register({
                email: 'logout@jtracker.com',
                password: 'LogoutPass123!',
                name: 'Logout User',
            });
            registeredUser = result.user;
            validToken = result.token;
        });

        it('Logout successfully with valid token', async () => {
            // Execution
            const result = await service.logout(validToken);

            // Assertion: Returns success message
            expect(result).to.be.an('object');
            expect(result).to.have.property('message');
            expect(result.message).to.equal('Logout successful');
        });

        it('Throw error when token is missing', async () => {
            // Execution and Assertion
            try {
                await service.logout(null);
                throw new Error('Should have thrown an error for missing token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is undefined', async () => {
            // Execution and Assertion
            try {
                await service.logout(undefined);
                throw new Error('Should have thrown an error for undefined token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is empty string', async () => {
            // Execution and Assertion
            try {
                await service.logout('');
                throw new Error('Should have thrown an error for empty token');
            } catch (error) {
                expect(error.message.toLowerCase()).to.include('token');
            }
        });

        it('Throw error when token is invalid', async () => {
            // Definition
            const invalidToken = 'invalid.token.here';

            // Execution and Assertion
            try {
                await service.logout(invalidToken);
                throw new Error('Should have thrown an error for invalid token');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('token') || message.includes('invalid') || message.includes('expired')).to.be.true;
            }
        });

        it('Throw error when token is expired', async () => {
            // Definition: Generate an expired token
            const expiredToken = utils.generateToken(
                { userId: registeredUser.id, email: registeredUser.email },
                { expiresIn: 1 } // 1 second
            );
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Execution and Assertion
            try {
                await service.logout(expiredToken);
                throw new Error('Should have thrown an error for expired token');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('token') || message.includes('invalid') || message.includes('expired')).to.be.true;
            }
        });

        it('Throw error when token is missing userId', async () => {
            // Definition: Generate token without userId
            const tokenWithoutUserId = utils.generateToken({
                email: 'test@jtracker.com',
            });

            // Execution and Assertion
            try {
                await service.logout(tokenWithoutUserId);
                throw new Error('Should have thrown an error for token missing userId');
            } catch (error) {
                const message = error.message.toLowerCase();
                expect(message.includes('token') || message.includes('userid')).to.be.true;
            }
        });
    });
});

