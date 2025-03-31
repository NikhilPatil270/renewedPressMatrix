import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const NewspaperDistribution = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    newspaper_name: '',
    quantity: '',
    receiver_id: '',
    unsold_quantity: '',
    distribution_id: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [distributions, setDistributions] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [availableNewspapers, setAvailableNewspapers] = useState([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isAddingNewNewspaper, setIsAddingNewNewspaper] = useState(false);
  const [newNewspaperName, setNewNewspaperName] = useState('');

  useEffect(() => {
    if (user) {
      setIsUserLoading(false);
      fetchDistributions();
      if (user.role !== 'vendor') {
        fetchReceivers();
        fetchAvailableNewspapers();
      }
    }
  }, [user]);

  const fetchDistributions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/newspapers/distribution');
      setDistributions(response.data.data);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      setError('Failed to fetch distribution history');
    }
  };

  const fetchReceivers = async () => {
    if (!user || user.role === 'vendor') return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      const users = response.data.data;
      
      // Filter receivers based on role hierarchy
      const filteredReceivers = users.filter(receiver => {
        switch (user.role) {
          case 'manufacturer':
            return receiver.role === 'district_distributor';
          case 'district_distributor':
            return receiver.role === 'area_distributor';
          case 'area_distributor':
            return receiver.role === 'vendor';
          default:
            return false;
        }
      });
      
      setReceivers(filteredReceivers);
    } catch (error) {
      console.error('Error fetching receivers:', error);
      setError('Failed to fetch receivers');
    }
  };

  const fetchAvailableNewspapers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/newspapers/available-newspapers');
      setAvailableNewspapers(response.data.data);
    } catch (error) {
      console.error('Error fetching available newspapers:', error);
      setError('Failed to fetch available newspapers');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (user.role === 'vendor') {
        // For vendors, update unsold quantity
        const distributionData = {
          unsold_quantity: parseInt(formData.unsold_quantity)
        };
        console.log('Updating unsold quantity:', distributionData);
        await axios.patch(`http://localhost:5000/api/newspapers/updateUnsold/${formData.distribution_id}`, distributionData);
        setSuccess('Unsold quantity updated successfully');
      } else {
        // For other roles, create new distribution
        const distributionData = {
          newspaper_name: formData.newspaper_name,
          quantity: parseInt(formData.quantity),
          receiver_id: formData.receiver_id
        };
        console.log('Submitting distribution data:', distributionData);
        await axios.post('http://localhost:5000/api/newspapers/distribution', distributionData);
        setSuccess('Newspaper distributed successfully');
      }

      setFormData({
        newspaper_name: '',
        quantity: '',
        receiver_id: '',
        unsold_quantity: '',
        distribution_id: '',
      });
      fetchDistributions();
    } catch (error) {
      console.error('Operation error:', error);
      if (error.response) {
        setError(error.response.data.message || 'Operation failed');
      } else if (error.request) {
        setError('No response from server. Please check if the server is running.');
      } else {
        setError('Error setting up the request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewNewspaperSubmit = async (e) => {
    e.preventDefault();
    if (newNewspaperName.trim()) {
      // Add the new newspaper to the form data
      setFormData(prev => ({
        ...prev,
        newspaper_name: newNewspaperName.trim()
      }));
      
      // Add the new newspaper to the available newspapers list
      setAvailableNewspapers(prev => [...prev, newNewspaperName.trim()]);
      
      // Reset the form
      setNewNewspaperName('');
      setIsAddingNewNewspaper(false);
      
      // Refresh the available newspapers list from the server
      await fetchAvailableNewspapers();
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      manufacturer: 'Manufacturer',
      district_distributor: 'District Distributor',
      area_distributor: 'Area Distributor',
      vendor: 'Vendor'
    };
    return roleLabels[role] || role;
  };

  const getSenderName = (distribution) => {
    return distribution.sender_id?.name || 'Unknown Sender';
  };

  const getReceiverName = (distribution) => {
    return distribution.receiver_id?.name || 'N/A';
  };

  if (isUserLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Please log in to access this page.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {user.role === 'vendor' ? 'Newspaper Sales Update' : 'Newspaper Distribution'}
        </Typography>
        
        {user.role === 'vendor' ? (
          // Vendor View
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Distribution</InputLabel>
                <Select
                  name="distribution_id"
                  value={formData.distribution_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <MenuItem value="">Select a Distribution</MenuItem>
                  {distributions
                    .filter(dist => dist.status === 'pending')
                    .map((distribution) => (
                      <MenuItem key={distribution._id} value={distribution._id}>
                        {distribution.newspaper_name} - Received: {distribution.quantity}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Unsold Quantity"
                name="unsold_quantity"
                type="number"
                value={formData.unsold_quantity}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
                inputProps={{ min: 0 }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Unsold Quantity'}
              </Button>
            </form>
          </Paper>
        ) : (
          // Other Roles View
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {user.role === 'manufacturer' ? (
                // Manufacturer View with option to add new newspaper
                <Box>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Newspaper Name</InputLabel>
                    <Select
                      name="newspaper_name"
                      value={formData.newspaper_name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >
                      <MenuItem value="">Select a Newspaper</MenuItem>
                      {availableNewspapers.map((newspaper) => (
                        <MenuItem key={newspaper} value={newspaper}>
                          {newspaper}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!isAddingNewNewspaper ? (
                    <Button
                      type="button"
                      variant="outlined"
                      color="primary"
                      onClick={() => setIsAddingNewNewspaper(true)}
                      sx={{ mt: 1, mb: 2 }}
                    >
                      Add New Newspaper
                    </Button>
                  ) : (
                    <Box sx={{ mt: 1, mb: 2 }}>
                      <TextField
                        fullWidth
                        label="New Newspaper Name"
                        value={newNewspaperName}
                        onChange={(e) => setNewNewspaperName(e.target.value)}
                        margin="normal"
                        required
                        disabled={loading}
                      />
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Button
                          type="button"
                          variant="contained"
                          color="primary"
                          onClick={handleNewNewspaperSubmit}
                          disabled={loading || !newNewspaperName.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          color="secondary"
                          onClick={() => {
                            setIsAddingNewNewspaper(false);
                            setNewNewspaperName('');
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                // Other roles view with only dropdown
                <FormControl fullWidth margin="normal">
                  <InputLabel>Newspaper Name</InputLabel>
                  <Select
                    name="newspaper_name"
                    value={formData.newspaper_name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <MenuItem value="">Select a Newspaper</MenuItem>
                    {availableNewspapers.map((newspaper) => (
                      <MenuItem key={newspaper} value={newspaper}>
                        {newspaper}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
                inputProps={{ min: 1 }}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Select Receiver</InputLabel>
                <Select
                  name="receiver_id"
                  value={formData.receiver_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <MenuItem value="">Select a Receiver</MenuItem>
                  {receivers.map((receiver) => (
                    <MenuItem key={receiver._id} value={receiver._id}>
                      {receiver.name} ({getRoleLabel(receiver.role)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Distribute Newspapers'}
              </Button>
            </form>
          </Paper>
        )}

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Distribution History
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Newspaper</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Sender</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {distributions.map((distribution) => (
                  <TableRow key={distribution._id}>
                    <TableCell>{distribution.newspaper_name}</TableCell>
                    <TableCell>{distribution.quantity}</TableCell>
                    <TableCell>{getSenderName(distribution)}</TableCell>
                    <TableCell>{getReceiverName(distribution)}</TableCell>
                    <TableCell>{distribution.status}</TableCell>
                    <TableCell>
                      {new Date(distribution.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Container>
  );
};

export default NewspaperDistribution; 