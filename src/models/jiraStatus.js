const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraStatus = sequelize.define(
    'JiraStatus',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      iconUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'icon_url' },
      statusCategory: {
        type: DataTypes.ENUM('to_do', 'in_progress', 'done'),
        allowNull: true,
        field: 'status_category',
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    },
    {
      tableName: 'jira_statuses',
      underscored: true,
    }
  );

  JiraStatus.associate = (models) => {
    JiraStatus.hasMany(models.JiraIssue, { foreignKey: 'statusId', as: 'issues' });
  };

  return JiraStatus;
};
