import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { seedDatabase } from '../../db/seed.js';

describe('Milestones M4 & M5: Booking, Fair Allocation, Matchmaker & Substitution', () => {
  let studentToken = '';
  let facultyToken = '';

  beforeAll(async () => {
    seedDatabase();

    // Login Asha (Student)
    const sRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@campus.edu', password: 'password123' });
    studentToken = sRes.body.token;

    // Login Dr. Rao (Faculty)
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.rao@campus.edu', password: 'password123' });
    facultyToken = fRes.body.token;
  });

  describe('Milestone M4: Intelligent Booking & Fair Allocation', () => {
    it('Rejects booking outside lab hours (e.g. 08:00 start)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId: 'dso-100mhz-4ch',
          projectTitle: 'Early Morning Probing',
          projectDescription: 'Probing oscillator circuit before lab opens',
          projectDeadline: '2026-12-10',
          startTime: '2026-12-01T08:00',
          endTime: '2026-12-01T09:30',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OUTSIDE_LAB_HOURS');
    });

    it('Rejects booking when deadline is before reservation date', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId: 'dso-100mhz-4ch',
          projectTitle: 'Past Deadline Probing',
          projectDescription: 'Testing after submission',
          projectDeadline: '2026-11-20',
          startTime: '2026-12-01T10:00',
          endTime: '2026-12-01T12:00',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DEADLINE');
    });

    it('Rejects booking with duration outside equipment session limits', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId: 'dso-100mhz-4ch',
          projectTitle: 'Micro Probing Session',
          projectDescription: 'Quick 10 minute check',
          projectDeadline: '2026-12-10',
          startTime: '2026-12-01T10:00',
          endTime: '2026-12-01T10:10', // 10 minutes < 30 min limit
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DURATION');
    });

    it('Successfully creates booking request within valid parameters and returns score', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          equipmentId: 'dso-100mhz-4ch',
          projectTitle: 'FPGA Clock Jitter Measurement',
          projectDescription: 'High precision 100MHz clock signal measurement and jitter characterization.',
          projectDeadline: '2026-12-05',
          startTime: '2026-12-02T10:00',
          endTime: '2026-12-02T12:00',
          requiredCapabilities: ['signal-analysis'],
        });

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.id).toBeDefined();
      expect(res.body.request.priorityScore).toBeGreaterThan(0);
      expect(res.body.request.scoreBreakdown).toBeDefined();
      expect(res.body.request.scoreBreakdown.total).toBe(res.body.request.priorityScore);
    });

    it('Faculty views allocation ranking for competing requests on the same equipment', async () => {
      // Find the pending requests on DSO seeded in seed.ts
      const res = await request(app)
        .get('/api/faculty/requests?status=pending')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests.length).toBeGreaterThan(0);

      const dsoReq = res.body.requests.find((r: any) => r.equipment_name.includes('Oscilloscope'));
      expect(dsoReq).toBeDefined();

      // Get allocation analysis for this request
      const allocRes = await request(app)
        .get(`/api/faculty/requests/${dsoReq.id}/allocation`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(allocRes.status).toBe(200);
      expect(allocRes.body).toHaveProperty('competitors');
      expect(allocRes.body).toHaveProperty('ranking');
      expect(Array.isArray(allocRes.body.competitors)).toBe(true);
      expect(allocRes.body.competitors.length).toBeGreaterThan(0);
      expect(allocRes.body.ranking[0].recommendation).toBe('approve');
    });

    it('Faculty decision: Approving non-recommended request without override reason returns 400', async () => {
      // Find ranked competitors
      const pendingRes = await request(app)
        .get('/api/faculty/requests?status=pending')
        .set('Authorization', `Bearer ${facultyToken}`);

      const dsoReqs = pendingRes.body.requests.filter((r: any) => r.equipment_name.includes('Oscilloscope'));
      if (dsoReqs.length >= 2) {
        // Let's get allocation for the first DSO request to find the non-winner
        const alloc = await request(app)
          .get(`/api/faculty/requests/${dsoReqs[0].id}/allocation`)
          .set('Authorization', `Bearer ${facultyToken}`);

        const nonWinner = alloc.body.ranking.find((r: any) => r.recommendation === 'alternative');
        if (nonWinner) {
          const overrideAttempt = await request(app)
            .post(`/api/faculty/requests/${nonWinner.id}/decision`)
            .set('Authorization', `Bearer ${facultyToken}`)
            .send({
              action: 'approve',
              // No override reason provided!
            });
          expect(overrideAttempt.status).toBe(400);
          expect(overrideAttempt.body.error.code).toBe('OVERRIDE_REASON_REQUIRED');
        }
      }
    });

    it('Faculty decision: Approving non-recommended request WITH override reason succeeds', async () => {
      const pendingRes = await request(app)
        .get('/api/faculty/requests?status=pending')
        .set('Authorization', `Bearer ${facultyToken}`);

      const dsoReqs = pendingRes.body.requests.filter((r: any) => r.equipment_name.includes('Oscilloscope'));
      if (dsoReqs.length >= 2) {
        const alloc = await request(app)
          .get(`/api/faculty/requests/${dsoReqs[0].id}/allocation`)
          .set('Authorization', `Bearer ${facultyToken}`);

        const nonWinner = alloc.body.ranking.find((r: any) => r.recommendation === 'alternative');
        if (nonWinner) {
          const overrideSuccess = await request(app)
            .post(`/api/faculty/requests/${nonWinner.id}/decision`)
            .set('Authorization', `Bearer ${facultyToken}`)
            .send({
              action: 'approve',
              comment: 'Approved due to urgent paper presentation deadline confirmed with supervisor.',
            });
          expect(overrideSuccess.status).toBe(200);
          expect(overrideSuccess.body.success).toBe(true);
        }
      }
    });
  });

  describe('Milestone M5: Matchmaker & Smart Substitution', () => {
    it('POST /api/matchmaker/analyze extracts requirements and recommends equipment', async () => {
      const res = await request(app)
        .post('/api/matchmaker/analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          projectDescription: 'I want to build a smart agriculture IoT node with ESP32, soil moisture sensor, and cloud connectivity.',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projectSummary');
      expect(res.body).toHaveProperty('requiredCapabilities');
      expect(res.body).toHaveProperty('mustHaveRequirements');
      expect(res.body).toHaveProperty('recommendedEquipment');
      expect(res.body).toHaveProperty('coveragePercentage');
      expect(res.body).toHaveProperty('partsToBring');
      expect(Array.isArray(res.body.recommendedEquipment)).toBe(true);
      expect(res.body.recommendedEquipment.length).toBeGreaterThan(0);

      // Check first recommended item structure
      const item = res.body.recommendedEquipment[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('imageUrl');
      expect(item).toHaveProperty('matchPercentage');
      expect(item).toHaveProperty('matchLevel');
    });

    it('GET /api/equipment/:id/substitutes finds compatible alternatives with compatibility score', async () => {
      const res = await request(app)
        .get('/api/equipment/dso-100mhz-4ch/substitutes')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('requestedEquipment');
      expect(res.body).toHaveProperty('substitutes');
      expect(Array.isArray(res.body.substitutes)).toBe(true);
      expect(res.body.substitutes.length).toBeGreaterThan(0);

      const sub = res.body.substitutes[0];
      expect(sub).toHaveProperty('id');
      expect(sub).toHaveProperty('name');
      expect(sub).toHaveProperty('compatibilityScore');
      expect(sub.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(sub.compatibilityScore).toBeLessThanOrEqual(100);
      expect(sub).toHaveProperty('specDifferences');
      expect(sub).toHaveProperty('limitations');
      expect(Array.isArray(sub.limitations)).toBe(true);
    });
  });
});
