

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const slideProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: [{
      type: ObjectId,
      ref: "media",
      required: false
    }],    
    description: { type: String, required: true },
    product:{ type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Product'}},
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProductSlider', slideProductSchema);



