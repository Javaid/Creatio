// Consumed both by our Sequelize bootstrap (src/models/index.js) and by
// sequelize-cli directly (see .sequelizerc), so it intentionally reads
// process.env directly rather than going through env.js's stricter
// (Jira-inclusive) validation -- migrations must be runnable with only DB
// credentials present.
require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 1433,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.NODE_ENV !== 'production',
    },
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  logging: false,
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : process.env.DB_NAME,
  },
  production: base,
};
