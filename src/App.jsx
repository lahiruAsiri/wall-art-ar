import React from 'react';
import { Container, Typography } from '@mui/material';
import ARPoster from './components/ARPoster';

function App() {
  const posterImage = '/poster.png'; // Path to your poster image
  const markerPattUrl = '/custom.patt';
  const markerImageUrl = '/custom-marker.png';

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" align="center" sx={{ mt: 4, mb: 2 }}>
        Poster AR Preview
      </Typography>
      <ARPoster
        posterImage={posterImage}
        markerPattUrl={markerPattUrl}
        markerImageUrl={markerImageUrl}
      />
    </Container>
  );
}

export default App;