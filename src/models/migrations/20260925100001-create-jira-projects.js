module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_projects', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      jira_key: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      project_type: { type: Sequelize.STRING(64), allowNull: true },
      lead_jira_account_id: { type: Sequelize.STRING(128), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      raw_payload: { type: Sequelize.TEXT, allowNull: true },
      jira_created_at: { type: Sequelize.DATE, allowNull: true },
      jira_updated_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_projects');
  },
};
