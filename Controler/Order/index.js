const mongoose = require("mongoose");
const crypto = require('crypto');
const axios = require('axios');

const Order = require("../../Modals/OrderSchema");
const Product = require("../../Modals/Products"); // To validate product existence
const { ObjectId } = mongoose.Types;
const { sendOrderStatusEmail,sendOrderPlacedEmail } = require("../../utils/sendEmail"); // Adjust path as needed
const {StandardCheckoutClient, Env, StandardCheckoutPayRequest} = require('pg-sdk-node')
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const clientVersion = 1
const env = Env.PRODUCTION

const client = StandardCheckoutClient.getInstance(clientId,clientSecret,clientVersion,env)

exports.placeOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      contactDetails,
      paymentMethod,
      paymentResult,
      itemsPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    // --- 1. Basic validation ---
    if (
      !Array.isArray(orderItems) ||
      orderItems.length === 0 ||
      !shippingAddress ||
      !contactDetails ||
      typeof itemsPrice !== "number" ||
      typeof shippingPrice !== "number" ||
      typeof totalPrice !== "number"
    ) {
      return res.status(400).json({
        message:
          "Missing or invalid required fields: orderItems, shippingAddress, contactDetails, price fields",
      });
    }

    // --- 2. Validate each order item and stock availability ---
    for (const item of orderItems) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
      if (item.quantity > productDoc.countInStock) {
        return res.status(400).json({
          message: `Not enough stock for product "${productDoc.name}".`,
        });
      }
    }

    // --- 3. Validate shipping address fields ---
    const addressFields = ["fullName", "address", "city", "postalCode", "country"];
    for (const field of addressFields) {
      if (!shippingAddress[field] || shippingAddress[field].toString().trim().length === 0) {
        return res.status(400).json({
          message: `Missing or empty shipping address field: ${field}`,
        });
      }
    }

    // --- 4. Validate contact details fields ---
    const contactFields = ["email", "phoneNumber", "address", "postalCode", "country", "city"];
    for (const field of contactFields) {
      if (!contactDetails[field] || contactDetails[field].toString().trim().length === 0) {
        return res.status(400).json({
          message: `Missing or empty contact details field: ${field}`,
        });
      }
    }

    // --- 5. Assign user if authenticated ---
    let user = null;
    if (req.user && req.user._id) {
      user = req.user._id;
    }

    // --- 6. Create order with PENDING status (DON'T decrement stock yet) ---
    const order = new Order({
      orderItems,
      shippingAddress,
      contactDetails,
      paymentMethod,
      paymentResult,
      itemsPrice,
      shippingPrice,
      totalPrice,
      user,
      orderStatus: 'pending', // Order is pending until payment success
      paymentStatus: 'pending', // Payment is pending
      isPaid: false
    });

    const createdOrder = await order.save();

    // --- 7. PhonePe Payment Processing ---
    const amountInPaise = Math.round(totalPrice * 100); // Convert ₹ to paise

    try {
      if (!totalPrice) {
        // Delete the pending order if payment setup fails
        await Order.findByIdAndDelete(createdOrder._id);
        return res.status(400).json({ message: 'Amount is required' });
      }

      const merchantOrderId = createdOrder._id.toString();
      console.log('merchantOrderId', merchantOrderId);
      
      const redirectUrl = `https://www.kitchenvizbuy.com/api/order/check-status?merchantOrderId=${merchantOrderId}`;
      const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(amountInPaise)
        .redirectUrl(redirectUrl)
        .build();

      const response = await client.pay(request);
      
      // Check if response has redirectUrl
      if (!response.redirectUrl) {
        // Delete the pending order if payment initiation fails
        await Order.findByIdAndDelete(createdOrder._id);
        return res.status(500).json({
          message: 'Payment initiated but no redirect URL received',
          data: response
        });
      }

      // Update order with payment initiation details
      await Order.findByIdAndUpdate(createdOrder._id, {
        'paymentResult.paymentId': response.paymentId || merchantOrderId,
        'paymentResult.status': 'initiated'
      });

      return res.status(200).json({
        message: "Order created and payment initiated successfully",
        orderId: createdOrder._id,
        checkoutPageUrl: response.redirectUrl,
      });

    } catch (err) {
      console.log('Error while initiating payment:', err);
      
      // Delete the pending order if payment fails
      await Order.findByIdAndDelete(createdOrder._id);
      
      return res.status(500).json({ message: 'Error while initiating payment' });
    }

  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({ message: "Server error while placing order." });
  }
};

// Separate function to handle payment status check (called by redirect URL)
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.query;

    if (!merchantOrderId) {
      return res.status(400).json({ message: 'Merchant Order ID is required' });
    }

    // Check payment status with PhonePe
    const statusResponse = await client.checkStatus(merchantOrderId);
    
    const order = await Order.findById(merchantOrderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (statusResponse.code === 'PAYMENT_SUCCESS') {
      // Payment successful - finalize the order
      
      // Final stock validation before decrementing
      for (const item of order.orderItems) {
        const productDoc = await Product.findById(item.product);
        if (!productDoc) {
          // Mark order as failed due to product unavailability
          await Order.findByIdAndUpdate(merchantOrderId, {
            orderStatus: 'failed',
            paymentStatus: 'refund_required',
            'paymentResult.status': 'success_but_failed_fulfillment'
          });
          return res.status(400).json({ 
            message: `Product not found: ${item.product}. Order marked for refund.` 
          });
        }
        if (item.quantity > productDoc.countInStock) {
          // Mark order as failed due to insufficient stock
          await Order.findByIdAndUpdate(merchantOrderId, {
            orderStatus: 'failed',
            paymentStatus: 'refund_required',
            'paymentResult.status': 'success_but_insufficient_stock'
          });
          return res.status(400).json({
            message: `Not enough stock for product "${productDoc.name}". Order marked for refund.`,
          });
        }
      }

      // Decrement product stock ONLY after payment success and final validation
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { countInStock: -item.quantity } },
          { new: true }
        );
      }

      // Update order status to confirmed
      const updatedOrder = await Order.findByIdAndUpdate(
        merchantOrderId,
        {
          orderStatus: 'confirmed',
          paymentStatus: 'completed',
          isPaid: true,
          paidAt: new Date(),
          'paymentResult.status': 'success',
          'paymentResult.update_time': new Date(),
          'paymentResult.email_address': order.contactDetails.email
        },
        { new: true }
      );

      // Send order confirmation email
      const userEmail = order.contactDetails.email;
      const userName = order.shippingAddress.fullName || "Customer";

      if (userEmail) {
        try {
          await sendOrderPlacedEmail(userEmail, userName, order._id, "confirmed");
        } catch (emailError) {
          console.error('Error sending order confirmation email:', emailError);
        }
      }

      return res.status(200).json({
        message: "Payment successful and order confirmed",
        order: updatedOrder
      });

    } else if (statusResponse.code === 'PAYMENT_FAILED') {
      // Payment failed - update order status
      await Order.findByIdAndUpdate(merchantOrderId, {
        orderStatus: 'cancelled',
        paymentStatus: 'failed',
        'paymentResult.status': 'failed'
      });

      return res.status(400).json({
        message: "Payment failed. Order cancelled.",
        paymentStatus: statusResponse
      });

    } else {
      // Payment still pending
      return res.status(200).json({
        message: "Payment is still pending",
        paymentStatus: statusResponse
      });
    }

  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({ message: "Error checking payment status" });
  }
};


exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
    //   .populate("user", "name email")
      .populate({
        path: "orderItems.product",
        model: "Product",
        select: "name _id",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error getting orders:", error);
    return res.status(500).json({ message: "Server error while fetching orders." });
  }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    if (!id || !status) {
      return res.status(400).json({ message: "Order id and status are required." });
    }
  
    if (!["accept", "reject"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value. Only 'accept' or 'reject' allowed." });
    }
  
    const updateFields = {};
  
    if (status === "accept") {
      updateFields.isOrderAccepted = true;
      updateFields.isOrderRejected = false;
    } else if (status === "reject") {
      updateFields.isOrderRejected = true;
      updateFields.isOrderAccepted = false;
    }
  
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );
  
    if (!updatedOrder) {
      res.status(404);
      throw new Error("Order not found");
    }
  
    // Get email and name from contactDetails on order schema when user is not logged in
    const userEmail = updatedOrder.contactDetails?.email;
    // Optionally fallback to a default name or use from contactDetails if available
    const userName = updatedOrder.contactDetails?.fullName || "Customer";
  
    if (userEmail) {
      await sendOrderStatusEmail(userEmail, userName, updatedOrder._id, status === "accept" ? "accepted" : "rejected");
    }
  
    res.json({ message: `Order ${status}ed successfully.`, order: updatedOrder });
  };

  exports.getOrderById = async (req, res) => {
    const { id } = req.params;
    console.log('give me id ',id)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
  
    const orderAggregate = await Order.aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $unwind: "$orderItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $lookup: {
            from: "media", 
            localField: "productDetails.image",
            foreignField: "_id",
            as: "productImages"
          }
        },
        {
          $group: {
            _id: "$_id",
            shippingAddress: { $first: "$shippingAddress" },
            contactDetails: { $first: "$contactDetails" },
            paymentMethod: { $first: "$paymentMethod" },
            paymentResult: { $first: "$paymentResult" },
            itemsPrice: { $first: "$itemsPrice" },
            shippingPrice: { $first: "$shippingPrice" },
            totalPrice: { $first: "$totalPrice" },
            isPaid: { $first: "$isPaid" },
            paidAt: { $first: "$paidAt" },
            isCancelled: { $first: "$isCancelled" },
            isOrderAccepted: { $first: "$isOrderAccepted" },
            isOrderRejected: { $first: "$isOrderRejected" },
            isDelivered: { $first: "$isDelivered" },
            isDispatched: { $first: "$isDispatched" },
            isOutForDelivery: { $first: "$isOutForDelivery" },
            deliveredAt: { $first: "$deliveredAt" },
            orderItems: {
              $push: {
                name: "$orderItems.name",
                quantity: "$orderItems.quantity",
                price: "$orderItems.price",
                product: "$orderItems.product",
                productDetails: "$productDetails",
                productImages: "$productImages"
              }
            }
          }
        }
      ]);
  
    if (!orderAggregate.length) {
      return res.status(404).json({ message: "Order not found." });
    }
  
  
    res.status(200).json(orderAggregate[0]);
  }

  exports.updateShippingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    // Validate ID and status
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id." });
    }
    if (!["dispatched", "outForDelivery", "delivered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }
  
    let updateFields = {};
  
    if (status === "dispatched") {
      updateFields.isDispatched = true;
    } else if (status === "outForDelivery") {
      updateFields.isOutForDelivery = true;
    } else if (status === "delivered") {
      updateFields.isDelivered = true;
      updateFields.deliveredAt = new Date();
    }
  
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );
  
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
  
    // Get user email and name from contactDetails on order
    const userEmail = updatedOrder.contactDetails?.email;
    const userName = updatedOrder.contactDetails?.fullName || "Customer";
  
    if (userEmail) {
      try {
        await sendOrderStatusEmail(userEmail, userName, updatedOrder._id, status);
      } catch (err) {
        console.error("Failed to send status email:", err);
        // Optionally inform client email sending failed
      }
    }
  
    res.status(200).json({ message: `Order marked as ${status}.`, order: updatedOrder });
  };

// Function to check PhonePe payment status
// exports.getStatusOfPayment = async (req, res) => {
//   console.log('getStatusOfPayment invoked with query:', req.query);

//   try {
//     const {merchantOrderId} = req.query
//     if(!merchantOrderId){
//       return res.status(400).send("MerchantOrderId is required")
//     }
//     const responce = await client.getOrderStatus(merchantOrderId)

//     const status = responce.state
//     if(status === 'COMPLETED'){
//       // return res.redirect('http://localhost:3001/payment-success');
//       return res.redirect('https://www.kitchenvizbuy.com/payment-success');
//     } else {
//       return res.redirect('https://www.kitchenvizbuy.com/payment-failure');

//       // return res.redirect('http://localhost:3001/payment-failure');
//     }
    

//   } catch (error) {
//    console.log('error while Payment', error)
//   }
// };


exports.getStatusOfPayment = async (req, res) => {
  console.log('getStatusOfPayment invoked with query:', req.query);

  try {
    const { merchantOrderId } = req.query;
    if (!merchantOrderId) {
      return res.status(400).send("MerchantOrderId is required");
    }
    const responce = await client.getOrderStatus(merchantOrderId);
    const status = responce.state;

    // Update paymentResult.status before redirecting
    if (status === 'COMPLETED') {
      await Order.findByIdAndUpdate(
        merchantOrderId,
        { 
          'paymentResult.status': 'COMPLETED' // update to capital since your provider returns this
        }
      );
      return res.redirect('https://www.kitchenvizbuy.com/payment-success');
    } else {
      await Order.findByIdAndUpdate(
        merchantOrderId,
        { 
          'paymentResult.status': 'FAILURE'
        }
      );
      return res.redirect('https://www.kitchenvizbuy.com/payment-failure');
    }

  } catch (error) {
   console.log('error while Payment', error);
  }
};
