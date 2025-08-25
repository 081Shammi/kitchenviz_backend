const express = require('express');
const { placeOrder,getAllOrders,updateOrderStatus,updateShippingStatus,getOrderById } = require('../../Controler/Order');

// Optionally add authentication middleware if needed
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', placeOrder);

router.get('/admin', getAllOrders);

router.patch(
    "/updateStatus/:id",updateOrderStatus
);

router.get("/:id", getOrderById);

router.patch(
    "/order/updateShippingStatus/:id",updateShippingStatus
  );

module.exports = router;
