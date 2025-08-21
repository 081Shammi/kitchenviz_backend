import mongoose from 'mongoose';

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
    image: { type: String,required: true },
    images: [String],
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

const Product = mongoose.model('Product', productSchema);
export default Product;
