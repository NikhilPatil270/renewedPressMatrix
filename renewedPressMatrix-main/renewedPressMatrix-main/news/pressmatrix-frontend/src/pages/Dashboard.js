import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  styled,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(3),
}));

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [distributions, setDistributions] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseURL = 'http://localhost:5000/api';
        
        // Fetch distributions
        const distributionResponse = await axios.get(`${baseURL}/newspapers/distribution`);
        setDistributions(distributionResponse.data.data);

        // Fetch role-specific stats
        if (user.role === 'district_distributor') {
          const statsResponse = await axios.get(`${baseURL}/newspapers/district-stats`);
          setStats(statsResponse.data.data);
        } else if (user.role === 'area_distributor') {
          const statsResponse = await axios.get(`${baseURL}/newspapers/area-stats`);
          setStats(statsResponse.data.data);
        } else if (user.role === 'manufacturer') {
          const statsResponse = await axios.get(`${baseURL}/newspapers/manufacturer-stats`);
          console.log('Manufacturer Stats:', statsResponse.data.data);
          setStats(statsResponse.data.data);
        } else if (user.role === 'vendor') {
          const statsResponse = await axios.get(`${baseURL}/newspapers/vendor-stats`);
          setStats(statsResponse.data.data);
        }

        // Fetch analytics data for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const analyticsResponse = await axios.get(`${baseURL}/reports/analytics`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        });

        console.log('Analytics Response:', analyticsResponse.data);
        if (analyticsResponse.data.status === 'success') {
          console.log('Setting analytics data:', analyticsResponse.data.data);
          setAnalytics(analyticsResponse.data.data);
        } else {
          console.error('Analytics data fetch failed:', analyticsResponse.data.message);
          setError('Failed to fetch analytics data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.role]);

  const getRoleSpecificContent = () => {
    if (!stats) return null;

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
        console.log('Rendering manufacturer content with stats:', stats);
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
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
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
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Sales Distribution
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Sold', value: analytics.totalSales || 0 },
                            { name: 'Unsold', value: analytics.totalUnsold || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#82ca9d" />
                          <Cell fill="#ffc658" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {user.role === 'district_distributor' && (
            <>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Distribution Overview
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={analytics?.dailyData || []}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="received" stroke="#8884d8" name="Received" />
                          <Line type="monotone" dataKey="sold" stroke="#82ca9d" name="Sold" />
                          <Line type="monotone" dataKey="unsold" stroke="#ffc658" name="Unsold" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Sales Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics?.pieData || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#82ca9d" />
                            <Cell fill="#ffc658" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Summary Statistics
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                          <Typography color="textSecondary" gutterBottom>
                            Total Received
                          </Typography>
                          <Typography variant="h4">{analytics?.summary?.totalReceived || 0}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography color="textSecondary" gutterBottom>
                            Total Sold
                          </Typography>
                          <Typography variant="h4">{analytics?.summary?.totalSold || 0}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography color="textSecondary" gutterBottom>
                            Total Unsold
                          </Typography>
                          <Typography variant="h4">{analytics?.summary?.totalUnsold || 0}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography color="textSecondary" gutterBottom>
                            Distribution Rate
                          </Typography>
                          <Typography variant="h4">{analytics?.summary?.distributionRate || 0}%</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default Dashboard; 