const validator = require('validator');

// Validate user registration input
function validateUserRegistration(userData) {
  const errors = {};

  // Username validation
  if (!userData.username) {
    errors.username = 'Username is required';
  } else if (userData.username.length < 3) {
    errors.username = 'Username must be at least 3 characters long';
  }

  // Email validation
  if (!userData.email) {
    errors.email = 'Email is required';
  } else if (!validator.isEmail(userData.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!userData.password) {
    errors.password = 'Password is required';
  } else {
    if (userData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(userData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(userData.password)) {
      errors.password = 'Password must contain at least one number';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate train input
function validateTrainInput(trainData) {
  const errors = {};

  // Train name validation
  if (!trainData.train_name) {
    errors.train_name = 'Train name is required';
  } else if (trainData.train_name.length < 3) {
    errors.train_name = 'Train name must be at least 3 characters long';
  }

  // Source validation
  if (!trainData.source) {
    errors.source = 'Source station is required';
  }

  // Destination validation
  if (!trainData.destination) {
    errors.destination = 'Destination station is required';
  }

  // Prevent same source and destination
  if (trainData.source && trainData.destination && 
      trainData.source.toLowerCase() === trainData.destination.toLowerCase()) {
    errors.destination = 'Source and destination cannot be the same';
  }

  // Total seats validation
  if (!trainData.total_seats) {
    errors.total_seats = 'Total seats is required';
  } else if (!Number.isInteger(trainData.total_seats)) {
    errors.total_seats = 'Total seats must be a whole number';
  } else if (trainData.total_seats <= 0) {
    errors.total_seats = 'Total seats must be greater than zero';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate booking input
function validateBookingInput(bookingData) {
  const errors = {};

  // Train ID validation
  if (!bookingData.train_id) {
    errors.train_id = 'Train ID is required';
  }

  // Seats to book validation
  if (!bookingData.seats_to_book) {
    errors.seats_to_book = 'Number of seats is required';
  } else {
    const seatsToBook = Number(bookingData.seats_to_book);
    if (!Number.isInteger(seatsToBook)) {
      errors.seats_to_book = 'Seats must be a whole number';
    } else if (seatsToBook <= 0) {
      errors.seats_to_book = 'Number of seats must be greater than zero';
    } else if (seatsToBook > 6) {  // Assuming max 6 seats per booking
      errors.seats_to_book = 'Maximum 6 seats can be booked in a single transaction';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateUserRegistration,
  validateTrainInput,
  validateBookingInput
};