const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, upper_role_id } = req.body;
    console.log('Signup request received:', { name, email, role, upper_role_id });

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manufacturer', 'district_distributor', 'area_distributor', 'vendor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }

    // Create user object based on role
    const userData = {
      name,
      email,
      password,
      role
    };

    // Only add upper_role_id if not admin and not manufacturer
    if (role !== 'admin' && role !== 'manufacturer') {
      if (!upper_role_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Upper role ID is required for non-admin and non-manufacturer users'
        });
      }
      userData.upper_role_id = upper_role_id;
    }

    console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });

    // Create new user
    const user = await User.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', ')
      });
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    }

    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create account',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 