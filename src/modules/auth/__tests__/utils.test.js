const { expect } = require('chai');
const authUtils = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { hashPassword, comparePassword, generateToken, verifyToken } = authUtils;

describe('Auth Utils', () => {
    describe('hashPassword', () => {
        it('returns a string hash', async () => {
            //Definition
            const password = 'testpassword';
            //Execution
            const hash = await hashPassword(password);
            //Assertion
            expect(hash).to.be.a('string');
        });

        it('does not return the original password', async () => {
            //Definition
            const password = 'testpassword';
            //Execution
            const hash = await hashPassword(password);
            //Assertion
            expect(hash).to.not.equal(password);
        });

        it('can be verified with bcrypt', async () => {
            //Definition
            const password = 'testpassword';
            //Execution
            const hash = await hashPassword(password);
            const result = await bcrypt.compare(password, hash);
            //Assertion
            expect(result).to.be.true;
        });

        it('produces a different hash each time', async () => {
            //Definition
            const password = 'testpassword';
            //Execution
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            //Assertion
            expect(hash1).to.not.equal(hash2);
        });
    });
    describe('comparePassword', () => {
        it('compares a password with a hash', async () => {
            //Definition
            const password = 'testpassword';
            const hash = await hashPassword(password);
            //Execution
            const result = await comparePassword(password, hash);
            //Assertion
            expect(result).to.be.true;
        });
        it('compares a wrong password with hash and return false', async () => {
            //Definition
            const password = 'testpassword';
            const wrongPassword = 'wrongpass';
            const hash = await hashPassword(password);
            //Execution
            const result = await comparePassword(wrongPassword, hash);
            //Assertion
            expect(result).to.be.false;
        });
        it('returns false if the password is empty', async () => {
            //Definition
            const password = 'testpassword';
            const hash = await hashPassword(password);
            //Execution
            const result = await comparePassword('', hash);
            //Assertion
            expect(result).to.be.false;
        });
        it('returns false if the password is null', async () => {
            //Definition
            const password = 'testpassword';
            const hash = await hashPassword(password);
            //Executuon
            const result = await comparePassword(null, hash);
            //Assertion
            expect(result).to.be.false;
        });
    });
    describe('generateToken', () => {
        it('Returns a non-empty string token', () => {
            //Definition
            const payload = { userId: 1, email: 'payload@example.com' };
            //Execution
            const token = generateToken(payload);
            //Assertion
            expect(token).to.be.a('string');
            expect(token).to.not.be.empty;
        });
        it('Verifies the token becomes invalid after its expiration time', async () => {
             //Definition
             const payload = {userId: 1,
                              email: 'payload@example.com',
                              name: 'payload tester'};
            const token = generateToken(payload, {expiresIn: 1});
            //Execution
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            //Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1500));
            //Assertion
            expect(() => jwt.verify(token, process.env.JWT_SECRET)).to.throw(jwt.TokenExpiredError);
        });
        it('Throws an error if JTW secret is missing', () => {
            // Backup original secret
            const originalSecret = process.env.JWT_SECRET;
            // Temporarily remove the secret
            process.env.JWT_SECRET = '';
            // Definition
            const payload = { userId: 1 };
            // Execution + Assertion
            expect(() => generateToken(payload)).to.throw('JWT_SECRET is not configured');
            // Restore secret
            process.env.JWT_SECRET = originalSecret;
        });
        it('Throws an error for empty payloads', () => {
            // Definition
            const payload = {};
            // Execution + Assertion
            expect(() => generateToken(payload)).to.throw('Payload cannot be empty, null or undefined');
            expect(() => generateToken(null)).to.throw('Payload cannot be empty, null or undefined');
            expect(() => generateToken(undefined)).to.throw('Payload cannot be empty, null or undefined');
        });
        it('Generates different tokens from different payloads', () => {
            // Definition
            const payloadA = { userId: 1, email: 'a@example.com' };
            const payloadB = { userId: 2, email: 'b@example.com' };
            // Execution
            const tokenA = generateToken(payloadA);
            const tokenB = generateToken(payloadB);
            // Assertion
            expect(tokenA).to.not.equal(tokenB);
        });
        it('Generates different tokens from identical payloads (iat uniqueness)', async () => {
            // Definition
            const payload = { userId: 1, email: 'payload@example.com' };
            // Execution
            const tokenA = generateToken(payload);
            // Wait 5 second to guarantee a different iat timestamp
            await new Promise(res => setTimeout(res, 2000));
            const tokenB = generateToken(payload);
            // Assertion
            expect(tokenA).to.not.equal(tokenB);
        });
        it('Generates a token with the correct JWT structure', () => {
            // Definition
            const payload = { userId: 1 };
            // Execution
            const token = generateToken(payload);
            // Assertion
            const parts = token.split('.');
            expect(parts).to.have.lengthOf(3); // header . payload . signature
        });
    });
    describe('verifyToken', () => {
        it('Returns the decoded payload for a valid token', () => {
            //Definition
            const payload = { userId: 1, email: 'payload@example.com' };
            //Execution
            const token = generateToken(payload);
            const decoded = verifyToken(token);
            //Assertion
            const expected = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded).to.deep.equal(expected);
        });
        it('Returns null for an invalid token', () => {
            //Definition
            const invalidToken = 'abc.def.ghi';
            //Execution
            const decoded = verifyToken(invalidToken);
            //Assertion
            expect(decoded).to.be.null;
        });
        it('Returns null if the token was signed with a different secret', () => {
            //Definition
            const wrongToken = jwt.sign(
                { userId: 1 },
                'WRONG_SECRET');
            //Execution
            const decoded = verifyToken(wrongToken);
            //Assertion
            expect(decoded).to.be.null;
        });
        it('Returns null for an expired token', async () => {
            //Definition
            const token = generateToken({ userId: 1 }, { expiresIn: 1 });
            // Wait for expiration
            await new Promise((resolve) => setTimeout(resolve, 1500));
            //Execution
            const decoded = verifyToken(token);
            //Assertion
            expect(decoded).to.be.null;
        });
    });
});