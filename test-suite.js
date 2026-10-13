import assert from 'assert';

const BASE_URL = 'http://localhost:3001/api';
let cookieHeader = '';

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookieHeader = setCookie.split(';')[0];
  }

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('=== Starting Pranks Automated Verification Suite ===\n');

  // Test 1: Check Auth Status
  console.log('[TEST 1] Check Auth Status & Setup Requirement');
  const statusRes = await request('/auth/status');
  assert.strictEqual(statusRes.status, 200);
  console.log('  -> Status:', statusRes.data);

  // Test 2: Initial Admin Setup
  console.log('\n[TEST 2] Initial Admin Setup');
  if (!statusRes.data.hasAdmin) {
    const setupRes = await request('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });
    assert.strictEqual(setupRes.status, 200, `Setup failed: ${JSON.stringify(setupRes.data)}`);
    console.log('  -> Admin user created successfully.');
  } else {
    console.log('  -> Admin already exists. Proceeding to login test.');
    // Login with credentials
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });
    assert.strictEqual(loginRes.status, 200, `Login failed: ${JSON.stringify(loginRes.data)}`);
    console.log('  -> Admin authenticated successfully.');
  }

  // Test 3: Unauthenticated Protection on Protected APIs
  console.log('\n[TEST 3] Verify Protected API Access Control (Unauthorized Rejection)');
  const unauthRes = await fetch(`${BASE_URL}/admin/stats`, { method: 'GET' });
  assert.strictEqual(unauthRes.status, 401, 'Protected endpoint should return 401 for anonymous client');
  console.log('  -> Confirmed 401 rejection for unauthenticated /admin/stats');

  // Test 4: Authenticated Admin Stats
  console.log('\n[TEST 4] Authenticated Access to Admin Stats');
  const adminStatsRes = await request('/admin/stats');
  assert.strictEqual(adminStatsRes.status, 200);
  assert(adminStatsRes.data.totalNotes >= 5, 'Should have at least 5 notes seeded');
  console.log(`  -> Stats: ${adminStatsRes.data.totalNotes} notes, ${adminStatsRes.data.totalFolders} folders`);

  // Test 5: Verify Folders Hierarchy & Top-Level Folders
  console.log('\n[TEST 5] Verify Folder Hierarchy Tree');
  const foldersRes = await request('/folders');
  assert.strictEqual(foldersRes.status, 200);
  const folderNames = foldersRes.data.tree.map(f => f.name);
  console.log('  -> Folders tree roots:', folderNames);
  assert(folderNames.includes('ctf'), 'Missing ctf folder');
  assert(folderNames.includes('cyber notes'), 'Missing cyber notes folder');

  // Test 6: Verify Index Note Content (Capture.JPG replica)
  console.log('\n[TEST 6] Verify Index Note (Screenshot Content)');
  const indexRes = await request('/notes/index');
  assert.strictEqual(indexRes.status, 200);
  assert(indexRes.data.content.includes('Centralized Hacking Techniques'), 'Missing header');
  assert(indexRes.data.content.includes('Active Directory'), 'Missing AD category');
  assert(indexRes.data.content.includes('Project Overview'), 'Missing Project Overview');
  console.log('  -> Index note title:', indexRes.data.title);
  console.log('  -> Index reading time:', indexRes.data.reading_time);

  // Test 7: Verify Graph Network Data
  console.log('\n[TEST 7] Verify Graph Network Generation from Real Note Links');
  const graphRes = await request('/notes/graph/network');
  assert.strictEqual(graphRes.status, 200);
  console.log(`  -> Graph Nodes: ${graphRes.data.nodes.length}, Edges: ${graphRes.data.links.length}`);
  assert(graphRes.data.nodes.length >= 5, 'Expected at least 5 nodes');
  assert(graphRes.data.links.length > 0, 'Expected real note relationships');

  // Test 8: Instant Search with Snippets
  console.log('\n[TEST 8] Instant Search Test');
  const searchRes = await request('/search?q=Kerberoasting');
  assert.strictEqual(searchRes.status, 200);
  assert(searchRes.data.length > 0, 'Expected search results for Kerberoasting');
  console.log(`  -> Found ${searchRes.data.length} matches for 'Kerberoasting'. First match: "${searchRes.data[0].title}"`);
  console.log('  -> Snippet preview:', searchRes.data[0].snippet);

  // Test 9: Create, Update, and Trash Note Lifecycle
  console.log('\n[TEST 9] Note Lifecycle (Create -> Link -> Update -> Trash -> Restore)');
  const createRes = await request('/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Automated Test Playbook',
      folder_id: 'cyber-notes',
      content: '# Automated Test Playbook\n\nTesting link to [[index]] and [[Active Directory Attack Paths]].',
      status: 'published',
      tags: ['test', 'automation'],
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createdId = createRes.data.note.id;
  console.log('  -> Created test note:', createdId);

  // Verify Graph recalculated
  const graphUpdated = await request('/notes/graph/network');
  const hasNewNode = graphUpdated.data.nodes.some(n => n.id === createdId);
  assert(hasNewNode, 'Graph network should contain newly created note');
  console.log('  -> Graph view dynamically recalculated relationships.');

  // Trash Note
  const trashRes = await request(`/notes/${createdId}`, { method: 'DELETE' });
  assert.strictEqual(trashRes.status, 200);
  console.log('  -> Note moved to trash safely.');

  // Restore Note
  const restoreRes = await request(`/notes/${createdId}/restore`, { method: 'POST' });
  assert.strictEqual(restoreRes.status, 200);
  console.log('  -> Note restored successfully.');

  // Clean up permanent delete
  await request(`/notes/${createdId}?permanent=true`, { method: 'DELETE' });
  console.log('  -> Cleaned up test note permanently.');

  // Test 10: Public Privacy Isolation Test (Draft Note cannot be seen publicly)
  console.log('\n[TEST 10] Privacy & Access Control: Draft Isolation Test');
  const draftCreateRes = await request('/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Secret Unreleased Exploit',
      content: '# 0day exploit draft',
      status: 'draft',
    }),
  });
  const draftNoteId = draftCreateRes.data.note.id;

  // Unauthenticated client request
  const publicFetchRes = await fetch(`${BASE_URL}/notes/${draftNoteId}`);
  assert.strictEqual(publicFetchRes.status, 403, 'Public visitors MUST NOT access draft notes');
  console.log('  -> Confirmed 403 Access Denied for unauthenticated visitors to draft notes.');

  // Cleanup draft note
  await request(`/notes/${draftNoteId}?permanent=true`, { method: 'DELETE' });

  console.log('\n=== ALL 10 VERIFICATION SUITES PASSED FLAWLESSLY ===');
}

runTests().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
