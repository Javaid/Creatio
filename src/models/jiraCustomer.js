const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const JiraCustomer = sequelize.define(
    'JiraCustomer',
    {
      ...uuidPk(DataTypes),
      jiraId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'jira_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
    },
    {
      tableName: 'jira_customers',
      underscored: true,
    }
  );

  JiraCustomer.associate = (models) => {
    JiraCustomer.hasMany(models.JiraIssue, { foreignKey: 'customerId', as: 'issues' });
  };

  return JiraCustomer;
};
