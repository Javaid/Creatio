module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_clients', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      client_name: { type: Sequelize.STRING(128), allowNull: false },
      api_key_hash: { type: Sequelize.STRING(256), allowNull: false },
      scopes: { type: Sequelize.STRING(256), allowNull: false, defaultValue: 'read' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('api_clients');
  },
};
