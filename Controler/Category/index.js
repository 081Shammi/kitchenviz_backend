import Category from '../../Modals/Category';

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate request body
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check duplicate category
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category already exists' });
    }

    const category = new Category({ name: name.trim() });
    const savedCategory = await category.save();

    return res.status(201).json(savedCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ message: 'Server error while creating category' });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }); // newest first
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    return res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch (error) {
    console.error('Error getting category:', error);
    return res.status(500).json({ message: 'Server error while fetching category' });
  }
};
