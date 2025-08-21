const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema(
    {
          name: { type: String, required: true },
        
    },
    {
      timestamps: true,
    }
  );
  
  
  
  module.exports = mongoose.model('Category', productCategorySchema);
