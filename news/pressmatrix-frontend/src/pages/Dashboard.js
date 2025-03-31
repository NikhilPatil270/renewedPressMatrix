import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch analytics data
        const today = new Date();
        const startDate = new Date(today.setDate(today.getDate() - 7));
        const analyticsResponse = await axios.get(
          `http://localhost:5000/api/reports/analytics?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`
        );
        setAnalytics(analyticsResponse.data.data);

        // Fetch role-specific stats
        if (user.role === 'district_distributor') {
          const statsResponse = await axios.get('http://localhost:5000/api/newspapers/district-stats');
          setStats(statsResponse.data.data);
        } else if (user.role === 'manufacturer') {
          const statsResponse = await axios.get('http://localhost:5000/api/newspapers/manufacturer-stats');
          setStats(statsResponse.data.data);
        }
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.role]);

  const getRoleSpecificContent = () => {
    switch (user.role) {
      case 'admin':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">{stats?.totalUsers || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Newspapers
                  </Typography>
                  <Typography variant="h4">{stats?.totalNewspapers || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">₹{stats?.totalRevenue || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Vendors
                  </Typography>
                  <Typography variant="h4">{stats?.activeVendors || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'manufacturer':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Newspapers Produced Today
                  </Typography>
                  <Typography variant="h4">{stats?.newspapersProduced || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Distribution Rate
                  </Typography>
                  <Typography variant="h4">{stats?.distributionRate?.toFixed(1) || 0}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Sold
                  </Typography>
                  <Typography variant="h4">{stats?.totalSold || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Unsold
                  </Typography>
                  <Typography variant="h4">{stats?.totalUnsold || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'district_distributor':
      case 'area_distributor':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Newspapers Received Today
                  </Typography>
                  <Typography variant="h4">{stats?.newspapersReceived || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Distribution Rate
                  </Typography>
                  <Typography variant="h4">{stats?.distributionRate?.toFixed(1) || 0}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Sold
                  </Typography>
                  <Typography variant="h4">{stats?.totalSold || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Unsold
                  </Typography>
                  <Typography variant="h4">{stats?.totalUnsold || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 'vendor':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Newspapers Received Today
                  </Typography>
                  <Typography variant="h4">{stats?.newspapersReceived || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Sales Today
                  </Typography>
                  <Typography variant="h4">{stats?.salesToday || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user.name}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')} Dashboard
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          {getRoleSpecificContent()}
          
          {analytics && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Weekly Analytics
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="received" name="Received" fill="#8884d8" />
                    <Bar dataKey="sold" name="Sold" fill="#82ca9d" />
                    <Bar dataKey="unsold" name="Unsold" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default Dashboard; 