module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jira_sprints', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('NEWSEQUENTIALID()'),
      },
      jira_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jira_projects', key: 'id' },
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      state: { type: Sequelize.ENUM('future', 'active', 'closed'), allowNull: false },
      start_date: { type: Sequelize.DATE, allowNull: true },
      end_date: { type: Sequelize.DATE, allowNull: true },
      complete_date: { type: Sequelize.DATE, allowNull: true },
      goal: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('jira_sprints', ['project_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('jira_sprints');
  },
};
