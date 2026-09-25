module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_history', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      sync_type: { type: Sequelize.ENUM('full', 'incremental', 'webhook'), allowNull: false },
      triggered_by: { type: Sequelize.ENUM('schedule', 'api', 'webhook'), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      entity_types: { type: Sequelize.STRING(256), allowNull: false },
      started_at: { type: Sequelize.DATE, allowNull: true },
      finished_at: { type: Sequelize.DATE, allowNull: true },
      records_fetched: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      records_created: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      records_updated: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      records_failed: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      error_summary: { type: Sequelize.TEXT, allowNull: true },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_history');
  },
};
