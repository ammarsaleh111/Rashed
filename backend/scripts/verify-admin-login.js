import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';

const requiredEnv = ['ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const run = async () => {
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  const loginPayload = await loginResponse.json();

  if (!loginResponse.ok) {
    console.error('LOGIN_FAILED');
    console.error(JSON.stringify(loginPayload, null, 2));
    process.exit(1);
  }

  const token = loginPayload?.data?.token;

  const profileResponse = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const profilePayload = await profileResponse.json();

  if (!profileResponse.ok) {
    console.error('PROFILE_FETCH_FAILED');
    console.error(JSON.stringify(profilePayload, null, 2));
    process.exit(1);
  }

  console.log(`LOGIN_STATUS:${loginResponse.status}`);
  console.log(`PROFILE_STATUS:${profileResponse.status}`);
  console.log(`ADMIN_EMAIL:${profilePayload?.data?.email || ''}`);
  console.log(`ADMIN_ROLE:${profilePayload?.data?.role || ''}`);
};

run().catch((error) => {
  console.error('ADMIN_VERIFICATION_FAILED');
  console.error(error.message);
  process.exit(1);
});