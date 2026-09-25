module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_errors', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      sync_run_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'sync_history', key: 'id' },
      },
      entity_type: { type: Sequelize.STRING(64), allowNull: false },
      entity_jira_id: { type: Sequelize.STRING(64), allowNull: false },
      error_message: { type: Sequelize.TEXT, allowNull: false },
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      next_retry_at: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'retrying', 'resolved', 'dead_letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('sync_errors', ['status', 'next_retry_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_errors');
  },
};
