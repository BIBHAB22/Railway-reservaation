const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validateUserRegistration } = require('../utils/validations');

exports.registerUser = async (req, res) => {
  try {
    // Validate input
    const validationResult = validateUserRegistration(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationResult.errors 
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.status(200).json({ 
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
};
