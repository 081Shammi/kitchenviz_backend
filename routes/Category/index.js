const express = require("express");
const categoryController = require("../../Controler/Category");
const { body } = require("express-validator");
const router = express.Router();

// POST create a category
router.post('/', categoryController.createCategory);

// GET all categories
router.get('/', categoryController.getCategories);

// GET category by ID
router.get('/:id', categoryController.getCategoryById);

module.exports = router;
