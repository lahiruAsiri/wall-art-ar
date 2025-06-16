import React from 'react';
import { Container, Typography } from '@mui/material';
import ARPoster from './components/ARPoster';

function App() {
  const posterImage = 'src/assets/poster.png'; // Path to your poster image
  const markerPattUrl = 'src/assets/custom.patt';
  const markerImageUrl = 'src/assets/custom-marker.png';

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