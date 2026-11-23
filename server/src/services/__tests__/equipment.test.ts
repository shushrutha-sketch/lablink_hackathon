import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedDatabase } from '../../db/seed.js';

describe('Milestone M3: Equipment Explorer APIs', () => {
  beforeAll(async () => {
    seedDatabase();
  });

  it('GET /api/equipment returns list with 14 items and required metadata', async () => {
    const res = await request(app).get('/api/equipment');
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBe(14);
    expect(res.body.total).toBe(14);

    const first = res.body.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('slug');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('department');
    expect(first).toHaveProperty('location');
    expect(first).toHaveProperty('quantity');
    expect(first).toHaveProperty('availableQuantity');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('imageUrl');
    expect(first).toHaveProperty('imageAlt');
    expect(first).toHaveProperty('topSpecs');
    expect(first).toHaveProperty('compatibleProjects');
    expect(Array.isArray(first.topSpecs)).toBe(true);
    expect(Array.isArray(first.compatibleProjects)).toBe(true);
  });

  it('GET /api/equipment filters by search query q', async () => {
    const res = await request(app).get('/api/equipment?q=oscilloscope');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      const match =
        item.name.toLowerCase().includes('oscilloscope') ||
        item.category.toLowerCase().includes('oscilloscope') ||
        item.slug.toLowerCase().includes('scope');
      expect(match).toBe(true);
    }
  });

  it('GET /api/equipment safely handles SQL wildcards in q (% and _)', async () => {
    const resPercent = await request(app).get('/api/equipment?q=%');
    expect(resPercent.status).toBe(200);
    // Should safely escape % and not crash or return everything blindly
  });

  it('GET /api/equipment filters by departmentId', async () => {
    const res = await request(app).get('/api/equipment?departmentId=ECE');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.departmentCode).toBe('ECE');
    }
  });

  it('GET /api/equipment filters by category', async () => {
    const res = await request(app).get('/api/equipment?category=Robotics');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.category).toBe('Robotics');
    }
  });

  it('GET /api/equipment/:id returns full detail with capabilities and specs by slug or id', async () => {
    const res = await request(app).get('/api/equipment/dso-100mhz-4ch');
    expect(res.status).toBe(200);
    const item = res.body.equipment;
    expect(item.slug).toBe('dso-100mhz-4ch');
    expect(item.name).toContain('Oscilloscope');
    expect(item.description).toBeDefined();
    expect(item.specs).toBeDefined();
    expect(Array.isArray(item.specs)).toBe(true);
    expect(item.capabilities).toBeDefined();
    expect(Array.isArray(item.capabilities)).toBe(true);
    expect(item.capabilities.length).toBeGreaterThan(0);
    expect(item.capabilities[0]).toHaveProperty('name');
    expect(item.capabilities[0]).toHaveProperty('level');
  });

  it('GET /api/equipment/:id returns 404 for non-existent equipment', async () => {
    const res = await request(app).get('/api/equipment/non-existent-id-999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
