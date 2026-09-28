const { createUser, findUserByUsername, _reset } = require('../../src/store/userStore');

describe('userStore', () => {
  beforeEach(() => _reset());

  it('creates a user with a generated userId', () => {
    const user = createUser({ username: 'alice', passwordHash: 'hash', phoneNumber: '+94770000000' });
    expect(user.userId).toBeDefined();
    expect(user.username).toBe('alice');
  });

  it('finds a user by username', () => {
    createUser({ username: 'alice', passwordHash: 'hash', phoneNumber: '+94770000000' });
    const found = findUserByUsername('alice');
    expect(found).not.toBeNull();
    expect(found.username).toBe('alice');
  });

  it('returns null for an unknown username', () => {
    expect(findUserByUsername('nobody')).toBeNull();
  });
});
