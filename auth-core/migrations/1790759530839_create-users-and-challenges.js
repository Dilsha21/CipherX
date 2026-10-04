/* eslint-disable camelcase */

exports.shorthands = undefined;

// Matches the current in-memory data model in src/store/userStore.js and
// src/store/challengeStore.js. Runs inside the auth_core schema (see
// package.json migrate:up / /shared/DATABASE.md) — the app code isn't
// wired to query these yet; that's a follow-up once DATABASE_URL is
// available to everyone.

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true }); // for gen_random_uuid()

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    phone_number: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('challenges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    required_factors: { type: 'jsonb', notNull: true },
    completed_factors: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
  });

  pgm.createIndex('challenges', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('challenges');
  pgm.dropTable('users');
};
