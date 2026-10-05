/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createSchema('biometric_factor', { ifNotExists: true });

  pgm.createTable(
    { schema: 'biometric_factor', name: 'credentials' },
    {
      id: { type: 'text', primaryKey: true },
      user_id: { type: 'text', notNull: true },
      public_key: { type: 'text', notNull: true },
      counter: { type: 'bigint', notNull: true, default: 0 },
      transports: { type: 'jsonb', notNull: true, default: '[]' },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
    { ifNotExists: true }
  );

  pgm.createIndex({ schema: 'biometric_factor', name: 'credentials' }, 'user_id');

  pgm.createTable(
    { schema: 'biometric_factor', name: 'challenges' },
    {
      user_id: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true },
      challenge: { type: 'text', notNull: true },
      expires_at: { type: 'timestamp with time zone', notNull: true },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint(
    { schema: 'biometric_factor', name: 'challenges' },
    'pk_user_id_type',
    { primaryKey: ['user_id', 'type'] }
  );

  pgm.createTable(
    { schema: 'biometric_factor', name: 'attempts' },
    {
      user_id: { type: 'text', primaryKey: true },
      failed_attempts: { type: 'integer', notNull: true, default: 0 },
      updated_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
    { ifNotExists: true }
  );
};

exports.down = (pgm) => {
  pgm.dropTable({ schema: 'biometric_factor', name: 'attempts' });
  pgm.dropTable({ schema: 'biometric_factor', name: 'challenges' });
  pgm.dropTable({ schema: 'biometric_factor', name: 'credentials' });
  pgm.dropSchema('biometric_factor');
};
