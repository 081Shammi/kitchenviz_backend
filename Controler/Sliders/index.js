const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const ProductSlider = require('../../Modals/Sliders');

// Create a new slider
exports.createSlider = async (req, res) => {
  try {
    const { name, image, description, product } = req.body;

    if (
      !name ||
      !Array.isArray(image) || image.length === 0 ||
      !description ||
      !product
    ) {
      return res.status(400).json({ message: 'Required fields are missing or invalid.' });
    }

    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    for (const id of image) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: `Invalid media ID: ${id}` });
      }
    }

    const existingSlider = await ProductSlider.findOne({ name: name.trim() });
    if (existingSlider) {
      return res.status(409).json({ message: 'Slider with this name already exists.' });
    }

    const slider = new ProductSlider({
      name: name.trim(),
      image: image.map(id => new ObjectId(id)),
      description,
      product: new ObjectId(product),
    });

    const createdSlider = await slider.save();
    return res.status(201).json(createdSlider);
  } catch (error) {
    console.error('Error creating slider:', error);
    return res.status(500).json({ message: 'Server error while creating slider.' });
  }
};


exports.getAllSliders = async (req, res) => {
    try {
      const sliders = await ProductSlider.aggregate([
        // Lookup to join product details
        {
          $lookup: {
            from: 'products',           // MongoDB collection name for products
            localField: 'product',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        { $unwind: '$productDetails' },
  
        // Lookup to join media details for images
        {
          $lookup: {
            from: 'media',              // MongoDB collection name for media
            localField: 'image',
            foreignField: '_id',
            as: 'imageDetails'
          }
        },
  
        // Project to select and rename fields as needed
        {
          $project: {
            name: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            product: '$productDetails',
            image: '$imageDetails',
          }
        },
  
        // Sort by creation date descending
        { $sort: { createdAt: -1 } }
      ]);
  
      return res.status(200).json(sliders);
    } catch (error) {
      console.error('Error fetching sliders:', error);
      return res.status(500).json({ message: 'Server error while fetching sliders.' });
    }
  };
  
// Update an existing slider by ID
exports.updateSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description, product } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid slider ID.' });
    }

    const slider = await ProductSlider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found.' });
    }

    if (name) slider.name = name.trim();
    if (image) {
      if (!Array.isArray(image)) {
        return res.status(400).json({ message: '"image" must be an array of media IDs.' });
      }
      for (const mediaId of image) {
        if (!mongoose.Types.ObjectId.isValid(mediaId)) {
          return res.status(400).json({ message: `Invalid media ID: ${mediaId}` });
        }
      }
      slider.image = image.map(id => new ObjectId(id));
    }
    if (description) slider.description = description;
    if (product) {
      if (!mongoose.Types.ObjectId.isValid(product)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
      }
      slider.product = new ObjectId(product);
    }

    const updatedSlider = await slider.save();
    return res.status(200).json(updatedSlider);
  } catch (error) {
    console.error('Error updating slider:', error);
    return res.status(500).json({ message: 'Server error while updating slider.' });
  }
};

// Delete a slider by ID
exports.deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid slider ID.' });
    }

    const slider = await ProductSlider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found.' });
    }

    await slider.remove();
    return res.status(200).json({ message: 'Slider deleted successfully.' });
  } catch (error) {
    console.error('Error deleting slider:', error);
    return res.status(500).json({ message: 'Server error while deleting slider.' });
  }
};
