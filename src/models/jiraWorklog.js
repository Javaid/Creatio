const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraWorklog = sequelize.define(
    'JiraWorklog',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      issueId: { type: DataTypes.UUID, allowNull: false, field: 'issue_id' },
      authorId: { type: DataTypes.UUID, allowNull: true, field: 'author_id' },
      timeSpentSeconds: { type: DataTypes.INTEGER, allowNull: false, field: 'time_spent_seconds' },
      startedAt: { type: DataTypes.DATE, allowNull: false, field: 'started_at' },
      comment: { type: DataTypes.TEXT, allowNull: true },
      jiraCreatedAt: { type: DataTypes.DATE, allowNull: false, field: 'jira_created_at' },
      jiraUpdatedAt: { type: DataTypes.DATE, allowNull: false, field: 'jira_updated_at' },
    },
    {
      tableName: 'jira_worklogs',
      underscored: true,
    }
  );

  JiraWorklog.associate = (models) => {
    JiraWorklog.belongsTo(models.JiraIssue, { foreignKey: 'issueId', as: 'issue' });
    JiraWorklog.belongsTo(models.JiraUser, { foreignKey: 'authorId', as: 'author' });
  };

  return JiraWorklog;
};
