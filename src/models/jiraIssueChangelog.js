const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraIssueChangelog = sequelize.define(
    'JiraIssueChangelog',
    {
      ...uuidPk(DataTypes),
      jiraHistoryId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_history_id' },
      issueId: { type: DataTypes.UUID, allowNull: false, field: 'issue_id' },
      fieldName: { type: DataTypes.STRING(128), allowNull: false, field: 'field_name' },
      fromValue: { type: DataTypes.STRING(512), allowNull: true, field: 'from_value' },
      toValue: { type: DataTypes.STRING(512), allowNull: true, field: 'to_value' },
      authorId: { type: DataTypes.UUID, allowNull: true, field: 'author_id' },
      changedAt: { type: DataTypes.DATE, allowNull: false, field: 'changed_at' },
    },
    {
      tableName: 'jira_issue_changelog',
      underscored: true,
      updatedAt: false,
    }
  );

  JiraIssueChangelog.associate = (models) => {
    JiraIssueChangelog.belongsTo(models.JiraIssue, { foreignKey: 'issueId', as: 'issue' });
    JiraIssueChangelog.belongsTo(models.JiraUser, { foreignKey: 'authorId', as: 'author' });
  };

  return JiraIssueChangelog;
};
