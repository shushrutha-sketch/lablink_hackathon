import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedDatabase } from '../../db/seed.js';

describe('LabLink API Endpoints', () => {
  let studentToken = '';
  let facultyToken = '';
  let adminToken = '';

  beforeAll(() => {
    seedDatabase();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/auth/demo-users should return 6 demo users', async () => {
    const res = await request(app).get('/api/auth/demo-users');
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(6);
  });

  it('POST /api/auth/login should authenticate student and set token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
    expect(res.body.token).toBeDefined();
    studentToken = res.body.token;
  });

  it('POST /api/auth/login should authenticate faculty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.lin@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('faculty');
    facultyToken = res.body.token;
  });

  it('POST /api/auth/login should authenticate admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    adminToken = res.body.token;
  });

  it('GET /api/equipment should return paginated equipment list', async () => {
    const res = await request(app).get('/api/equipment?pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.pagination.total).toBe(20);
  });

  it('GET /api/equipment/1/availability should return 30-min slots', async () => {
    const res = await request(app).get('/api/equipment/1/availability?date=2026-11-25');
    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots[0]).toHaveProperty('status');
  });

  it('POST /api/ai/analyze-project should extract requirements with fallback engine', async () => {
    const res = await request(app)
      .post('/api/ai/analyze-project')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        projectDescription: 'We need to train a PyTorch deep learning vision transformer with high-end GPUs.',
      });

    expect(res.status).toBe(200);
    expect(res.body.requiredCapabilities).toContain('gpu');
    expect(res.body.requiredCapabilities).toContain('pytorch');
    expect(res.body.source).toBeDefined();
  });

  it('POST /api/discovery/recommend should rank matching equipment', async () => {
    const res = await request(app)
      .post('/api/discovery/recommend')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        capabilities: ['gpu', 'cuda', 'deep-learning'],
      });

    expect(res.status).toBe(200);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    // Top recommendation should be H100 or RTX 4090
    expect(res.body.recommendations[0].category).toBe('AI & GPU Compute');
    expect(res.body.recommendations[0].matchPercentage).toBeGreaterThanOrEqual(60);
  });

  it('GET /api/faculty/requests should return department queue', async () => {
    const res = await request(app)
      .get('/api/faculty/requests?status=all')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('GET /api/admin/utilisation should return 30-day stats and flags', async () => {
    const res = await request(app)
      .get('/api/admin/utilisation?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.equipment.length).toBe(20);
    expect(Array.isArray(res.body.underutilised)).toBe(true);
  });
});
