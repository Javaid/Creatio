# models/

Sequelize model definitions mapping to this service's own SQL Server
schema (never Creatio's). Migrations live in `models/migrations/` and are
the only supported way to change schema (no manual DDL against target
servers). See `docs/DATABASE-DESIGN.md`.
