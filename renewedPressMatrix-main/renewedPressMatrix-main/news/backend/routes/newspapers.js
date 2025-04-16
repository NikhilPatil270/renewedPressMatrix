const express = require('express');
const router = express.Router();
const Newspaper = require('../models/Newspaper');
const User = require('../models/User');
const protect = require('../middleware/auth');

// Middleware to check user role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Add newspapers (Manufacturer only)
router.post('/addNewspapers', protect, checkRole(['manufacturer']), async (req, res) => {
  try {
    const { receiver_id, total_sent } = req.body;
    
    const newspaper = await Newspaper.create({
      supplier_id: req.user._id,
      receiver_id,
      total_sent,
      total_received: total_sent // Initially, assume all are received
    });

    res.status(201).json({
      status: 'success',
      data: newspaper
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Distribute newspapers (Distributors only)
router.post('/distributeNewspapers', protect, checkRole(['district_distributor', 'area_distributor']), async (req, res) => {
  try {
    const { receiver_id, total_sent } = req.body;

    // Verify receiver is in the correct hierarchy
    const receiver = await User.findById(receiver_id);
    if (!receiver || receiver.upper_role_id.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid receiver or hierarchy mismatch'
      });
    }

    const newspaper = await Newspaper.create({
      supplier_id: req.user._id,
      receiver_id,
      total_sent,
      total_received: total_sent
    });

    res.status(201).json({
      status: 'success',
      data: newspaper
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update unsold newspapers (Vendors only)
router.patch('/updateUnsold/:id', protect, checkRole(['vendor']), async (req, res) => {
  try {
    const { unsold_quantity } = req.body;
    console.log('Update unsold request:', {
      id: req.params.id,
      unsold_quantity,
      user: req.user._id
    });

    const newspaper = await Newspaper.findOne({
      _id: req.params.id,
      'hierarchy.vendor_id': req.user._id,
      status: { $in: ['pending', 'distributed'] }
    });

    if (!newspaper) {
      return res.status(404).json({
        status: 'error',
        message: 'Newspaper record not found or already updated'
      });
    }

    // Validate unsold quantity
    if (unsold_quantity > newspaper.quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Unsold quantity cannot be greater than received quantity'
      });
    }

    newspaper.total_unsold = parseInt(unsold_quantity);
    newspaper.status = 'delivered';
    await newspaper.save();

    console.log('Newspaper updated:', newspaper);

    res.json({
      status: 'success',
      data: newspaper
    });
  } catch (error) {
    console.error('Update unsold error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update newspaper status when received
router.patch('/updateStatus/:id', protect, async (req, res) => {
  try {
    const { status, received_quantity } = req.body;
    const newspaper = await Newspaper.findOne({
      _id: req.params.id,
      receiver_id: req.user._id
    });

    if (!newspaper) {
      return res.status(404).json({
        status: 'error',
        message: 'Newspaper record not found'
      });
    }

    // Validate received quantity
    if (received_quantity > newspaper.quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Received quantity cannot be greater than sent quantity'
      });
    }

    // Update the newspaper record
    newspaper.status = status;
    newspaper.received_quantity = received_quantity;
    
    // Add status update to the status_updates array
    newspaper.status_updates.push({
      receiver_id: req.user._id,
      status,
      received_quantity
    });

    await newspaper.save();

    // Update parent records in the hierarchy
    if (newspaper.hierarchy) {
      const updateQuery = {};
      const updateFields = {};

      // Build the query based on the hierarchy
      if (newspaper.hierarchy.manufacturer_id) {
        updateQuery['hierarchy.manufacturer_id'] = newspaper.hierarchy.manufacturer_id;
      }
      if (newspaper.hierarchy.district_distributor_id) {
        updateQuery['hierarchy.district_distributor_id'] = newspaper.hierarchy.district_distributor_id;
      }
      if (newspaper.hierarchy.area_distributor_id) {
        updateQuery['hierarchy.area_distributor_id'] = newspaper.hierarchy.area_distributor_id;
      }

      // Add status update to parent records
      updateFields.$push = {
        status_updates: {
          receiver_id: req.user._id,
          status,
          received_quantity
        }
      };

      // Update the parent records
      await Newspaper.updateMany(
        updateQuery,
        updateFields
      );

      // If this is a vendor update, update the area distributor's status
      if (newspaper.hierarchy.vendor_id) {
        const areaDistributorUpdate = await Newspaper.findOne({
          'hierarchy.area_distributor_id': newspaper.hierarchy.area_distributor_id,
          'hierarchy.vendor_id': newspaper.hierarchy.vendor_id
        });

        if (areaDistributorUpdate) {
          areaDistributorUpdate.status = status;
          areaDistributorUpdate.received_quantity = received_quantity;
          await areaDistributorUpdate.save();
        }
      }

      // If this is an area distributor update, update the district distributor's status
      if (newspaper.hierarchy.area_distributor_id) {
        const districtDistributorUpdate = await Newspaper.findOne({
          'hierarchy.district_distributor_id': newspaper.hierarchy.district_distributor_id,
          'hierarchy.area_distributor_id': newspaper.hierarchy.area_distributor_id
        });

        if (districtDistributorUpdate) {
          districtDistributorUpdate.status = status;
          districtDistributorUpdate.received_quantity = received_quantity;
          await districtDistributorUpdate.save();
        }
      }

      // If this is a district distributor update, update the manufacturer's status
      if (newspaper.hierarchy.district_distributor_id) {
        const manufacturerUpdate = await Newspaper.findOne({
          'hierarchy.manufacturer_id': newspaper.hierarchy.manufacturer_id,
          'hierarchy.district_distributor_id': newspaper.hierarchy.district_distributor_id
        });

        if (manufacturerUpdate) {
          manufacturerUpdate.status = status;
          manufacturerUpdate.received_quantity = received_quantity;
          await manufacturerUpdate.save();
        }
      }
    }

    res.json({
      status: 'success',
      data: newspaper
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Modify the distribution endpoint
router.post('/distribution', protect, async (req, res) => {
  try {
    const { newspaper_name, quantity, receiver_id } = req.body;
    const sender_id = req.user._id;

    // Validate required fields
    if (!newspaper_name || !quantity || !receiver_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get sender and receiver details
    const sender = await User.findById(sender_id);
    const receiver = await User.findById(receiver_id);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    // Validate role hierarchy
    let isValidHierarchy = false;
    let hierarchy = {};

    switch (sender.role) {
      case 'manufacturer':
        if (receiver.role !== 'district_distributor') {
          return res.status(400).json({ message: 'Manufacturer can only distribute to district distributors' });
        }
        hierarchy = {
          manufacturer_id: sender_id,
          district_distributor_id: receiver_id
        };
        isValidHierarchy = true;
        break;

      case 'district_distributor':
        if (receiver.role !== 'area_distributor') {
          return res.status(400).json({ message: 'District distributor can only distribute to area distributors' });
        }
        // Get the manufacturer ID from the district distributor's upper_role_id
        const manufacturer = await User.findById(sender.upper_role_id);
        if (!manufacturer) {
          return res.status(400).json({ message: 'District distributor must be associated with a manufacturer' });
        }
        if (manufacturer.role !== 'manufacturer') {
          return res.status(400).json({ message: 'District distributor must be associated with a manufacturer' });
        }
        hierarchy = {
          manufacturer_id: manufacturer._id,
          district_distributor_id: sender_id,
          area_distributor_id: receiver_id
        };
        isValidHierarchy = true;
        break;

      case 'area_distributor':
        if (receiver.role !== 'vendor') {
          return res.status(400).json({ message: 'Area distributor can only distribute to vendors' });
        }
        // Get the district distributor and manufacturer IDs
        const districtDistributor = await User.findById(sender.upper_role_id);
        if (!districtDistributor || districtDistributor.role !== 'district_distributor') {
          return res.status(400).json({ message: 'Invalid district distributor association' });
        }
        const manufacturerForArea = await User.findById(districtDistributor.upper_role_id);
        if (!manufacturerForArea || manufacturerForArea.role !== 'manufacturer') {
          return res.status(400).json({ message: 'Invalid manufacturer association' });
        }
        hierarchy = {
          manufacturer_id: manufacturerForArea._id,
          district_distributor_id: districtDistributor._id,
          area_distributor_id: sender_id,
          vendor_id: receiver_id
        };
        isValidHierarchy = true;
        break;

      default:
        return res.status(400).json({ message: 'Invalid sender role' });
    }

    if (!isValidHierarchy) {
      return res.status(400).json({ message: 'Invalid role hierarchy' });
    }

    // Create distribution record
    const distribution = new Newspaper({
      newspaper_name,
      quantity: parseInt(quantity),
      received_quantity: parseInt(quantity),
      sender_id,
      receiver_id,
      status: 'distributed',
      hierarchy
    });

    await distribution.save();

    // Add status update
    distribution.status_updates.push({
      status: 'distributed',
      updated_by: sender_id,
      updated_at: new Date(),
      quantity: parseInt(quantity),
      received_quantity: parseInt(quantity)
    });

    await distribution.save();

    // Update parent records if they exist
    if (sender.role !== 'manufacturer') {
      const parentRecord = await Newspaper.findOne({
        'hierarchy.district_distributor_id': hierarchy.district_distributor_id,
        newspaper_name,
        status: 'distributed'
      });

      if (parentRecord) {
        parentRecord.status_updates.push({
          status: 'distributed',
          updated_by: sender_id,
          updated_at: new Date(),
          quantity: parseInt(quantity),
          received_quantity: parseInt(quantity)
        });
        await parentRecord.save();
      }
    }

    res.status(201).json({
      message: 'Newspaper distributed successfully',
      data: distribution
    });
  } catch (error) {
    console.error('Distribution error:', error);
    res.status(500).json({ message: 'Error distributing newspaper' });
  }
});

// Get distribution history with hierarchy
router.get('/distribution', protect, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    switch (req.user.role) {
      case 'manufacturer':
        query = { 'hierarchy.manufacturer_id': req.user._id };
        break;
      case 'district_distributor':
        query = { 'hierarchy.district_distributor_id': req.user._id };
        break;
      case 'area_distributor':
        query = { 'hierarchy.area_distributor_id': req.user._id };
        break;
      case 'vendor':
        query = { 'hierarchy.vendor_id': req.user._id };
        break;
      case 'admin':
        // Admin can see all distributions
        break;
      default:
        query = { sender_id: req.user._id };
    }

    const distributions = await Newspaper.find(query)
      .populate('sender_id', 'name role')
      .populate('receiver_id', 'name role')
      .populate('hierarchy.manufacturer_id', 'name')
      .populate('hierarchy.district_distributor_id', 'name')
      .populate('hierarchy.area_distributor_id', 'name')
      .populate('hierarchy.vendor_id', 'name')
      .sort({ created_at: -1 });

    res.json({
      status: 'success',
      data: distributions
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch distribution history'
    });
  }
});

// Get all distributions for a user
router.get('/distribution', protect, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    switch (req.user.role) {
      case 'manufacturer':
        query = { 'hierarchy.manufacturer_id': req.user._id };
        break;
      case 'district_distributor':
        query = { 'hierarchy.district_distributor_id': req.user._id };
        break;
      case 'area_distributor':
        query = { 'hierarchy.area_distributor_id': req.user._id };
        break;
      case 'vendor':
        query = { 'hierarchy.vendor_id': req.user._id };
        break;
      default:
        return res.status(403).json({
          status: 'error',
          message: 'Invalid role for distribution access'
        });
    }

    const distributions = await Newspaper.find(query)
      .populate('sender_id', 'name')
      .populate('receiver_id', 'name')
      .sort({ created_at: -1 });

    res.json({
      status: 'success',
      data: distributions
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch distributions'
    });
  }
});

// Get unsold summary based on role
router.get('/unsold-summary', protect, async (req, res) => {
  try {
    let query = {};
    let groupBy = {};

    switch (req.user.role) {
      case 'manufacturer':
        query = { 'hierarchy.manufacturer_id': req.user._id };
        groupBy = { 'hierarchy.district_distributor_id': 1 };
        break;
      case 'district_distributor':
        query = { 'hierarchy.district_distributor_id': req.user._id };
        groupBy = { 'hierarchy.area_distributor_id': 1 };
        break;
      case 'area_distributor':
        query = { 'hierarchy.area_distributor_id': req.user._id };
        groupBy = { 'hierarchy.vendor_id': 1 };
        break;
      case 'vendor':
        query = { 'hierarchy.vendor_id': req.user._id };
        break;
      default:
        return res.status(403).json({
          status: 'error',
          message: 'Invalid role for unsold summary'
        });
    }

    const summary = await Newspaper.aggregate([
      { $match: query },
      { $group: {
        _id: groupBy,
        total_quantity: { $sum: '$quantity' },
        total_unsold: { $sum: '$total_unsold' },
        total_sold: { $sum: { $subtract: ['$quantity', '$total_unsold'] } }
      }},
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching unsold summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch unsold summary'
    });
  }
});

// Get newspaper statistics for district distributor
router.get('/district-stats', protect, checkRole(['district_distributor']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's newspapers
    const todayNewspapers = await Newspaper.find({
      'hierarchy.district_distributor_id': req.user._id,
      created_at: { $gte: today }
    });

    // Get all newspapers for this distributor
    const allNewspapers = await Newspaper.find({
      'hierarchy.district_distributor_id': req.user._id
    });

    // Calculate total unsold by aggregating from area distributors and vendors
    const unsoldSummary = await Newspaper.aggregate([
      {
        $match: {
          'hierarchy.district_distributor_id': req.user._id,
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total_unsold: { $sum: '$total_unsold' },
          total_quantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Calculate statistics
    const stats = {
      newspapersReceived: todayNewspapers.reduce((sum, paper) => sum + paper.received_quantity, 0),
      totalNewspapers: allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0),
      totalSold: unsoldSummary.length > 0 ? unsoldSummary[0].total_quantity - unsoldSummary[0].total_unsold : 0,
      totalUnsold: unsoldSummary.length > 0 ? unsoldSummary[0].total_unsold : 0,
      distributionRate: allNewspapers.length > 0 
        ? ((allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0) - 
            (unsoldSummary.length > 0 ? unsoldSummary[0].total_unsold : 0)) / 
           allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0)) * 100 
        : 0
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching district stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch district statistics'
    });
  }
});

// Get newspaper statistics for manufacturer
router.get('/manufacturer-stats', protect, checkRole(['manufacturer']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's newspapers
    const todayNewspapers = await Newspaper.find({
      'hierarchy.manufacturer_id': req.user._id,
      created_at: { $gte: today }
    });

    // Get all newspapers for this manufacturer
    const allNewspapers = await Newspaper.find({
      'hierarchy.manufacturer_id': req.user._id
    });

    // Calculate statistics
    const stats = {
      newspapersProduced: todayNewspapers.reduce((sum, paper) => sum + paper.quantity, 0),
      totalNewspapers: allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0),
      totalSold: allNewspapers.reduce((sum, paper) => sum + (paper.quantity - paper.total_unsold), 0),
      totalUnsold: allNewspapers.reduce((sum, paper) => sum + paper.total_unsold, 0),
      distributionRate: allNewspapers.length > 0 
        ? (allNewspapers.reduce((sum, paper) => sum + (paper.quantity - paper.total_unsold), 0) / 
           allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0)) * 100 
        : 0
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching manufacturer stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch manufacturer statistics'
    });
  }
});

// Get newspaper statistics for area distributor
router.get('/area-stats', protect, checkRole(['area_distributor']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's newspapers
    const todayNewspapers = await Newspaper.find({
      'hierarchy.area_distributor_id': req.user._id,
      created_at: { $gte: today }
    });

    // Get all newspapers for this area distributor
    const allNewspapers = await Newspaper.find({
      'hierarchy.area_distributor_id': req.user._id
    });

    // Calculate total unsold by aggregating from vendors
    const unsoldSummary = await Newspaper.aggregate([
      {
        $match: {
          'hierarchy.area_distributor_id': req.user._id,
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total_unsold: { $sum: '$total_unsold' },
          total_quantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Calculate statistics
    const stats = {
      newspapersReceived: todayNewspapers.reduce((sum, paper) => sum + paper.received_quantity, 0),
      totalNewspapers: allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0),
      totalSold: unsoldSummary.length > 0 ? unsoldSummary[0].total_quantity - unsoldSummary[0].total_unsold : 0,
      totalUnsold: unsoldSummary.length > 0 ? unsoldSummary[0].total_unsold : 0,
      distributionRate: allNewspapers.length > 0 
        ? ((allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0) - 
            (unsoldSummary.length > 0 ? unsoldSummary[0].total_unsold : 0)) / 
           allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0)) * 100 
        : 0
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching area stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch area statistics'
    });
  }
});

// Get available newspapers for role
router.get('/available-newspapers', protect, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    switch (req.user.role) {
      case 'manufacturer':
        // Manufacturers can see all newspapers they've created
        query = { 'hierarchy.manufacturer_id': req.user._id };
        break;
      case 'district_distributor':
        // District distributors can see newspapers distributed to them
        query = { 'hierarchy.district_distributor_id': req.user._id };
        break;
      case 'area_distributor':
        // Area distributors can see newspapers distributed to them
        query = { 'hierarchy.area_distributor_id': req.user._id };
        break;
      case 'vendor':
        // Vendors can see newspapers distributed to them
        query = { 'hierarchy.vendor_id': req.user._id };
        break;
      default:
        return res.status(403).json({
          status: 'error',
          message: 'Invalid role for newspaper selection'
        });
    }

    // Get unique newspaper names
    const newspapers = await Newspaper.distinct('newspaper_name', query);

    res.json({
      status: 'success',
      data: newspapers
    });
  } catch (error) {
    console.error('Error fetching available newspapers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch available newspapers'
    });
  }
});

// Get analytics data for a date range
router.get('/analytics', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    // Filter based on user role
    switch (req.user.role) {
      case 'manufacturer':
        query = { 'hierarchy.manufacturer_id': req.user._id };
        break;
      case 'district_distributor':
        query = { 'hierarchy.district_distributor_id': req.user._id };
        break;
      case 'area_distributor':
        query = { 'hierarchy.area_distributor_id': req.user._id };
        break;
      case 'vendor':
        query = { 'hierarchy.vendor_id': req.user._id };
        break;
      default:
        return res.status(403).json({
          status: 'error',
          message: 'Invalid role for analytics access'
        });
    }

    // Add date range to query
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const distributions = await Newspaper.find(query)
      .sort({ created_at: 1 });

    // Group data by date
    const dailyData = distributions.reduce((acc, distribution) => {
      const date = distribution.created_at.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          received: 0,
          sold: 0,
          unsold: 0
        };
      }
      
      acc[date].received += distribution.quantity;
      acc[date].sold += (distribution.quantity - (distribution.total_unsold || 0));
      acc[date].unsold += (distribution.total_unsold || 0);
      
      return acc;
    }, {});

    // Convert to array and sort by date
    const sortedData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      status: 'success',
      data: {
        dailyData: sortedData
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get newspaper statistics for vendor
router.get('/vendor-stats', protect, checkRole(['vendor']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's newspapers
    const todayNewspapers = await Newspaper.find({
      'hierarchy.vendor_id': req.user._id,
      created_at: { $gte: today }
    });

    // Get all newspapers for this vendor
    const allNewspapers = await Newspaper.find({
      'hierarchy.vendor_id': req.user._id
    });

    // Calculate statistics
    const stats = {
      newspapersReceived: todayNewspapers.reduce((sum, paper) => sum + paper.received_quantity, 0),
      totalNewspapers: allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0),
      totalSold: allNewspapers.reduce((sum, paper) => sum + (paper.quantity - (paper.total_unsold || 0)), 0),
      totalUnsold: allNewspapers.reduce((sum, paper) => sum + (paper.total_unsold || 0), 0),
      distributionRate: allNewspapers.length > 0 
        ? ((allNewspapers.reduce((sum, paper) => sum + (paper.quantity - (paper.total_unsold || 0)), 0)) / 
           allNewspapers.reduce((sum, paper) => sum + paper.quantity, 0)) * 100 
        : 0
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch vendor statistics'
    });
  }
});

module.exports = router; 