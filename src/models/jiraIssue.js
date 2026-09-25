const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraIssue = sequelize.define(
    'JiraIssue',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      jiraKey: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_key' },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      issueTypeId: { type: DataTypes.UUID, allowNull: false, field: 'issue_type_id' },
      statusId: { type: DataTypes.UUID, allowNull: false, field: 'status_id' },
      priorityId: { type: DataTypes.UUID, allowNull: true, field: 'priority_id' },
      summary: { type: DataTypes.STRING(512), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      assigneeId: { type: DataTypes.UUID, allowNull: true, field: 'assignee_id' },
      reporterId: { type: DataTypes.UUID, allowNull: true, field: 'reporter_id' },
      sprintId: { type: DataTypes.UUID, allowNull: true, field: 'sprint_id' },
      customerId: { type: DataTypes.UUID, allowNull: true, field: 'customer_id' },
      parentIssueId: { type: DataTypes.UUID, allowNull: true, field: 'parent_issue_id' },
      storyPoints: { type: DataTypes.FLOAT, allowNull: true, field: 'story_points' },
      labels: { type: DataTypes.TEXT, allowNull: true },
      rawPayload: { type: DataTypes.TEXT, allowNull: true, field: 'raw_payload' },
      jiraCreatedAt: { type: DataTypes.DATE, allowNull: false, field: 'jira_created_at' },
      jiraUpdatedAt: { type: DataTypes.DATE, allowNull: false, field: 'jira_updated_at' },
    },
    {
      tableName: 'jira_issues',
      underscored: true,
      indexes: [
        { fields: ['project_id', 'jira_updated_at'] },
        { fields: ['status_id'] },
        { fields: ['jira_key'] },
      ],
    }
  );

  JiraIssue.associate = (models) => {
    JiraIssue.belongsTo(models.JiraProject, { foreignKey: 'projectId', as: 'project' });
    JiraIssue.belongsTo(models.JiraIssueType, { foreignKey: 'issueTypeId', as: 'issueType' });
    JiraIssue.belongsTo(models.JiraStatus, { foreignKey: 'statusId', as: 'status' });
    JiraIssue.belongsTo(models.JiraPriority, { foreignKey: 'priorityId', as: 'priority' });
    JiraIssue.belongsTo(models.JiraUser, { foreignKey: 'assigneeId', as: 'assignee' });
    JiraIssue.belongsTo(models.JiraUser, { foreignKey: 'reporterId', as: 'reporter' });
    JiraIssue.belongsTo(models.JiraSprint, { foreignKey: 'sprintId', as: 'sprint' });
    JiraIssue.belongsTo(models.JiraCustomer, { foreignKey: 'customerId', as: 'customer' });
    JiraIssue.belongsTo(models.JiraIssue, { foreignKey: 'parentIssueId', as: 'parentIssue' });
    JiraIssue.hasMany(models.JiraIssue, { foreignKey: 'parentIssueId', as: 'subtasks' });
    JiraIssue.hasMany(models.JiraWorklog, { foreignKey: 'issueId', as: 'worklogs' });
    JiraIssue.hasMany(models.JiraIssueChangelog, { foreignKey: 'issueId', as: 'changelog' });
  };

  return JiraIssue;
};
