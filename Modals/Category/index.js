import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
    {
          name: { type: String, required: true },
        
    },
    {
      timestamps: true,
    }
  );
  
  
  
  
  
  
  
  
  const Category = mongoose.model('Category', productCategorySchema);
  export default Category;
  