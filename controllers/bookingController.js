const { pool } = require('../config/database');
const { validateBookingInput } = require('../utils/validations');

// Book a seat with comprehensive race condition handling
exports.bookSeat = async (req, res) => {
  // Validate input first
  const validationResult = validateBookingInput(req.body);
  
  if (!validationResult.isValid) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: validationResult.errors 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    // Start transaction to handle race conditions
    await connection.beginTransaction();

    const { train_id, seats_to_book = 1 } = req.body;
    const user_id = req.user.id;

    // Step 1: Lock the train row to prevent concurrent modifications
    const [[train]] = await connection.query(
      'SELECT id, train_name, source, destination, available_seats FROM trains WHERE id = ? FOR UPDATE', 
      [train_id]
    );

    // Step 2: Validate train existence
    if (!train) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Train not found',
        details: 'The specified train does not exist in our system' 
      });
    }

    // Step 3: Check seat availability
    if (train.available_seats < seats_to_book) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Insufficient seat availability',
        available_seats: train.available_seats,
        requested_seats: seats_to_book,
        train_details: {
          name: train.train_name,
          source: train.source,
          destination: train.destination
        }
      });
    }

    // Step 4: Check if user has already booked seats on this train today
    const [[existingBooking]] = await connection.query(
      `SELECT COUNT(*) as bookings_today 
       FROM bookings 
       WHERE user_id = ? AND train_id = ? AND DATE(booking_date) = CURDATE()`,
      [user_id, train_id]
    );

    // Prevent multiple bookings on the same train in a day (optional business rule)
    if (existingBooking.bookings_today > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        message: 'Booking limit exceeded',
        details: 'You can only book once per train per day' 
      });
    }

    // Step 5: Create booking record
    const [bookingResult] = await connection.query(
      'INSERT INTO bookings (user_id, train_id, seats_booked) VALUES (?, ?, ?)',
      [user_id, train_id, seats_to_book]
    );

    // Step 6: Update train seat availability with optimistic locking
    const [updateResult] = await connection.query(
      'UPDATE trains SET available_seats = available_seats - ? WHERE id = ? AND available_seats >= ?',
      [seats_to_book, train_id, seats_to_book]
    );

    // Step 7: Verify update was successful
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({ 
        message: 'Booking failed',
        details: 'Seats may have been booked by another user simultaneously',
        available_seats: train.available_seats
      });
    }

    // Step 8: Commit the transaction
    await connection.commit();

    // Step 9: Prepare booking confirmation
    const bookingConfirmation = {
      booking_id: bookingResult.insertId,
      train_id: train_id,
      train_name: train.train_name,
      source: train.source,
      destination: train.destination,
      seats_booked: seats_to_book,
      booking_date: new Date()
    };

    res.status(201).json({ 
      message: 'Seat booked successfully',
      booking: bookingConfirmation
    });

  } catch (error) {
    // Comprehensive error handling
    await connection.rollback();
    console.error('Booking Error:', error);

    res.status(500).json({ 
      message: 'Booking process failed', 
      error: 'An unexpected error occurred during booking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Always release the database connection
    connection.release();
  }
};

// Get user's booking history
// Get user's booking history
exports.getUserBookings = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Fetch comprehensive booking details
    const [bookings] = await pool.query(`
      SELECT 
        b.id AS id, 
        b.seats_booked, 
        b.booking_date,
        t.train_name,
        t.source,
        t.destination,
        t.id AS train_id
      FROM bookings b
      JOIN trains t ON b.train_id = t.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
      LIMIT 50
    `, [user_id]);

    // Calculate total booked seats
    const total_booked_seats = bookings.reduce((sum, booking) => sum + booking.seats_booked, 0);

    res.json({
      message: 'Bookings retrieved successfully',
      total_bookings: bookings.length,
      total_seats_booked: total_booked_seats,
      bookings
    });
  } catch (error) {
    console.error('Booking Retrieval Error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve bookings', 
      error: 'An unexpected error occurred'
    });
  }
};
// Cancel a specific booking (optional feature)
exports.cancelBooking = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { booking_id } = req.params;
    const user_id = req.user.id;

    // Start transaction
    await connection.beginTransaction();

    // Find the booking details
    const [[booking]] = await connection.query(
      `SELECT b.id, b.train_id, b.seats_booked, b.booking_date, 
              TIMESTAMPDIFF(HOUR, b.booking_date, NOW()) AS hours_since_booking
       FROM bookings b
       WHERE b.id = ? AND b.user_id = ?`,
      [booking_id, user_id]
    );

    // Validate booking exists and belongs to user
    if (!booking) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Booking not found or unauthorized' 
      });
    }

    // Optional: Prevent cancellation after certain time (e.g., 2 hours)
    if (booking.hours_since_booking > 2) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Booking cannot be cancelled after 2 hours' 
      });
    }

    // Delete booking
    await connection.query(
      'DELETE FROM bookings WHERE id = ?', 
      [booking_id]
    );

    // Restore train seat availability
    await connection.query(
      'UPDATE trains SET available_seats = available_seats + ? WHERE id = ?',
      [booking.seats_booked, booking.train_id]
    );

    // Commit transaction
    await connection.commit();

    res.json({ 
      message: 'Booking cancelled successfully',
      refunded_seats: booking.seats_booked
    });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ 
      message: 'Cancellation failed', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  bookSeat: exports.bookSeat,
  getUserBookings: exports.getUserBookings,
  cancelBooking: exports.cancelBooking
};