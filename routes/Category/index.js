import express from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
} from '../../Controler/Category';

const router = express.Router();

// POST create a category
router.post('/', createCategory);

// GET all categories
router.get('/', getCategories);

// GET category by ID
router.get('/:id', getCategoryById);

export default router;
