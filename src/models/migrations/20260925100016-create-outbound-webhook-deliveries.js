module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('outbound_webhook_deliveries', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'webhook_subscriptions', key: 'id' },
      },
      event_id: { type: Sequelize.UUID, allowNull: false },
      event_type: { type: Sequelize.STRING(64), allowNull: false },
      payload: { type: Sequelize.TEXT, allowNull: false },
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('pending', 'delivered', 'failed', 'dead_letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
      last_attempted_at: { type: Sequelize.DATE, allowNull: true },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('outbound_webhook_deliveries', ['subscription_id', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('outbound_webhook_deliveries');
  },
};
