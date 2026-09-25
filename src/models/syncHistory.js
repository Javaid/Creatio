const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const SyncHistory = sequelize.define(
    'SyncHistory',
    {
      ...uuidPk(DataTypes),
      syncType: { type: DataTypes.ENUM('full', 'incremental', 'webhook'), allowNull: false, field: 'sync_type' },
      triggeredBy: { type: DataTypes.ENUM('schedule', 'api', 'webhook'), allowNull: false, field: 'triggered_by' },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      entityTypes: { type: DataTypes.STRING(256), allowNull: false, field: 'entity_types' },
      startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
      finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
      recordsFetched: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'records_fetched' },
      recordsCreated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'records_created' },
      recordsUpdated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'records_updated' },
      recordsFailed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'records_failed' },
      errorSummary: { type: DataTypes.TEXT, allowNull: true, field: 'error_summary' },
    },
    {
      tableName: 'sync_history',
      underscored: true,
      timestamps: false,
    }
  );

  SyncHistory.associate = (models) => {
    SyncHistory.hasMany(models.SyncError, { foreignKey: 'syncRunId', as: 'errors' });
  };

  return SyncHistory;
};
