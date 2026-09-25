module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_worklogs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_issues', key: 'id' },
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_users', key: 'id' },
      },
      time_spent_seconds: { type: Sequelize.INTEGER, allowNull: false },
      started_at: { type: Sequelize.DATE, allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      jira_created_at: { type: Sequelize.DATE, allowNull: false },
      jira_updated_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('jira_worklogs', ['issue_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_worklogs');
  },
};
