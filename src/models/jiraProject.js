const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraProject = sequelize.define(
    'JiraProject',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      jiraKey: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_key' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      projectType: { type: DataTypes.STRING(64), allowNull: true, field: 'project_type' },
      leadJiraAccountId: { type: DataTypes.STRING(128), allowNull: true, field: 'lead_jira_account_id' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
      rawPayload: { type: DataTypes.TEXT, allowNull: true, field: 'raw_payload' },
      jiraCreatedAt: { type: DataTypes.DATE, allowNull: true, field: 'jira_created_at' },
      jiraUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: 'jira_updated_at' },
    },
    {
      tableName: 'jira_projects',
      underscored: true,
    }
  );

  JiraProject.associate = (models) => {
    JiraProject.hasMany(models.JiraSprint, { foreignKey: 'projectId', as: 'sprints' });
    JiraProject.hasMany(models.JiraIssue, { foreignKey: 'projectId', as: 'issues' });
  };

  return JiraProject;
};
