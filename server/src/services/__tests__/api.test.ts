import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedDatabase } from '../../db/seed.js';
import { checkImages } from '../../../scripts/check-images.js';

describe('LabLink Milestone M2: Data, Auth, and Image Integrity', () => {
  let studentToken = '';
  let facultyToken = '';
  let adminToken = '';

  beforeAll(() => {
    seedDatabase();
  });

  it('M2.1 checkImages verifies all 14 equipment images, alt texts, and manifest entries', () => {
    const check = checkImages();
    expect(check.success).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it('M2.2 GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('M2.3 GET /api/auth/demo-users should return 6 demo users (Asha, Ravi, Meera, Dr. Rao, Prof. Sen, Elena)', async () => {
    const res = await request(app).get('/api/auth/demo-users');
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(6);
    const emails = res.body.users.map((u: any) => u.email);
    expect(emails).toContain('asha@campus.edu');
    expect(emails).toContain('ravi@campus.edu');
    expect(emails).toContain('meera@campus.edu');
    expect(emails).toContain('dr.rao@campus.edu');
    expect(emails).toContain('admin@campus.edu');
  });

  it('M2.4 POST /api/auth/login authenticates student Asha and sets token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
    expect(res.body.token).toBeDefined();
    studentToken = res.body.token;
  });

  it('M2.5 POST /api/auth/login authenticates faculty Dr. Rao', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.rao@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('faculty');
    facultyToken = res.body.token;
  });

  it('M2.6 POST /api/auth/login authenticates admin Elena', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    adminToken = res.body.token;
  });

  it('M2.7 RBAC: unauthenticated call to /api/faculty/requests returns 401', async () => {
    const res = await request(app).get('/api/faculty/requests');
    expect(res.status).toBe(401);
  });

  it('M2.8 RBAC: student calling faculty-only endpoint returns 403', async () => {
    const res = await request(app)
      .get('/api/faculty/requests')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('M2.9 Static media serving: GET /media/equipment/dso-100mhz-4ch.png returns 200 with nosniff header', async () => {
    const res = await request(app).get('/media/equipment/dso-100mhz-4ch.png');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body.length).toBeGreaterThan(0);
  });
});
