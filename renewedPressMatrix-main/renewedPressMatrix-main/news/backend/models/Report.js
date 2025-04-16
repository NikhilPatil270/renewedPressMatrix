const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  newspapers_received: {
    type: Number,
    required: true,
    min: 0
  },
  newspapers_sold: {
    type: Number,
    required: true,
    min: 0
  },
  newspapers_unsold: {
    type: Number,
    required: true,
    min: 0
  },
  revenue_generated: {
    type: Number,
    required: true,
    min: 0
  }
});

// Index for faster queries
reportSchema.index({ user_id: 1, date: -1 });

// Virtual for calculating profit/loss
reportSchema.virtual('profit_loss').get(function() {
  return this.revenue_generated - (this.newspapers_received * 5); // Assuming cost price is 5 per newspaper
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report; 