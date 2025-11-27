const { expect } = require('chai');
const prisma = require('../../../utils/prisma'); 
const model = require('../model');

describe.only('Auth Model (Database Layer)', () => {
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
        it('Throw P2011 Null Constraint error when a required field is explicitly null', async () => {
            //Definition
            const nullEmailUser = { 
                email: null, 
                passwordHash: 'hashedpasswordfromservice', 
                name: 'Null User',
            };
            try {
                await model.createUser(nullEmailUser); 
                throw new Error('Null email creation should throw an error, but succeeded.');
            } catch (error) {
                // Expect the CLIENT-SIDE error (P2009/P2000) for a type mismatch.
                const expectedCode = 'P2009'; 
                const expectedMessageSegment = 'Invalid `prisma.user.create()` invocation';
                // 1. Check if the structured code is present (preferred)
                if (error.code) {
                    expect(['P2000', 'P2009']).to.include(error.code, `Expected structured P2009/P2000, got ${error.code}`);
                } else {
                // 2. Fallback: Check for the specific Prisma client validation message
                    expect(error.message).to.include(expectedMessageSegment, `Expected message to contain "${expectedMessageSegment}"`);
                }
            }
        });
    });
    describe('findUserByEmail', () => {
        let createdUser;
        const nonExistentId = 999999;
        //Definition
        beforeEach(async () => {
            createdUser = await model.createUser(testUser); 
        });

    });
});