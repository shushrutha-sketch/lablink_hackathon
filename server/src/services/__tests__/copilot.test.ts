import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedDatabase } from '../../db/seed.js';

describe('Milestone M8: LabLink Copilot Assistant & Grounding Guard', () => {
  let studentToken = '';

  beforeAll(async () => {
    seedDatabase();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@campus.edu', password: 'password123' });
    studentToken = res.body.token;
  });

  it('Copilot: Responds to availability questions with grounded times and availability card', async () => {
    const res = await request(app)
      .post('/api/copilot/message')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        message: 'Is an oscilloscope available tomorrow?',
        sessionId: 'test-session-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toContain('Oscilloscope');
    expect(res.body.cards).toBeDefined();
    expect(Array.isArray(res.body.cards)).toBe(true);

    const availCard = res.body.cards.find((c: any) => c.type === 'availability_card');
    expect(availCard).toBeDefined();
    expect(availCard.data).toHaveProperty('availableTimes');
    expect(Array.isArray(availCard.data.availableTimes)).toBe(true);
  });

  it('Copilot: Responds to substitute questions with compatibility cards', async () => {
    const res = await request(app)
      .post('/api/copilot/message')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        message: 'What can I use instead of the 100MHz oscilloscope?',
        sessionId: 'test-session-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const subCard = res.body.cards.find((c: any) => c.type === 'substitutes_card');
    expect(subCard).toBeDefined();
    expect(subCard.data.substitutes.length).toBeGreaterThan(0);
    expect(subCard.data.substitutes[0]).toHaveProperty('compatibilityScore');
  });

  it('Copilot: Prepares booking proposal with explicit student confirmation requirement', async () => {
    const res = await request(app)
      .post('/api/copilot/message')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        message: 'Help me book the oscilloscope tomorrow at 10:00',
        sessionId: 'test-session-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const propCard = res.body.cards.find((c: any) => c.type === 'booking_proposal_card');
    expect(propCard).toBeDefined();
    expect(propCard.data).toHaveProperty('equipmentId');
    expect(propCard.data).toHaveProperty('startTime');

    // Confirm proposal via explicit student confirmation endpoint
    const confirmRes = await request(app)
      .post('/api/copilot/confirm-booking')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        proposal: propCard.data,
      });

    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.booking.id).toBeDefined();
  });

  it('Copilot: Fetches conversation history for session', async () => {
    const res = await request(app)
      .get('/api/copilot/history?sessionId=test-session-1')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toBeDefined();
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(4); // 2 user messages + 2 assistant replies
  });
});
