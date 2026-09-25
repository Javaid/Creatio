module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sync_checkpoints', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      entity_type: { type: Sequelize.STRING(64), allowNull: false },
      scope_key: { type: Sequelize.STRING(128), allowNull: true },
      last_synced_at: { type: Sequelize.DATE, allowNull: false },
      last_cursor: { type: Sequelize.STRING(256), allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('sync_checkpoints', ['entity_type', 'scope_key'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sync_checkpoints');
  },
};
