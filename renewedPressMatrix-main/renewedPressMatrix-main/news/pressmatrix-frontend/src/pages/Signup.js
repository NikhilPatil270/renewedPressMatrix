import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    upper_role_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [superiors, setSuperiors] = useState([]);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuperiors = async () => {
      try {
        if (!formData.role || formData.role === 'admin' || formData.role === 'manufacturer') {
          setSuperiors([]);
          return;
        }

        // Get the role of the superior based on the selected role
        let superiorRole;
        switch (formData.role) {
          case 'district_distributor':
            superiorRole = 'manufacturer';
            break;
          case 'area_distributor':
            superiorRole = 'district_distributor';
            break;
          case 'vendor':
            superiorRole = 'area_distributor';
            break;
          default:
            superiorRole = null;
        }

        if (superiorRole) {
          const response = await axios.get(`http://localhost:5000/api/users/role/${superiorRole}`);
          setSuperiors(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching superiors:', error);
        setError('Failed to fetch superiors. Please try again.');
      }
    };

    fetchSuperiors();
  }, [formData.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user makes changes
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Only require superior for roles below manufacturer
    if (formData.role !== 'admin' && formData.role !== 'manufacturer' && !formData.upper_role_id) {
      setError('Please select a superior');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      console.log('Submitting form data:', formData);
      await signup(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manufacturer':
        return 'Manufacturer';
      case 'district_distributor':
        return 'District Distributor';
      case 'area_distributor':
        return 'Area Distributor';
      case 'vendor':
        return 'Vendor';
      default:
        return role;
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            PressMatrix Signup
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              helperText="Password must be at least 8 characters long"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
                disabled={loading}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manufacturer">Manufacturer</MenuItem>
                <MenuItem value="district_distributor">District Distributor</MenuItem>
                <MenuItem value="area_distributor">Area Distributor</MenuItem>
                <MenuItem value="vendor">Vendor</MenuItem>
              </Select>
            </FormControl>
            {formData.role && formData.role !== 'admin' && formData.role !== 'manufacturer' && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="upper-role-label">Superior</InputLabel>
                <Select
                  labelId="upper-role-label"
                  id="upper_role_id"
                  name="upper_role_id"
                  value={formData.upper_role_id}
                  label="Superior"
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <MenuItem value="">Select a Superior</MenuItem>
                  {superiors.map((superior) => (
                    <MenuItem key={superior._id} value={superior._id}>
                      {superior.name} ({getRoleLabel(superior.role)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign Up'
              )}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup; 