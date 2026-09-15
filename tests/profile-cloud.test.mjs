import test from 'node:test';
import assert from 'node:assert/strict';
import { profileUsername, profileAuthIdentifier } from '../app/profile-username.ts';
import { saveCloudProfile, loadCloudProfile } from '../app/profile-cloud.ts';

test('usernames map consistently across devices and cannot escape the internal identifier', () => {
  assert.equal(profileUsername(' Example_123 '), 'example_123');
  assert.equal(profileAuthIdentifier('EXAMPLE_123'), profileAuthIdentifier('example_123'));
  for (const input of ['ab', 'a'.repeat(33), 'bob@example.com', 'a b', '🧑person', '../bob']) {
    assert.throws(() => profileAuthIdentifier(input), /3–32/);
  }
});

test('cloud writes carry the expected account and revision, retaining conflicts as errors', async () => {
  const profile = { blocks: [], updatedAt: '' };
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'save_injection_profile');
    assert.deepEqual(args, { p_blocks: [], p_revision: 4, p_expected_user_id: 'account-a' });
    return { data: { blocks: [], updated_at: '2026-09-15T00:00:00Z', revision: 5 }, error: null };
  } };
  assert.equal((await saveCloudProfile(client, profile, 4, 'account-a')).revision, 5);
  const conflict = { rpc: async () => ({ error: { message: 'profile_conflict' } }) };
  await assert.rejects(saveCloudProfile(conflict, profile, 4, 'account-a'), /changed on another device/);
});

test('cloud reads require authentication and constrain the query to the signed-in user', async () => {
  await assert.rejects(loadCloudProfile({ auth: { getUser: async () => ({ data: { user: null } }) } }), /Sign in again/);
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'account-a' } } }) },
    from: (table) => {
      assert.equal(table, 'injection_profiles');
      return { select: () => ({ eq: (column, id) => {
        assert.equal(column, 'user_id'); assert.equal(id, 'account-a');
        return { maybeSingle: async () => ({ data: null, error: null }) };
      } }) };
    },
  };
  assert.deepEqual(await loadCloudProfile(client), { blocks: [], updatedAt: '', revision: 0 });
});
