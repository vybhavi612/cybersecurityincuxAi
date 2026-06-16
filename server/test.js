const assert = require('assert');

// Set testing port
process.env.PORT = 5001; 
process.env.DATABASE_URL = './server/config/attendance_test.db';

console.log('Starting API integration tests...');

// Import Express server to spin it up programmatically
const app = require('./server');
const BASE_URL = 'http://localhost:5001/api';

// Wait for database migrations and connection setup
setTimeout(async () => {
  try {
    console.log('\n--- Running Test Cases ---\n');

    // TC-AUTH-01: Admin Successful Login
    console.log('TC-AUTH-01: Verifying admin login with valid credentials...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'admin123' })
    });
    
    assert.strictEqual(loginRes.status, 200, 'Admin login should return 200 OK');
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Login response should contain JWT token');
    assert.strictEqual(loginData.user.role, 'admin', 'Login user role should be admin');
    const adminToken = loginData.token;
    console.log('✅ TC-AUTH-01: Passed!');

    // TC-AUTH-02: Failure Login with Wrong Password
    console.log('\nTC-AUTH-02: Verifying login fails with wrong password...');
    const failRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'wrongpassword' })
    });
    assert.strictEqual(failRes.status, 401, 'Invalid login should return 401 Unauthorized');
    console.log('✅ TC-AUTH-02: Passed!');

    // TC-AUTH-03: Access Protected route with no token
    console.log('\nTC-AUTH-03: Accessing protected endpoint without token...');
    const noTokenRes = await fetch(`${BASE_URL}/reports/analytics`);
    assert.strictEqual(noTokenRes.status, 401, 'Access without token should return 401');
    console.log('✅ TC-AUTH-03: Passed!');

    // TC-AUTH-04: Role Guard check (Student token on Teacher/Admin route)
    console.log('\nTC-AUTH-04: Verifying role guard blocks student from accessing admin route...');
    // Log in as student
    const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@portal.com', password: 'student123' })
    });
    const studentData = await studentLogin.json();
    const studentToken = studentData.token;

    // Student calls admin analytics
    const guardRes = await fetch(`${BASE_URL}/reports/analytics`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert.strictEqual(guardRes.status, 403, 'Student calling admin route should return 403 Forbidden');
    console.log('✅ TC-AUTH-04: Passed!');

    // TC-ATT-01: Get roster validation
    console.log('\nTC-ATT-01: Fetching class roster details with admin token...');
    const rosterRes = await fetch(`${BASE_URL}/attendance/class/1?date=2026-06-15&subjectId=1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(rosterRes.status, 200, 'Roster fetch should return 200 OK');
    const roster = await rosterRes.json();
    assert.ok(Array.isArray(roster), 'Roster payload must be an array');
    console.log(`✅ TC-ATT-01: Passed! Fetched roster size: ${roster.length}`);

    // TC-REP-01: Retrieve Defaulters list
    console.log('\nTC-REP-01: Fetching attendance defaulters list (<75%)...');
    const defaultersRes = await fetch(`${BASE_URL}/reports/defaulters`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(defaultersRes.status, 200, 'Defaulters API should return 200 OK');
    const defaulters = await defaultersRes.json();
    assert.ok(Array.isArray(defaulters), 'Defaulters payload must be an array');
    console.log(`✅ TC-REP-01: Passed! Number of defaulters identified: ${defaulters.length}`);

    console.log('\n======================================');
    console.log('  All integration tests passed successfully!  ');
    console.log('======================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test execution failed!');
    console.error(error);
    process.exit(1);
  }
}, 1500);
