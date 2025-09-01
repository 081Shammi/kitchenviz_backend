const express = require('express');
const { placeOrder,getAllOrders,updateOrderStatus,updateShippingStatus,getOrderById, getStatusOfPayment} = require('../../Controler/Order');


const router = express.Router();

router.post('/', placeOrder);

router.get('/admin', getAllOrders);

router.patch(
    "/updateStatus/:id",updateOrderStatus
);

router.get('/check-status', getStatusOfPayment);
router.get("/:id", getOrderById);

router.patch(
    "/updateShippingStatus/:id",updateShippingStatus
  );
  router.get('/test', (req, res) => res.send('Order router test OK'));

  
  
  module.exports = router;
