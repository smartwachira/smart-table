// File: server/config/config.cjs
require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL', // ⚡ Tells Sequelize to use the full connection string
    dialect: 'postgres',
    logging: false
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};