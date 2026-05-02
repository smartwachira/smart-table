'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add the session tracking column
    await queryInterface.addColumn('Orders', 'guest_session_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Add the B-Tree Index for rapid session lookups
    await queryInterface.addIndex('Orders', ['guest_session_id'], {
      name: 'idx_orders_guest_session_id',
    });
  },

  async down(queryInterface, Sequelize) {
    // Teardown in reverse order
    await queryInterface.removeIndex('Orders', 'idx_orders_guest_session_id');
    await queryInterface.removeColumn('Orders', 'guest_session_id');
  }
};