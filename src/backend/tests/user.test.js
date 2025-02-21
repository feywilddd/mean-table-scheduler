import request from 'supertest';
import app from '../app.js';

describe('User API', () => {
  it('should fetch users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
  });
});
