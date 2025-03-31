import NewspaperDistribution from '../pages/NewspaperDistribution';
import Reports from '../pages/Reports';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          PressMatrix
        </Typography>
        {user && (
          <>
            <Button color="inherit" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => navigate('/newspaper-distribution')}>
              Newspaper Distribution
            </Button>
            <Button color="inherit" onClick={() => navigate('/reports')}>
              Reports
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 