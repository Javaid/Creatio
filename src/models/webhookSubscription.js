const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const WebhookSubscription = sequelize.define(
    'WebhookSubscription',
    {
      ...uuidPk(DataTypes),
      apiClientId: { type: DataTypes.UUID, allowNull: false, field: 'api_client_id' },
      targetUrl: { type: DataTypes.STRING(1024), allowNull: false, field: 'target_url' },
      eventTypes: { type: DataTypes.STRING(512), allowNull: false, field: 'event_types' },
      secretHash: { type: DataTypes.STRING(256), allowNull: false, field: 'secret_hash' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    },
    {
      tableName: 'webhook_subscriptions',
      underscored: true,
    }
  );

  WebhookSubscription.associate = (models) => {
    WebhookSubscription.belongsTo(models.ApiClient, { foreignKey: 'apiClientId', as: 'apiClient' });
    WebhookSubscription.hasMany(models.OutboundWebhookDelivery, {
      foreignKey: 'subscriptionId',
      as: 'deliveries',
    });
  };

  return WebhookSubscription;
};
