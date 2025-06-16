import React from 'react';
import { Container, Typography } from '@mui/material';
import ARPoster from './components/ARPoster';

function App() {
  const posterImage = '/poster.png';

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" align="center" sx={{ mt: 4, mb: 2 }}>
        Poster AR Preview
      </Typography>
      <ARPoster posterImage={posterImage} />
    </Container>
  );
}

export default App;