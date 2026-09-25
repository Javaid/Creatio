module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_subscriptions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      api_client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'api_clients', key: 'id' },
      },
      target_url: { type: Sequelize.STRING(1024), allowNull: false },
      event_types: { type: Sequelize.STRING(512), allowNull: false },
      secret_hash: { type: Sequelize.STRING(256), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('webhook_subscriptions', ['api_client_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('webhook_subscriptions');
  },
};
