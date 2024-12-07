// controllers/trainController.js
const { pool } = require('../config/database');
const { validateTrainInput } = require('../utils/validations');

// Add Train function
exports.addTrain = async (req, res) => {
  try {
    const validationResult = validateTrainInput(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationResult.errors
      });
    }

    const { train_name, source, destination, total_seats } = req.body;

    const [result] = await pool.query(
      'INSERT INTO trains (train_name, source, destination, total_seats, available_seats) VALUES (?, ?, ?, ?, ?)',
      [train_name, source, destination, total_seats, total_seats]
    );

    res.status(201).json({
      message: 'Train added successfully',
      trainId: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add train',
      error: error.message
    });
  }
};

// Update Train Seats function
exports.updateTrainSeats = async (req, res) => {
  const { trainId } = req.params;
  const { seats_to_add } = req.body;

  try {
    // Add validation for seats_to_add here if needed
    const [result] = await pool.query(
      'UPDATE trains SET available_seats = available_seats + ? WHERE id = ?',
      [seats_to_add, trainId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Train not found'
      });
    }

    res.status(200).json({
      message: 'Seats updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update seats',
      error: error.message
    });
  }
};

// Get Train Availability function
exports.getTrainAvailability = async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM trains');
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve train availability',
      error: error.message
    });
  }
};
