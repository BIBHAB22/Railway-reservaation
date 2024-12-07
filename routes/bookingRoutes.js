const express = require('express');
const { 
  bookSeat, 
  getUserBookings 
} = require('../controllers/bookingController');
const { 
  authenticateUser 
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticateUser, bookSeat);
router.get('/my-bookings', authenticateUser, getUserBookings);

module.exports = router;