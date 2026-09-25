module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_customers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_customers');
  },
};
