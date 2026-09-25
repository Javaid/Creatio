const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraUser = sequelize.define(
    'JiraUser',
    {
      ...uuidPk(DataTypes),
      jiraAccountId: { type: DataTypes.STRING(128), allowNull: false, unique: true, field: 'jira_account_id' },
      displayName: { type: DataTypes.STRING(255), allowNull: false, field: 'display_name' },
      email: { type: DataTypes.STRING(255), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      avatarUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'avatar_url' },
      jiraUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: 'jira_updated_at' },
    },
    {
      tableName: 'jira_users',
      underscored: true,
    }
  );

  JiraUser.associate = (models) => {
    JiraUser.hasMany(models.JiraIssue, { foreignKey: 'assigneeId', as: 'assignedIssues' });
    JiraUser.hasMany(models.JiraIssue, { foreignKey: 'reporterId', as: 'reportedIssues' });
    JiraUser.hasMany(models.JiraWorklog, { foreignKey: 'authorId', as: 'worklogs' });
    JiraUser.hasMany(models.JiraIssueChangelog, { foreignKey: 'authorId', as: 'changelogEntries' });
  };

  return JiraUser;
};
