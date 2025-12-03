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
        it('Should create a new user', async () => {
            //Execution
            const response = await supertest(app).post('/auth/register').send(testUser);
            //Assertion
            expect(response.status).to.equal(201);
            expect(response.body.user).to.have.property('id');
            expect(response.body.user.email).to.equal(testUser.email);
            expect(response.body.user.name).to.equal(testUser.name);
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
});