const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraSprint = sequelize.define(
    'JiraSprint',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      state: { type: DataTypes.ENUM('future', 'active', 'closed'), allowNull: false },
      startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date' },
      endDate: { type: DataTypes.DATE, allowNull: true, field: 'end_date' },
      completeDate: { type: DataTypes.DATE, allowNull: true, field: 'complete_date' },
      goal: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'jira_sprints',
      underscored: true,
    }
  );

  JiraSprint.associate = (models) => {
    JiraSprint.belongsTo(models.JiraProject, { foreignKey: 'projectId', as: 'project' });
    JiraSprint.hasMany(models.JiraIssue, { foreignKey: 'sprintId', as: 'issues' });
  };

  return JiraSprint;
};
