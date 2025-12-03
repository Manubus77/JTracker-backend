const { expect } = require('chai');
const prisma = require('../../../utils/prisma'); 
const model = require('../model');
const {app} = require('../../../server.js');
const supertest = require('supertest');
const utils = require('../utils');
const service = require('../service');

describe('Auth Controller (HTTP Layer)', () => {

    //Clear table before each test
    beforeEach(async () => {
        await prisma.user.deleteMany();
    });

    //Cleanup: Disconnect after all tests run
    after(async () => {
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });
   
    //Test user Data
    const testUser = {
        email: 'test@jtracker.com',
        password: 'Testpass123*',
        name: 'Test Jobseeker',
    };

    describe('POST /auth/register', () => {
        // Success case
        it('Should create a new user and return 201 with user and token', async () => {
            // Execution
            const response = await supertest(app).post('/auth/register').send(testUser);
            
            // Assertion
            expect(response.status).to.equal(201);
            expect(response.body).to.have.property('user');
            expect(response.body).to.have.property('token');
            expect(response.body.user).to.have.property('id');
            expect(response.body.user).to.have.property('email');
            expect(response.body.user).to.have.property('name');
            expect(response.body.user).to.have.property('createdAt');
            expect(response.body.user).to.have.property('updatedAt');
            expect(response.body.user.email).to.equal(testUser.email);
            expect(response.body.user.name).to.equal(testUser.name);
            expect(response.body.user).to.not.have.property('password');
            expect(response.body.token).to.be.a('string').that.is.not.empty;
        });

        // Validation errors (400)
        it('Return 400 when email is missing', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({ password: testUser.password, name: testUser.name });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('email');
        });

        it('Return 400 when password is missing', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({ email: testUser.email, name: testUser.name });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('password');
        });

        it('Return 400 when name is missing', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({ email: testUser.email, password: testUser.password });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('name');
        });

        it('Return 400 when email format is invalid', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: 'invalid-email',
                    password: testUser.password,
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('email');
        });

        it('Return 400 when password is too short', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: testUser.email,
                    password: 'Short1!',
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('password');
        });

        it('Return 400 when password is too long', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: testUser.email,
                    password: 'VeryLongPassword123!',
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('password');
        });

        it('Return 400 when password lacks capital letter', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: testUser.email,
                    password: 'testpass123!',
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('password');
        });

        it('Return 400 when password lacks symbol', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: testUser.email,
                    password: 'TestPass123',
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('password');
        });

        it('Return 400 when request body is empty', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({});

            // Assertion
            expect(response.status).to.equal(400);
            expect(response.body).to.have.property('error');
        });

        // Business logic error (409)
        it('Return 409 when email already exists', async () => {
            // Setup: Register first user
            await supertest(app).post('/auth/register').send(testUser);

            // Execution: Try to register again with same email
            const response = await supertest(app)
                .post('/auth/register')
                .send(testUser);

            // Assertion
            expect(response.status).to.equal(409);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('already exists');
        });

        // Security checks (HTTP response format)
        it('Password not in response', async () => {
            // Execution
            const response = await supertest(app).post('/auth/register').send(testUser);

            // Assertion
            expect(response.status).to.equal(201);
            expect(response.body.user).to.not.have.property('password');
            expect(response.body.user).to.not.have.property('passwordHash');
        });

        it('Trim email in response', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: '  test@jtracker.com  ',
                    password: testUser.password,
                    name: testUser.name,
                });

            // Assertion
            expect(response.status).to.equal(201);
            expect(response.body.user.email).to.equal('test@jtracker.com');
        });

        it('Trim name in response', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/register')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    name: '  Test Jobseeker  ',
                });

            // Assertion
            expect(response.status).to.equal(201);
            expect(response.body.user.name).to.equal('Test Jobseeker');
        });
    });

    describe('POST /auth/logout', () => {
        let authToken;

        // Setup: Register and login to get token
        beforeEach(async () => {
            await supertest(app).post('/auth/register').send(testUser);
            const loginResponse = await supertest(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            authToken = loginResponse.body.token;
        });

        // Success case
        it('Logout successfully with valid token', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${authToken}`);

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('message');
            expect(response.body.message).to.equal('Logout successful');
        });

        // Authentication errors (401)
        it('Return 401 when Authorization header is missing', async () => {
            // Execution
            const response = await supertest(app).post('/auth/logout');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token format is invalid (not Bearer)', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', `InvalidFormat ${authToken}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token is empty', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', 'Bearer ');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token is malformed JWT', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', 'Bearer invalid.jwt.token');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('invalid');
        });

        it('Return 401 when token is expired', async () => {
            // Definition: Generate token with 1 second expiration
            const expiredToken = utils.generateToken(
                { userId: 1, email: 'test@example.com' },
                { expiresIn: 1 }
            );

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${expiredToken}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('invalid');
        });

        it('Return 401 when token is missing userId', async () => {
            // Definition: Generate token without userId
            const tokenWithoutUserId = utils.generateToken({
                email: 'test@example.com',
            });

            // Execution
            const response = await supertest(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${tokenWithoutUserId}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('token');
        });
    });

    describe('POST /auth/login', () => {
        // Setup: Register a user first
        beforeEach(async () => {
            await supertest(app).post('/auth/register').send(testUser);
        });

        // Success case
        it('Login successfully with valid credentials and return 200', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('user');
            expect(response.body).to.have.property('token');
            expect(response.body.user).to.have.property('id');
            expect(response.body.user).to.have.property('email');
            expect(response.body.user).to.have.property('name');
            expect(response.body.user).to.not.have.property('password');
            expect(response.body.token).to.be.a('string').that.is.not.empty;
        });

        // Authentication errors (401)
        it('Return 401 when email is missing', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({ password: testUser.password });

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Invalid credentials');
        });

        it('Return 401 when password is missing', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({ email: testUser.email });

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Invalid credentials');
        });

        it('Return 401 when request body is empty', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({});

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Invalid credentials');
        });

        it('Return 401 when email is invalid (user not found)', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password,
                });

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Invalid credentials');
        });

        it('Return 401 when password is wrong', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPass123!',
                });

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Invalid credentials');
        });

        it('Trim email before lookup', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({
                    email: '  test@jtracker.com  ',
                    password: testUser.password,
                });

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('token');
        });

        // Security checks
        it('Password not in response', async () => {
            // Execution
            const response = await supertest(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body.user).to.not.have.property('password');
            expect(response.body.user).to.not.have.property('passwordHash');
        });
    });

    describe('GET /auth/me', () => {
        let authToken;

        // Setup: Register and login to get token
        beforeEach(async () => {
            await supertest(app).post('/auth/register').send(testUser);
            const loginResponse = await supertest(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            authToken = loginResponse.body.token;
        });

        // Success case
        it('Get current user with valid token and return 200', async () => {
            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('id');
            expect(response.body).to.have.property('email');
            expect(response.body).to.have.property('name');
            expect(response.body).to.have.property('createdAt');
            expect(response.body).to.have.property('updatedAt');
            expect(response.body).to.not.have.property('password');
            expect(response.body.email).to.equal(testUser.email);
        });

        // Authentication errors (401)
        it('Return 401 when Authorization header is missing', async () => {
            // Execution
            const response = await supertest(app).get('/auth/me');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token format is invalid (not Bearer)', async () => {
            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', `InvalidFormat ${authToken}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token is empty', async () => {
            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer ');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
        });

        it('Return 401 when token is malformed JWT', async () => {
            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid.jwt.token');

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('invalid');
        });

        it('Return 401 when token is expired', async () => {
            // Definition: Generate token with 1 second expiration
            const expiredToken = utils.generateToken(
                { userId: 1, email: 'test@example.com' },
                { expiresIn: 1 }
            );

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('invalid');
        });

        it('Return 401 when token is missing userId', async () => {
            // Definition: Generate token without userId
            const tokenWithoutUserId = utils.generateToken({
                email: 'test@example.com',
            });

            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${tokenWithoutUserId}`);

            // Assertion
            expect(response.status).to.equal(401);
            expect(response.body).to.have.property('error');
            expect(response.body.error.toLowerCase()).to.include('token');
        });

        // Security checks
        it('Password not in response', async () => {
            // Execution
            const response = await supertest(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            // Assertion
            expect(response.status).to.equal(200);
            expect(response.body).to.not.have.property('password');
            expect(response.body).to.not.have.property('passwordHash');
        });
    });
});