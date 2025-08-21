import React from 'react';
import { Box, Typography, Button } from '@mui/material';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of the component tree that crashed
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force a complete re-render by updating a key or calling a reset function
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
          color: '#ffffff',
          p: 3,
          textAlign: 'center'
        }}>
          <Typography variant="h4" sx={{ 
            color: '#ff0000', 
            mb: 2,
            fontWeight: 'bold'
          }}>
            🚨 Something went wrong
          </Typography>
          
          <Typography variant="body1" sx={{ 
            color: '#cccccc', 
            mb: 3,
            maxWidth: '600px'
          }}>
            The network diagram encountered an unexpected error. This might be due to a temporary issue or corrupted data.
          </Typography>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid #ff0000',
              borderRadius: '8px',
              p: 2,
              mb: 3,
              maxWidth: '600px',
              textAlign: 'left'
            }}>
              <Typography variant="subtitle2" sx={{ color: '#ff0000', mb: 1 }}>
                Error Details (Development):
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#ffcccc', 
                fontFamily: 'monospace',
                fontSize: '0.8em',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={this.handleRetry}
              sx={{
                background: 'linear-gradient(90deg, #00ff00 0%, #00cc00 100%)',
                color: '#000000',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(90deg, #00cc00 0%, #009900 100%)',
                  boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
                }
              }}
            >
              🔄 Try Again
            </Button>
            
            <Button
              variant="outlined"
              onClick={this.handleReset}
              sx={{
                border: '1px solid #00ff00',
                color: '#00ff00',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid #00ff00'
                }
              }}
            >
              🔄 Reset Component
            </Button>
          </Box>

          <Typography variant="caption" sx={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            mt: 3,
            fontStyle: 'italic'
          }}>
            If the problem persists, please refresh the page or contact support.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 