/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE daily_metrics (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date DATE UNIQUE NOT NULL,
      pos_revenue NUMERIC NOT NULL DEFAULT 0,
      eatclub_revenue NUMERIC NOT NULL DEFAULT 0,
      labour_costs NUMERIC NOT NULL DEFAULT 0,
      covers INTEGER NOT NULL DEFAULT 0,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP TABLE daily_metrics;");
};
