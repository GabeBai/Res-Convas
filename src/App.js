import React, { useState } from 'react';
import './App.css';
import Canvas from './Canvas';
import {AppBar, Box, Grid, Toolbar, Typography, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle} from '@mui/material';

function App() {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleHelpOpen = () => {
    setHelpOpen(true);
  };

  const handleHelpClose = () => {
    setHelpOpen(false);
  };

  return (
    <Box className="App">
      <AppBar position="static" className="AppBar">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            React Canvas Drawing App
          </Typography>
          <Button color="inherit" className="App-button" onClick={handleHelpOpen}>
            Help
          </Button>
        </Toolbar>
      </AppBar>
      <Container className="Canvas-container">
        <Container>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={8}>
              <Canvas />
            </Grid>
          </Grid>
        </Container>
      </Container>
      <Dialog open={helpOpen} onClose={handleHelpClose} aria-labelledby="help-dialog-title">
        <DialogTitle id="help-dialog-title">How to Use the Drawing App</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Overview of our application:
          </Typography>
          <ul>
            <li>Click and drag on the canvas to draw.</li>
            <li>The drawn stroke will be saved into ResDB upon mouse button release.</li>
            <li>Use the color and line width options to customize your drawing.</li>
            <li>Push the clear canvas button to clear your drawing.</li>
            <li>To learn more about our decentralized drawing app, visit our blog here: .</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHelpClose} color="primary" variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
