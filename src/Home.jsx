import React, { useState } from 'react';
import { Container, Typography, Button, Card, CardMedia, CardContent } from '@mui/material';
import ARView from './ARView';

const poster = {
  name: 'Abstract Poster',
  imageUrl: 'https://cdn.leonardo.ai/users/56148a3e-5d5e-4c3d-8a5d-9389c7a5de4a/generations/6eecfc46-f587-444d-ab71-981e2346d6fa/Leonardo_Lightning_XL_Mystic_Moon_Phases_0.jpg', // Hardcoded poster image
  frameModelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb', // Publicly accessible GLB
};

const Home = () => {
  const [showAR, setShowAR] = useState(false);
  const isMobile = /Android|iPhone/i.test(navigator.userAgent);

  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Wall Art AR Demo
      </Typography>
      <Card sx={{ maxWidth: 400, mx: 'auto' }}>
        <CardMedia
          component="img"
          height="300"
          image={poster.imageUrl}
          alt={poster.name}
        />
        <CardContent>
          <Typography variant="h6">{poster.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize this poster on your wall using AR!
          </Typography>
          {isMobile && (
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => setShowAR(true)}
            >
              View in AR
            </Button>
          )}
        </CardContent>
      </Card>
      {showAR && (
        <ARView
          imageUrl={poster.imageUrl}
          frameModelUrl={poster.frameModelUrl}
          onClose={() => setShowAR(false)}
        />
      )}
    </Container>
  );
};

export default Home;