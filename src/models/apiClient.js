const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const ApiClient = sequelize.define(
    'ApiClient',
    {
      ...uuidPk(DataTypes),
      clientName: { type: DataTypes.STRING(128), allowNull: false, field: 'client_name' },
      apiKeyHash: { type: DataTypes.STRING(256), allowNull: false, field: 'api_key_hash' },
      scopes: { type: DataTypes.STRING(256), allowNull: false, defaultValue: 'read' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
      lastUsedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_used_at' },
    },
    {
      tableName: 'api_clients',
      underscored: true,
    }
  );

  ApiClient.associate = (models) => {
    ApiClient.hasMany(models.WebhookSubscription, { foreignKey: 'apiClientId', as: 'webhookSubscriptions' });
  };

  return ApiClient;
};
