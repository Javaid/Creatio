const { Sequelize } = require('sequelize');

// Shared column shape used across every model: a SQL Server sequential
// UUID primary key. Prefixed with `_` so src/models/index.js's model
// loader skips this file.
function uuidPk(DataTypes) {
  return {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
    },
  };
}

module.exports = { uuidPk };
