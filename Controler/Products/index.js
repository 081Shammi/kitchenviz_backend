const Product = require('../../Modals/Products');

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      image,
      images,
      category,
      description,
      price,
      countInStock,
      productDiscountedPrice,
    } = req.body;

    // Validate required fields
    if (!name || !image || !category || !description || countInStock === undefined || productDiscountedPrice === undefined) {
      return res.status(400).json({ message: 'Required fields are missing or invalid.' });
    }

    // Check for duplicate product name
    const existingProduct = await Product.findOne({ name: name.trim() });
    if (existingProduct) {
      return res.status(409).json({ message: 'Product with this name already exists.' });
    }

    const product = new Product({
      name: name.trim(),
      image,
      images,
      category,
      description,
      price,
      countInStock,
      productDiscountedPrice,
      rating: 0,
      numReviews: 0,
      reviews: [],
    });

    const createdProduct = await product.save();
    return res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Server error while creating product.' });
  }
};

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 });
    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Server error while fetching products.' });
  }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
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
      image,
      images,
      category,
      description,
      price,
      countInStock,
      productDiscountedPrice,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Update fields if present in request body
    if (name) product.name = name.trim();
    if (image) product.image = image;
    if (images) product.images = images;
    if (category) product.category = category;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (countInStock !== undefined) product.countInStock = countInStock;
    if (productDiscountedPrice !== undefined) product.productDiscountedPrice = productDiscountedPrice;

    const updatedProduct = await product.save();
    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Server error while updating product.' });
  }
};
