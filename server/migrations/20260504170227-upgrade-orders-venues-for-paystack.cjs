'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. ALTER ENUMS SAFELY VIA RAW SQL
      await queryInterface.sequelize.query(`ALTER TYPE "enum_Orders_payment_method" ADD VALUE 'CARD';`).catch(() => {});
      await queryInterface.sequelize.query(`ALTER TYPE "enum_Orders_payment_status" ADD VALUE 'REFUNDED';`).catch(() => {});
      await queryInterface.sequelize.query(`ALTER TYPE "enum_Orders_payment_status" ADD VALUE 'PARTIALLY_REFUNDED';`).catch(() => {});

      // 2. FETCH EXISTING SCHEMA STATE
      const ordersTable = await queryInterface.describeTable('Orders');
      const venuesTable = await queryInterface.describeTable('Venues');

      // 3. IDEMPOTENTLY UPDATE ORDERS TABLE
      if (!ordersTable.gateway_reference) {
        await queryInterface.addColumn('Orders', 'gateway_reference', {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true, 
        }, { transaction });
      }

      if (!ordersTable.gateway_fee) {
        await queryInterface.addColumn('Orders', 'gateway_fee', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        }, { transaction });
      }

      if (!ordersTable.platform_fee) {
        await queryInterface.addColumn('Orders', 'platform_fee', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        }, { transaction });
      }

      // Safely add the index if the column was just created
      await queryInterface.addIndex('Orders', ['gateway_reference'], { transaction }).catch(() => {});

      // 4. IDEMPOTENTLY UPDATE VENUES TABLE
      if (!venuesTable.gateway_subaccount_id) {
        await queryInterface.addColumn('Venues', 'gateway_subaccount_id', {
          type: Sequelize.STRING,
          allowNull: true, 
        }, { transaction });
      }

      if (!venuesTable.payment_onboarding_status) {
        await queryInterface.addColumn('Venues', 'payment_onboarding_status', {
          type: Sequelize.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
          allowNull: false,
          defaultValue: 'PENDING',
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const ordersTable = await queryInterface.describeTable('Orders');
      const venuesTable = await queryInterface.describeTable('Venues');

      if (ordersTable.gateway_reference) await queryInterface.removeColumn('Orders', 'gateway_reference', { transaction });
      if (ordersTable.gateway_fee) await queryInterface.removeColumn('Orders', 'gateway_fee', { transaction });
      if (ordersTable.platform_fee) await queryInterface.removeColumn('Orders', 'platform_fee', { transaction });
      
      if (venuesTable.gateway_subaccount_id) await queryInterface.removeColumn('Venues', 'gateway_subaccount_id', { transaction });
      if (venuesTable.payment_onboarding_status) await queryInterface.removeColumn('Venues', 'payment_onboarding_status', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};