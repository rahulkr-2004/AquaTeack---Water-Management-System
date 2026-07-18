import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users over 30 seconds
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
};

export default function () {
  const url = 'http://localhost:8080/api/water-usage';
  
  // Create a realistic-looking payload
  const payload = JSON.stringify({
    householdId: Math.floor(Math.random() * 10) + 1, // Random household ID between 1 and 10
    consumptionLiters: Math.floor(Math.random() * 50) + 10, // Random consumption between 10 and 60
    date: new Date().toISOString().split('T')[0]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer YOUR_JWT_TOKEN' // Add a valid token if testing secured endpoint
    },
  };

  const res = http.post(url, payload, params);
  
  // Verify response
  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'transaction time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
