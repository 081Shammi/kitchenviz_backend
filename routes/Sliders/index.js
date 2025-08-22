const express = require('express');
const {
  createSlider,
  updateSlider,
  deleteSlider,
  getAllSliders
} = require('../../Controler/Sliders');

const router = express.Router();

// Add new slider
router.post('/', createSlider);

// GET all sliders
router.get('/', getAllSliders);

// Edit slider by ID
router.put('/:id', updateSlider);

// Delete slider by ID
router.delete('/:id', deleteSlider);

module.exports = router;
