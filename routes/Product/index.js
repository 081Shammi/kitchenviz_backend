const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../../Controler/Products');

const router = express.Router();

// POST create product
router.post('/', createProduct);

// GET all products
router.get('/', getProducts);

// GET product by ID
router.get('/:id', getProductById);

// PUT update product by ID
router.put('/:id', updateProduct);

router.delete('/:id', deleteProduct);


module.exports = router;
