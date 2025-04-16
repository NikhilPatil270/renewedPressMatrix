const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Newspaper = require('../models/Newspaper');
const User = require('../models/User');
const protect = require('../middleware/auth');

// Generate daily report (All roles)
router.post('/generate', async (req, res) => {
  try {
    const { date } = req.body;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get newspapers for the day
    const newspapers = await Newspaper.find({
      receiver_id: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate totals
    const totalReceived = newspapers.reduce((sum, paper) => sum + paper.total_received, 0);
    const totalUnsold = newspapers.reduce((sum, paper) => sum + paper.total_unsold, 0);
    const totalSold = totalReceived - totalUnsold;
    const revenue = totalSold * 10; // Assuming selling price is 10 per newspaper

    // Create report
    const report = await Report.create({
      user_id: req.user._id,
      date: startDate,
      newspapers_received: totalReceived,
      newspapers_sold: totalSold,
      newspapers_unsold: totalUnsold,
      revenue_generated: revenue
    });

    res.status(201).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get user's reports
router.get('/my-reports', async (req, res) => {
  try {
    const reports = await Report.find({ user_id: req.user._id })
      .sort('-date');

    res.json({
      status: 'success',
      data: reports
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get reports for subordinates (Admin and Distributors)
router.get('/subordinates', async (req, res) => {
  try {
    const subordinates = await User.find({ upper_role_id: req.user._id });
    const subordinateIds = subordinates.map(sub => sub._id);

    const reports = await Report.find({
      user_id: { $in: subordinateIds }
    })
    .populate('user_id', 'name role')
    .sort('-date');

    res.json({
      status: 'success',
      data: reports
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get analytics data
router.get('/analytics', protect, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build query based on user role
    let query = {};
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Role-specific queries
    switch (userRole) {
      case 'admin':
        // Admin can see all data
        break;
      case 'manufacturer':
        query = { 'hierarchy.manufacturer_id': userId };
        break;
      case 'district_distributor':
      case 'area_distributor':
        query.$or = [
          { sender_id: userId },
          { receiver_id: userId }
        ];
        break;
      case 'vendor':
        query.receiver_id = userId;
        break;
      default:
        query.sender_id = userId;
    }

    // Get all distributions for the period
    const distributions = await Newspaper.find(query)
      .populate('sender_id', 'name')
      .populate('receiver_id', 'name')
      .sort({ created_at: 1 });

    // Calculate analytics based on user role
    const analytics = {
      totalRevenue: 0,
      totalNewspapers: 0,
      totalSales: 0,
      totalUnsold: 0,
      totalProduction: 0,
      totalReceived: 0,
      distributionRate: 0,
      dailyData: []
    };

    // Process daily data
    const dailyDataMap = new Map();
    distributions.forEach(dist => {
      const date = new Date(dist.created_at).toISOString().split('T')[0];
      
      if (!dailyDataMap.has(date)) {
        dailyDataMap.set(date, {
          date,
          received: 0,
          sold: 0,
          unsold: 0
        });
      }

      const dailyData = dailyDataMap.get(date);
      
      // Role-specific calculations
      if (userRole === 'manufacturer') {
        dailyData.received += dist.quantity;
        if (dist.status === 'delivered') {
          dailyData.sold += dist.quantity - (dist.total_unsold || 0);
          dailyData.unsold += dist.total_unsold || 0;
        }
        analytics.totalProduction += dist.quantity;
      } else if (['district_distributor', 'area_distributor'].includes(userRole)) {
        if (dist.sender_id._id.toString() === userId.toString()) {
          dailyData.received += dist.quantity;
          analytics.totalReceived += dist.quantity;
        }
        if (dist.status === 'delivered') {
          dailyData.sold += dist.quantity - (dist.total_unsold || 0);
          dailyData.unsold += dist.total_unsold || 0;
        }
      } else if (userRole === 'vendor') {
        dailyData.received += dist.quantity;
        if (dist.status === 'delivered') {
          dailyData.sold += dist.quantity - (dist.total_unsold || 0);
          dailyData.unsold += dist.total_unsold || 0;
        }
      }

      // Update totals
      analytics.totalNewspapers += dist.quantity;
      if (dist.status === 'delivered') {
        analytics.totalSales += dist.quantity - (dist.total_unsold || 0);
        analytics.totalUnsold += dist.total_unsold || 0;
      }
    });

    // Convert daily data map to array
    analytics.dailyData = Array.from(dailyDataMap.values());

    // Calculate distribution rate
    if (analytics.totalNewspapers > 0) {
      analytics.distributionRate = (analytics.totalSales / analytics.totalNewspapers) * 100;
    }

    // Format data for pie chart
    analytics.pieData = [
      { name: 'Sold', value: analytics.totalSales },
      { name: 'Unsold', value: analytics.totalUnsold }
    ];

    res.json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate analytics data'
    });
  }
});

// Get sales report for vendors
router.get('/sales', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { receiver_id: req.user._id };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const distributions = await Newspaper.find(query)
      .populate('sender_id', 'name')
      .sort({ created_at: -1 });

    // Calculate summary
    const summary = {
      total_received: 0,
      total_sold: 0,
      total_unsold: 0,
      total_revenue: 0,
      newspaper_wise: {}
    };

    distributions.forEach(dist => {
      summary.total_received += dist.quantity;
      summary.total_unsold += dist.total_unsold || 0;
      summary.total_sold += dist.quantity - (dist.total_unsold || 0);
      
      // Group by newspaper
      if (!summary.newspaper_wise[dist.newspaper_name]) {
        summary.newspaper_wise[dist.newspaper_name] = {
          received: 0,
          sold: 0,
          unsold: 0
        };
      }
      summary.newspaper_wise[dist.newspaper_name].received += dist.quantity;
      summary.newspaper_wise[dist.newspaper_name].unsold += dist.total_unsold || 0;
      summary.newspaper_wise[dist.newspaper_name].sold += dist.quantity - (dist.total_unsold || 0);
    });

    res.json({
      status: 'success',
      data: {
        distributions,
        summary
      }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate sales report'
    });
  }
});

// Get distribution report for distributors
router.get('/distribution', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { sender_id: req.user._id };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const distributions = await Newspaper.find(query)
      .populate('receiver_id', 'name')
      .sort({ created_at: -1 });

    // Calculate summary
    const summary = {
      total_distributed: 0,
      total_delivered: 0,
      total_pending: 0,
      receiver_wise: {}
    };

    distributions.forEach(dist => {
      summary.total_distributed += dist.quantity;
      if (dist.status === 'delivered') {
        summary.total_delivered += dist.quantity;
      } else if (dist.status === 'pending') {
        summary.total_pending += dist.quantity;
      }

      // Group by receiver
      const receiverName = dist.receiver_id?.name || 'Unknown';
      if (!summary.receiver_wise[receiverName]) {
        summary.receiver_wise[receiverName] = {
          distributed: 0,
          delivered: 0,
          pending: 0
        };
      }
      summary.receiver_wise[receiverName].distributed += dist.quantity;
      if (dist.status === 'delivered') {
        summary.receiver_wise[receiverName].delivered += dist.quantity;
      } else if (dist.status === 'pending') {
        summary.receiver_wise[receiverName].pending += dist.quantity;
      }
    });

    res.json({
      status: 'success',
      data: {
        distributions,
        summary
      }
    });
  } catch (error) {
    console.error('Error generating distribution report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate distribution report'
    });
  }
});

module.exports = router; 