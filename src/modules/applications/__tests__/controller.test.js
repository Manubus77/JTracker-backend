const { expect } = require('chai');
const supertest = require('supertest');
const prisma = require('../../../utils/prisma');
const tokenBlacklist = require('../../auth/tokenBlacklist');
const { app } = require('../../../server');

describe('Applications Controller (HTTP Layer)', () => {
    const testUser = {
        email: 'applicant@example.com',
        password: 'Testpass123!',
        name: 'Applicant One',
    };

    const buildAuthToken = async () => {
        await supertest(app).post('/auth/register').send(testUser);
        const login = await supertest(app)
            .post('/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        return login.body.token;
    };

    beforeEach(async () => {
        await prisma.jobApplication.deleteMany();
        await prisma.user.deleteMany();
        await tokenBlacklist.clearBlacklist();
    });

    after(async () => {
        await prisma.jobApplication.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('creates an application with default status APPLIED', async () => {
        const token = await buildAuthToken();

        const response = await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Backend Engineer',
                company: 'Acme Corp',
                url: 'https://acme.example/jobs/123',
            });

        expect(response.status).to.equal(201);
        expect(response.body).to.include({
            position: 'Backend Engineer',
            company: 'Acme Corp',
            status: 'APPLIED',
        });
        expect(response.body).to.have.property('id');
        expect(response.body).to.have.property('url', 'https://acme.example/jobs/123');
        expect(response.body).to.have.property('appliedAt');
    });

    it('allows creating with extended status OFFER', async () => {
        const token = await buildAuthToken();

        const response = await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Offer Stage',
                company: 'Lambda',
                url: 'https://lambda.example/job',
                status: 'OFFER',
            });

        expect(response.status).to.equal(201);
        expect(response.body.status).to.equal('OFFER');
    });

    it('lists applications ordered by recency by default', async () => {
        const token = await buildAuthToken();

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'First Role',
                company: 'Alpha',
                url: 'https://alpha.example/job1',
            });

        await new Promise((resolve) => setTimeout(resolve, 10));

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Second Role',
                company: 'Beta',
                url: 'https://beta.example/job2',
            });

        const listResponse = await supertest(app)
            .get('/applications')
            .set('Authorization', `Bearer ${token}`);

        expect(listResponse.status).to.equal(200);
        expect(listResponse.body).to.have.property('items');
        expect(listResponse.body).to.have.property('total');
        expect(listResponse.body.items[0].position).to.equal('Second Role');
        expect(listResponse.body.items[1].position).to.equal('First Role');
    });

    it('filters applications by status', async () => {
        const token = await buildAuthToken();

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Applied Role',
                company: 'Gamma',
                url: 'https://gamma.example/job',
            });

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Interview Role',
                company: 'Delta',
                url: 'https://delta.example/job',
                status: 'INTERVIEWING',
            });

        const listResponse = await supertest(app)
            .get('/applications?status=INTERVIEWING')
            .set('Authorization', `Bearer ${token}`);

        expect(listResponse.status).to.equal(200);
        expect(listResponse.body.items).to.have.length(1);
        expect(listResponse.body.total).to.equal(1);
        expect(listResponse.body.items[0].status).to.equal('INTERVIEWING');
        expect(listResponse.body.items[0].position).to.equal('Interview Role');
    });

    it('sorts applications by status when requested', async () => {
        const token = await buildAuthToken();

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Rejected Role',
                company: 'Zeta',
                url: 'https://zeta.example/job',
                status: 'REJECTED',
            });

        await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Applied Role',
                company: 'Eta',
                url: 'https://eta.example/job',
            });

        const listResponse = await supertest(app)
            .get('/applications?sortBy=status&sortOrder=asc')
            .set('Authorization', `Bearer ${token}`);

        expect(listResponse.status).to.equal(200);
        const statuses = listResponse.body.items.map((item) => item.status);
        expect(statuses).to.deep.equal(['APPLIED', 'REJECTED']);
    });

    it('updates editable fields and keeps URL immutable', async () => {
        const token = await buildAuthToken();

        const created = await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'Old Title',
                company: 'Theta',
                url: 'https://theta.example/job',
            });

        const updateResponse = await supertest(app)
            .patch(`/applications/${created.body.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'New Title',
                company: 'Theta Updated',
                status: 'INTERVIEWING',
            });

        expect(updateResponse.status).to.equal(200);
        expect(updateResponse.body.position).to.equal('New Title');
        expect(updateResponse.body.company).to.equal('Theta Updated');
        expect(updateResponse.body.status).to.equal('INTERVIEWING');
        expect(updateResponse.body.url).to.equal('https://theta.example/job');
    });

    it('deletes an application', async () => {
        const token = await buildAuthToken();

        const created = await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                position: 'To Delete',
                company: 'Iota',
                url: 'https://iota.example/job',
            });

        const deleteResponse = await supertest(app)
            .delete(`/applications/${created.body.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteResponse.status).to.equal(204);

        const listResponse = await supertest(app)
            .get('/applications')
            .set('Authorization', `Bearer ${token}`);
        expect(listResponse.body.items.find((item) => item.id === created.body.id)).to.be
            .undefined;
    });

    it('requires authentication', async () => {
        const response = await supertest(app).post('/applications').send({
            position: 'No Auth',
            company: 'Unauthorized Inc',
            url: 'https://unauth.example/job',
        });

        expect(response.status).to.equal(401);
    });

    it('rejects invalid payloads', async () => {
        const token = await buildAuthToken();

        const response = await supertest(app)
            .post('/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                company: 'No Position Inc',
                url: 'https://nopos.example/job',
            });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error');
    });
});

