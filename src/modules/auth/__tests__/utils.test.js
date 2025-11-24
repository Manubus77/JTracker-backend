const { expect } = require('chai');
const authUtils = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { hashPassword, comparePassword, generateToken, verifyToken } = authUtils;

describe.only('Auth Utils', () => {
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
        it('Returns a non-empty string token', async () => {
            //Definition
            const payload = { userId: 1, email: 'test@example.com' };
            //Execution
            const token = generateToken(payload);
            //Assertion
            expect(token).to.be.a('string');
            expect(token).to.not.be.empty;
        });
    });
});