const mongoose = require('mongoose');

const newspaperSchema = new mongoose.Schema({
  newspaper_name: {
    type: String,
    required: [true, 'Newspaper name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'distributed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  total_unsold: {
    type: Number,
    default: 0,
    min: [0, 'Unsold quantity cannot be negative']
  },
  received_quantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative']
  },
  status_updates: [{
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'distributed', 'delivered', 'cancelled']
    },
    received_quantity: Number,
    updated_at: {
      type: Date,
      default: Date.now
    }
  }],
  hierarchy: {
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    district_distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    area_distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
newspaperSchema.index({ sender_id: 1, receiver_id: 1 });
newspaperSchema.index({ 'hierarchy.manufacturer_id': 1 });
newspaperSchema.index({ 'hierarchy.district_distributor_id': 1 });
newspaperSchema.index({ 'hierarchy.area_distributor_id': 1 });
newspaperSchema.index({ 'hierarchy.vendor_id': 1 });

module.exports = mongoose.model('Newspaper', newspaperSchema); 