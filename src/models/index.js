const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.endsWith('.js') &&
      file !== 'index.js' &&
      !file.startsWith('_') &&
      !fs.statSync(path.join(__dirname, file)).isDirectory()
    );
  })
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file));
    const model = defineModel(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
