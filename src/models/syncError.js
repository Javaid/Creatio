const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const SyncError = sequelize.define(
    'SyncError',
    {
      ...uuidPk(DataTypes),
      syncRunId: { type: DataTypes.UUID, allowNull: true, field: 'sync_run_id' },
      entityType: { type: DataTypes.STRING(64), allowNull: false, field: 'entity_type' },
      entityJiraId: { type: DataTypes.STRING(64), allowNull: false, field: 'entity_jira_id' },
      errorMessage: { type: DataTypes.TEXT, allowNull: false, field: 'error_message' },
      attemptCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'attempt_count' },
      nextRetryAt: { type: DataTypes.DATE, allowNull: true, field: 'next_retry_at' },
      status: {
        type: DataTypes.ENUM('pending', 'retrying', 'resolved', 'dead_letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'sync_errors',
      underscored: true,
    }
  );

  SyncError.associate = (models) => {
    SyncError.belongsTo(models.SyncHistory, { foreignKey: 'syncRunId', as: 'syncRun' });
  };

  return SyncError;
};
