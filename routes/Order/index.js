const express = require('express');
const { placeOrder,getAllOrders,updateOrderStatus } = require('../../Controler/Order');

// Optionally add authentication middleware if needed
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', placeOrder);

router.get('/admin', getAllOrders);

router.patch(
    "/updateStatus/:id",updateOrderStatus
);

router.get("/order/:id", getOrderById);


module.exports = router;
