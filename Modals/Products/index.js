const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: [{
        type: ObjectId,
        ref: "media",
        required: false
    }],
    category: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    description: { type: String, required: true },
    price: { type: Number },
    countInStock: { type: Number, required: true },
    productDiscountedPrice: { type: Number, required: true },
    rating: { type: Number},
    numReviews: { type: Number },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);
productSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});
module.exports = mongoose.model('Product', productSchema);
