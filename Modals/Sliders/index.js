

import mongoose from 'mongoose';


const slideProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    images: [String],
    description: { type: String, required: true },
    product:{ type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Product'}},
  {
    timestamps: true,
  }
);
const ProductSlider = mongoose.model('ProductSlider', slideProductSchema);
export default ProductSlider;


