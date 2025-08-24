const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const orderSchema = new mongoose.Schema(
  {
    orderItems: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        image: [{
            type: ObjectId,
            ref: "media",
            required: false
        }],
        price: { type: Number, required: true },
        product: { type: ObjectId, ref: 'Product', required: true },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      location: {
        lat: Number,
        lng: Number,
        address: String,
        name: String,
        vicinity: String,
        googleAddressId: String,
      },
    },
    contactDetails: {
      email: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      address: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      city: { type: String, required: true },
      age: { type: String }, 
    },
    paymentMethod: { type: String },
    paymentResult: {
      id: String,
      status: String,
      update_time: Date,
      email_address: String,
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    user: { type: ObjectId, ref: 'User', required: false }, 
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isRead: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
    isOrderAccepted: { type: Boolean, default: false },
    isOrderRejected: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isDispatched: { type: Boolean, default: false },
    isOutForDelivery: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
