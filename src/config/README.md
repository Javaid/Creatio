# config/

Environment-based configuration loading and validation (dotenv + Joi
schema). Fails fast on boot if required variables are missing. See
`docs/DEPLOYMENT.md` §4 for the full variable list.

- `env.js` — validated, typed application config. Import this everywhere
  else in the app (`require('../config/env')`).
- `database.js` — Sequelize CLI-compatible config (per-`NODE_ENV` block).
  Read directly by `.sequelizerc` and by `src/models/index.js`; deliberately
  independent of `env.js` so migrations only require DB credentials.
