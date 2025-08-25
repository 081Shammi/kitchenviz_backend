const mongoose = require("mongoose");
const Order = require("../../Modals/OrderSchema");
const Product = require("../../Modals/Products"); // To validate product existence
const { ObjectId } = mongoose.Types;

// Validation helper for a single order item
// function isValidOrderItem(item) {
//   return (
//     item &&
//     typeof item.name === "string" && item.name.trim().length > 0 &&
//     typeof item.quantity === "number" && item.quantity > 0 &&
//     typeof item.image === "string" && item.image.trim().length > 0 &&
//     typeof item.price === "number" && item.price >= 0 &&
//     item.product && ObjectId.isValid(item.product)
//   );
// }

// Place a new order
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
      // taxPrice,
      totalPrice,
    } = req.body;

    // --- 1. Basic validation for presence and type ---
    if (
      !Array.isArray(orderItems) ||
      orderItems.length === 0 ||
      !shippingAddress ||
      !contactDetails ||
      typeof itemsPrice !== "number" ||
      typeof shippingPrice !== "number" ||
      // typeof taxPrice !== "number" || // if you want to enforce in future
      typeof totalPrice !== "number"
    ) {
      return res.status(400).json({
        message:
          "Missing or invalid required fields: orderItems, shippingAddress, contactDetails, price fields",
      });
    }

    // --- 2. Validate each order item ---
    for (const item of orderItems) {
    //   if (!isValidOrderItem(item)) {
    //     return res
    //       .status(400)
    //       .json({ message: "One or more order items are invalid." });
    //   }
      // Check product existence and stock availability
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return res
          .status(400)
          .json({ message: `Product not found: ${item.product}` });
      }
      if (item.quantity > productDoc.countInStock) {
        return res.status(400).json({
          message: `Not enough stock for product "${productDoc.name}".`,
        });
      }
    }

    // --- 3. Validate shipping address fields ---
    const addressFields = [
      "fullName",
      "address",
      "city",
      "postalCode",
      "country",
    ];
    for (const field of addressFields) {
      if (
        !shippingAddress[field] ||
        shippingAddress[field].toString().trim().length === 0
      ) {
        return res.status(400).json({
          message: `Missing or empty shipping address field: ${field}`,
        });
      }
    }

    // --- 4. Validate contact details fields ---
    const contactFields = [
      "email",
      "phoneNumber",
      "address",
      "postalCode",
      "country",
      "city",
    ];
    for (const field of contactFields) {
      if (
        !contactDetails[field] ||
        contactDetails[field].toString().trim().length === 0
      ) {
        return res.status(400).json({
          message: `Missing or empty contact details field: ${field}`,
        });
      }
    }

    // --- 5. Assign user if authenticated ---
    let user = null;
    if (req.user && req.user._id) {
      user = req.user._id; // Assume auth middleware sets req.user
    }

    // --- 6. Create and save order ---
    const order = new Order({
      orderItems,
      shippingAddress,
      contactDetails,
      paymentMethod,
      paymentResult,
      itemsPrice,
      shippingPrice,
      // taxPrice,
      totalPrice,
      user,
    });
    const createdOrder = await order.save();

    // --- 7. Decrement product stock (await each update) ---
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: -item.quantity } },
        { new: true }
      );
    }

    return res.status(201).json({
      message: "Order placed successfully.",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res
      .status(500)
      .json({ message: "Server error while placing order." });
  }
};

// Controller to get all orders (for admin or analytics)
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
  
    res.json({ message: `Order ${status}ed successfully.`, order: updatedOrder });
  };

  exports.getOrderById = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
  
    // Aggregation pipeline
    const orderAggregate = await Order.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $unwind: "$orderItems"
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: "$productDetails"
      },
      // Optionally populate images from media collection:
      {
        $lookup: {
          from: "media", // collection name for images
          localField: "productDetails.image",
          foreignField: "_id",
          as: "productImages"
        }
      },
      // Reshape the final structure:
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
        //   user: { $first: "$user" },
          isPaid: { $first: "$isPaid" },
          paidAt: { $first: "$paidAt" },
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
  
    // You may want to further populate user details here if needed
  
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
    res.status(200).json({ message: `Order marked as ${status}.`, order: updatedOrder });
  }