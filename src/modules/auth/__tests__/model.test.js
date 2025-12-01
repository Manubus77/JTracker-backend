const { expect } = require('chai');
const prisma = require('../../../utils/prisma'); 
const model = require('../model');

describe('Auth Model (Database Layer)', () => {
    // Defintion: static data
    const testUser = {
        email: 'test@jtracker.com',
        passwordHash: 'hashedpasswordfromservice', 
        name: 'TDD Jobseeker',
    };

    //Clear table before each test
    beforeEach(async () => {
        await prisma.user.deleteMany();
    });

    //Cleanup: Disconnect after all tests run
    after(async () => {
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    describe('createUser', () => {
        it('Create a user and exclude the password from the returned object', async () => {
            // Execution
            const user = await model.createUser(testUser); 

            // Assertion 1: Returned a sanitized object without password
            expect(user).to.be.an('object');
            expect(user).to.have.property('id').that.is.a('number');
            expect(user.email).to.equal(testUser.email);
            expect(user).to.not.have.property('password'); 

            // Assertion 2: Verify the hash was stored correctly
            const userInDb = await prisma.user.findUnique({ where: { id: user.id } });
            expect(userInDb).to.be.an('object');
            expect(userInDb.password).to.equal(testUser.passwordHash); 
        });
        it('Throw P2002 unique constraint error when attempting to create a user with an existing email', async () => {
            //Definition
            await model.createUser(testUser);
            //Excecution and assertion
            try {
                await model.createUser(testUser); 
                throw new Error('Duplicate email creation should throw an error, but succeeded.');
            } catch (error) {
                expect(error.code).to.equal('P2002', 'Expected a unique constraint error (P2002)');
            }
        });
    });
    describe('findUserByEmail', () => {
        let createdUser;
        //Definition
        beforeEach(async () => {
            createdUser = await model.createUser(testUser); 
        });

        it('Find an existing user by email and return correct user data', async () => {
            // Execution
            const foundUser = await model.findUserByEmail(testUser.email);

            // Assertion: Returns a user object with correct data
            expect(foundUser).to.be.an('object');
            expect(foundUser).to.not.be.null;
            expect(foundUser).to.have.property('id').that.is.a('number');
            expect(foundUser.id).to.equal(createdUser.id);
            expect(foundUser.email).to.equal(testUser.email);
            expect(foundUser.name).to.equal(testUser.name);
            expect(foundUser).to.have.property('createdAt');
            expect(foundUser).to.have.property('updatedAt');
        });

        it('Return null when email does not exist', async () => {
            // Definition
            const nonExistentEmail = 'nonexistent@jtracker.com';
            
            // Execution
            const foundUser = await model.findUserByEmail(nonExistentEmail);

            // Assertion: Returns null when user not found
            expect(foundUser).to.be.null;
        });

        it('Exclude password from the returned user object', async () => {
            // Execution
            const foundUser = await model.findUserByEmail(testUser.email);

            // Assertion: Password field is not included in returned object
            expect(foundUser).to.be.an('object');
            expect(foundUser).to.not.have.property('password');
            expect(foundUser).to.not.have.property('passwordHash');
        });

    });

    describe('findUserById', () => {
        let createdUser;
        //Definition
        beforeEach(async () => {
            createdUser = await model.createUser(testUser); 
        });

        it('Find an existing user by id and return correct user data', async () => {
            // Execution
            const foundUser = await model.findUserById(createdUser.id);

            // Assertion: Returns a user object with correct data
            expect(foundUser).to.be.an('object');
            expect(foundUser).to.not.be.null;
            expect(foundUser).to.have.property('id').that.is.a('number');
            expect(foundUser.id).to.equal(createdUser.id);
            expect(foundUser.email).to.equal(testUser.email);
            expect(foundUser.name).to.equal(testUser.name);
            expect(foundUser).to.have.property('createdAt');
            expect(foundUser).to.have.property('updatedAt');
        });

        it('Return null when id does not exist', async () => {
            // Definition
            const nonExistentId = 999999;
            
            // Execution
            const foundUser = await model.findUserById(nonExistentId);

            // Assertion: Returns null when user not found
            expect(foundUser).to.be.null;
        });

        it('Exclude password from the returned user object', async () => {
            // Execution
            const foundUser = await model.findUserById(createdUser.id);

            // Assertion: Password field is not included in returned object
            expect(foundUser).to.be.an('object');
            expect(foundUser).to.not.have.property('password');
            expect(foundUser).to.not.have.property('passwordHash');
        });

    });
});