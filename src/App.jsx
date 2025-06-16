import React from 'react';
import { Container, Typography } from '@mui/material';
import ARPoster from './components/ARPoster';

function App() {
  const posterImage = '/assets/poster.png';
  const markerPattUrl = '/assets/custom.patt';
  const markerImageUrl = '/assets/custom-marker.png';

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