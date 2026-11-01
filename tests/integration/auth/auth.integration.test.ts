import 'reflect-metadata'
import {randomUUID} from 'crypto';
import request from 'supertest';
import {emailStub,EmailStub} from '../../helpers/email-stub';
import {truncateAll} from '../../helpers/db';

jest.mock("../../../src/lib/email/init", () => ({
    emailProvider: emailStub
}))

import {createApp} from '../../../src/app';
import {db} from '../../../src/lib/knex/knex';
import {hashPassword} from '../../../src/app/auth/utils';

const app = createApp();

describe('POST /api/auth/forget-password', () => {
    beforeEach(async () => {
        await truncateAll();
        emailStub.reset();
    });

    it('persists the user and sends a reset password email', async () => {
        const now = new Date();
        await db('users').insert({
            email: 'test@test.com',
            phone: "0101010101",
            name: 'Test User',
            password_hash: await hashPassword('StrongPassword123@'),
            system_role: 'customer',
            created_at: now,
            updated_at: now
        })

        // unique key per run: idempotency responses are cached in Redis, which truncateAll() doesn't clear
        const res = await request(app).post('/api/auth/forget-password').set('idempotency-key', randomUUID()).send({email: 'test@test.com'})
        expect(res.statusCode).toBe(200);
        const resetCount = await db('password_resets').count<{n: string}>('* as n').first();
        expect(Number(resetCount?.n)).toBe(1);
        expect(emailStub.sent[0].to).toBe('test@test.com');
    });
});    