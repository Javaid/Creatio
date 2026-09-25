const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const SyncCheckpoint = sequelize.define(
    'SyncCheckpoint',
    {
      ...uuidPk(DataTypes),
      entityType: { type: DataTypes.STRING(64), allowNull: false, field: 'entity_type' },
      scopeKey: { type: DataTypes.STRING(128), allowNull: true, field: 'scope_key' },
      lastSyncedAt: { type: DataTypes.DATE, allowNull: false, field: 'last_synced_at' },
      lastCursor: { type: DataTypes.STRING(256), allowNull: true, field: 'last_cursor' },
    },
    {
      tableName: 'sync_checkpoints',
      underscored: true,
      createdAt: false,
      updatedAt: 'updated_at',
      indexes: [{ unique: true, fields: ['entity_type', 'scope_key'] }],
    }
  );

  return SyncCheckpoint;
};
