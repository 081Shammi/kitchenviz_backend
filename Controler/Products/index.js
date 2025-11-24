const mongoose = require('mongoose');
const Product = require('../../Modals/Products');
const { ObjectId } = mongoose.Types;


exports.createProduct = async (req, res) => {
    try {
      const {
        name,
        image,
        category,
        description,
        price,
        countInStock,
        productDiscountedPrice,
        key_features,
        specification,
        use_of_product,
        safety_instructions,
        varenty
      } = req.body;
  
      // validations here...
  
      // Convert image string IDs to ObjectId instances using 'new'
      const imageObjectIds = image.map(id => new ObjectId(id));
  
      // Convert category to ObjectId instance
      const categoryObjectId = new ObjectId(category);
  
      // Continue with creation
      const product = new Product({
        name: name.trim(),
        image: imageObjectIds,
        category: categoryObjectId,
        description,
        price,
        countInStock,
        productDiscountedPrice,
        key_features,
        specification,
        use_of_product,
        safety_instructions,
        varenty,
        rating: 0,
        numReviews: 0,
      });
  
      const createdProduct = await product.save();
    //   await createdProduct.populate('category', 'name').populate('image').execPopulate();
  
      return res.status(201).json(createdProduct);
  
    } catch (error) {
      console.error('Error creating product:', error);
      console.error(error.stack);
      return res.status(500).json({ message: 'Server error while creating product.' });
    }
  };

// Get all products
exports.getProducts = async (req, res) => {
    try {
      const products = await Product.aggregate([
        {
          $lookup: {
            from: 'categories',          
            localField: 'category',       
            foreignField: '_id',          
            as: 'categoryDetails'
          }
        },
        { $unwind: '$categoryDetails' }, 
  
        {
          $lookup: {
            from: 'media',               
            localField: 'image',          
            foreignField: '_id',
            as: 'imageDetails'
          }
        },
  
        {
          $project: {
            name: 1,
            description: 1,
            price: 1,
            countInStock: 1,
            productDiscountedPrice: 1,
            rating: 1,
            numReviews: 1,
            reviews: 1,
            createdAt: 1,
            updatedAt: 1,
            category: '$categoryDetails.name',  
            image: '$imageDetails',             
          }
        },
  
        { $sort: { createdAt: -1 } }
      ]);
  
      return res.status(200).json(products);
    } catch (error) {
      console.error('Error fetching products with aggregation:', error);
      return res.status(500).json({ message: 'Server error while fetching products.' });
    }
  };
  

// Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('image');   

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ message: 'Server error while fetching product.' });
  }
};

// Update a product by ID
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      image,   // Expect array of ObjectId
      images,
      category,
      description,
      price,
      countInStock,
      productDiscountedPrice,
      key_features,
      specification,
      use_of_product,
      safety_instructions,
      varenty
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Update fields if present in request body
    if (name) product.name = name.trim();
    if (image) {
      if (!Array.isArray(image)) {
        return res.status(400).json({ message: '"image" must be an array of media ObjectIds.' });
      }
      product.image = image;
    }
    if (images) product.images = images;
    if (category) product.category = category;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (countInStock !== undefined) product.countInStock = countInStock;
    if (productDiscountedPrice !== undefined) product.productDiscountedPrice = productDiscountedPrice;
    if (key_features !== undefined) product.key_features = key_features;
    if (specification !== undefined) product.specification = specification;
    if (use_of_product !== undefined) product.use_of_product = use_of_product;
    if (safety_instructions !== undefined) product.safety_instructions = safety_instructions;
    if (varenty !== undefined) product.varenty = varenty;

    // Save updated product
    const updatedProduct = await product.save();

    // Populate fields on the document (supported in Mongoose 6+)
    await updatedProduct.populate('category', 'name');
    await updatedProduct.populate('image'); // You can pass options if needed

    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Server error while updating product.' });
  }
};



exports.deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid slider ID.' });
      }
  
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
  
      await product .deleteOne();
      return res.status(200).json({ message: 'Slider deleted successfully.' });
    } catch (error) {
      console.error('Error deleting slider:', error);
      return res.status(500).json({ message: 'Server error while deleting slider.' });
    }
  };