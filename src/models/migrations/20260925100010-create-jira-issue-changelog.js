module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_issue_changelog', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_history_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_issues', key: 'id' },
      },
      field_name: { type: Sequelize.STRING(128), allowNull: false },
      from_value: { type: Sequelize.STRING(512), allowNull: true },
      to_value: { type: Sequelize.STRING(512), allowNull: true },
      author_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_users', key: 'id' },
      },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('jira_issue_changelog', ['issue_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_issue_changelog');
  },
};
