import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';

// Increase timeout for integration tests with remote database
jest.setTimeout(120000);

describe('Elderly & Caregiver Features (E2E)', () => {
  let app: INestApplication<App>;
  let elderlyToken: string;
  let caregiverToken: string;
  let elderlyProfileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.use(helmet());
    await app.init();

    // Login elderly user
    const elderlyLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'elderly@test.com', password: '123456' })
      .expect(201);
    elderlyToken = elderlyLogin.body.token;

    // Login caregiver user
    const caregiverLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'caregiver@test.com', password: '123456' })
      .expect(201);
    caregiverToken = caregiverLogin.body.token;

    // Get elderly profile ID using the elderly token
    const profileResponse = await request(app.getHttpServer())
      .get('/api/elderly/profile')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .expect(200);
    elderlyProfileId = profileResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // 1. ELDERLY PROFILE
  // ==========================================================================
  describe('Elderly Profile', () => {
    it('GET /api/elderly/profile → 200, returns profile with preferredName, autonomyScore, linkCode', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/elderly/profile')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferredName');
      expect(response.body).toHaveProperty('autonomyScore');
      expect(response.body).toHaveProperty('linkCode');
    });

    it('PATCH /api/elderly/profile → 200, update preferredName', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/elderly/profile')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({ preferredName: 'Maria Test' })
        .expect(200);

      expect(response.body.preferredName).toBe('Maria Test');
    });

    it('GET /api/elderly/profile → 200, verify preferredName changed', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/elderly/profile')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(response.body.preferredName).toBe('Maria Test');
    });

    it('PATCH /api/elderly/profile → 200, restore original preferredName', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/elderly/profile')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .send({ preferredName: 'Maria' })
        .expect(200);

      expect(response.body.preferredName).toBe('Maria');
    });
  });

  // ==========================================================================
  // 2. CAREGIVER - LINKED ELDERLY
  // ==========================================================================
  describe('Caregiver - Linked Elderly', () => {
    it("GET /api/caregiver/elderly → 200, returns array with at least 1 elderly", async () => {
      const response = await request(app.getHttpServer())
        .get('/api/caregiver/elderly')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/caregiver/elderly/:elderlyProfileId → 200, returns elderly details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/caregiver/elderly/${elderlyProfileId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', elderlyProfileId);
    });
  });

  // ==========================================================================
  // 3. MEDICATIONS (VIA CAREGIVER)
  // ==========================================================================
  describe('Medications (via Caregiver)', () => {
    let createdMedicationId: string;

    it('GET /api/elderly/:elderlyProfileId/medications → 200, returns array with medications', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/elderly/${elderlyProfileId}/medications`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/elderly/:elderlyProfileId/medications → 201, create medication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/elderly/${elderlyProfileId}/medications`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          name: 'TestMed',
          dosage: '1 comprimido',
          time: '10:00',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('TestMed');
      expect(response.body.dosage).toBe('1 comprimido');
      expect(response.body.time).toBe('10:00');
      createdMedicationId = response.body.id;
    });

    it('PATCH /api/elderly/:elderlyProfileId/medications/:id → 200, update medication', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          `/api/elderly/${elderlyProfileId}/medications/${createdMedicationId}`,
        )
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ dosage: '2 comprimidos' })
        .expect(200);

      expect(response.body.dosage).toBe('2 comprimidos');
    });

    it('DELETE /api/elderly/:elderlyProfileId/medications/:id → 200, delete medication', async () => {
      await request(app.getHttpServer())
        .delete(
          `/api/elderly/${elderlyProfileId}/medications/${createdMedicationId}`,
        )
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);
    });
  });

  // ==========================================================================
  // 4. MEDICATIONS - ELDERLY PERSPECTIVE
  // ==========================================================================
  describe('Medications - Elderly Perspective', () => {
    it("GET /api/medications/today → 200, returns today's medications", async () => {
      const response = await request(app.getHttpServer())
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  // ==========================================================================
  // 5. CONTACTS (VIA CAREGIVER)
  // ==========================================================================
  describe('Contacts (via Caregiver)', () => {
    let createdContactId: string;

    it('GET /api/elderly/:elderlyProfileId/contacts → 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/elderly/${elderlyProfileId}/contacts`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('POST /api/elderly/:elderlyProfileId/contacts → 201, create contact', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/elderly/${elderlyProfileId}/contacts`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          name: 'Test Contact',
          phone: '+5511999999999',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Contact');
      expect(response.body.phone).toBe('+5511999999999');
      createdContactId = response.body.id;
    });

    it('PATCH /api/elderly/:elderlyProfileId/contacts/:id → 200, update contact', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/elderly/${elderlyProfileId}/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ name: 'Test Contact Updated' })
        .expect(200);

      expect(response.body.name).toBe('Test Contact Updated');
    });

    it('DELETE /api/elderly/:elderlyProfileId/contacts/:id → 200, delete contact', async () => {
      await request(app.getHttpServer())
        .delete(`/api/elderly/${elderlyProfileId}/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);
    });
  });

  // ==========================================================================
  // 6. AGENDA (VIA CAREGIVER)
  // ==========================================================================
  describe('Agenda (via Caregiver)', () => {
    let createdEventId: string;

    // Get tomorrow's date in ISO format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const tomorrowISO = tomorrow.toISOString();

    it('GET /api/elderly/:elderlyProfileId/agenda → 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/elderly/${elderlyProfileId}/agenda`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('POST /api/elderly/:elderlyProfileId/agenda → 201, create event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/elderly/${elderlyProfileId}/agenda`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          description: 'Test Event',
          dateTime: tomorrowISO,
          reminder: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.description).toBe('Test Event');
      expect(response.body.reminder).toBe(true);
      createdEventId = response.body.id;
    });

    it('PATCH /api/elderly/:elderlyProfileId/agenda/:id → 200, update event', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/elderly/${elderlyProfileId}/agenda/${createdEventId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ description: 'Test Event Updated' })
        .expect(200);

      expect(response.body.description).toBe('Test Event Updated');
    });

    it('DELETE /api/elderly/:elderlyProfileId/agenda/:id → 200, delete event', async () => {
      await request(app.getHttpServer())
        .delete(`/api/elderly/${elderlyProfileId}/agenda/${createdEventId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);
    });
  });

  // ==========================================================================
  // 7. ELDERLY-SPECIFIC ENDPOINTS
  // ==========================================================================
  describe('Elderly-Specific Endpoints', () => {
    it("GET /api/agenda/today → 200, returns today's agenda", async () => {
      const response = await request(app.getHttpServer())
        .get('/api/agenda/today')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('GET /api/contacts → 200, returns contacts for elderly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/contacts')
        .set('Authorization', `Bearer ${elderlyToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });
});
