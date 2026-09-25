const { uuidPk } = require('./_columns');

module.exports = (sequelize, DataTypes) => {
  const OutboundWebhookDelivery = sequelize.define(
    'OutboundWebhookDelivery',
    {
      ...uuidPk(DataTypes),
      subscriptionId: { type: DataTypes.UUID, allowNull: false, field: 'subscription_id' },
      eventId: { type: DataTypes.UUID, allowNull: false, field: 'event_id' },
      eventType: { type: DataTypes.STRING(64), allowNull: false, field: 'event_type' },
      payload: { type: DataTypes.TEXT, allowNull: false },
      attemptCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'attempt_count' },
      status: {
        type: DataTypes.ENUM('pending', 'delivered', 'failed', 'dead_letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
      lastAttemptedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_attempted_at' },
      lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
    },
    {
      tableName: 'outbound_webhook_deliveries',
      underscored: true,
      updatedAt: false,
    }
  );

  OutboundWebhookDelivery.associate = (models) => {
    OutboundWebhookDelivery.belongsTo(models.WebhookSubscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription',
    });
  };

  return OutboundWebhookDelivery;
};
