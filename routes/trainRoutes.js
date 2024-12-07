// routes/trainRoutes.js
const express = require('express');
const {
  addTrain,
  getTrainAvailability,
  updateTrainSeats
} = require('../controllers/trainController');
const {
  authenticateUser,
  isAdmin
} = require('../middleware/authMiddleware');

const router = express.Router();

// Admin routes
router.post('/', authenticateUser, isAdmin, addTrain); // Add train route
router.put('/:trainId/seats', authenticateUser, isAdmin, updateTrainSeats); // Update train seats route

// User routes
router.get('/availability', authenticateUser, getTrainAvailability); // Get train availability route

module.exports = router;
