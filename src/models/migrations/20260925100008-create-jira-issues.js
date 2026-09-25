module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_issues', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      jira_key: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_projects', key: 'id' },
      },
      issue_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_issue_types', key: 'id' },
      },
      status_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_statuses', key: 'id' },
      },
      priority_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_priorities', key: 'id' },
      },
      summary: { type: Sequelize.STRING(512), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      assignee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_users', key: 'id' },
      },
      reporter_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_users', key: 'id' },
      },
      sprint_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_sprints', key: 'id' },
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_customers', key: 'id' },
      },
      parent_issue_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'jira_issues', key: 'id' },
      },
      story_points: { type: Sequelize.FLOAT, allowNull: true },
      labels: { type: Sequelize.TEXT, allowNull: true },
      raw_payload: { type: Sequelize.TEXT, allowNull: true },
      jira_created_at: { type: Sequelize.DATE, allowNull: false },
      jira_updated_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('jira_issues', ['project_id', 'jira_updated_at']);
    await queryInterface.addIndex('jira_issues', ['status_id']);
    await queryInterface.addIndex('jira_issues', ['jira_key']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_issues');
  },
};
