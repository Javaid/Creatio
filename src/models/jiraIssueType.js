const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraIssueType = sequelize.define(
    'JiraIssueType',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      iconUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'icon_url' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    },
    {
      tableName: 'jira_issue_types',
      underscored: true,
    }
  );

  JiraIssueType.associate = (models) => {
    JiraIssueType.hasMany(models.JiraIssue, { foreignKey: 'issueTypeId', as: 'issues' });
  };

  return JiraIssueType;
};
