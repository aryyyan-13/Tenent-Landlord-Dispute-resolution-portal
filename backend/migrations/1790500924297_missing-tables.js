/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE rental_agreement_status AS ENUM ('active', 'expired', 'terminated');

    CREATE TABLE rental_agreements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_address TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      status rental_agreement_status NOT NULL DEFAULT 'active',
      created_by_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(tenant_id, landlord_id, property_address)
    );

    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rental_agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(reviewer_id, reviewee_id, rental_agreement_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS rental_agreements CASCADE;
    DROP TYPE IF EXISTS rental_agreement_status CASCADE;
  `);
};
