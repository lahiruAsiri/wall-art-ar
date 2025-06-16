import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useMediaQuery } from 'react-responsive';
import 'aframe';
import 'aframe-extras';
import './ar-poster.css';

const ARPoster = ({ posterImage, markerPattUrl, markerImageUrl }) => {
  const [arActive, setArActive] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  useEffect(() => {
    // Load AR.js script dynamically
    const arjsScript = document.createElement('script');
    arjsScript.src = 'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js';
    arjsScript.async = true;
    document.head.appendChild(arjsScript);

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      alert('Your browser does not support WebGL.');
    }

    // Check WebRTC support
    if (!navigator.mediaDevices) {
      alert('WebRTC is not supported.');
    }

    // Debug AR.js initialization
    arjsScript.onload = () => {
      console.log('AR.js script loaded');
    };
    arjsScript.onerror = () => {
      console.error('Failed to load AR.js script');
    };

    return () => {
      document.head.removeChild(arjsScript);
    };
  }, []);

  const handleStartAR = () => {
    setArActive(true);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        console.log('Camera access granted');
      })
      .catch((err) => {
        console.error('Camera access denied:', err.message);
        alert('Camera access denied: ' + err.message);
        setArActive(false);
      });
  };

  if (!isMobile) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          AR feature is only available on mobile devices.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      {!arActive ? (
        <>
          <Typography variant="body1" mb={2}>
            See how this poster looks on your wall! Print or display the{' '}
            <a href={markerImageUrl} target="_blank" rel="noopener noreferrer">
              custom marker
            </a>{' '}
            and point your camera at it.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleStartAR}
            sx={{ mb: 2 }}
          >
            Start AR
          </Button>
          <img
            src={posterImage}
            alt="Poster Preview"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </>
      ) : (
        <div className="ar-container">
          <a-scene
            embedded
            arjs="sourceType: webcam; debugUIEnabled: true; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
            vr-mode-ui="enabled: false"
          >
            <a-marker
              type="pattern"
              url={markerPattUrl}
              cursor="rayOrigin: mouse"
              emitevents="true"
              gesture-handler
            >
              <a-plane
                material={`src: url(${posterImage});`}
                width="1"
                height="1.5"
                rotation="0 0 0"
                position="0 0 0"
                scale="1 1 1"
                gesture-detector
              ></a-plane>
            </a-marker>
            <a-entity camera></a-entity>
          </a-scene>
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 10,
              color: 'white',
              textAlign: 'center',
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              p: 1,
            }}
          >
            Point at the custom marker. Pinch to scale, drag to move.
          </Typography>
        </div>
      )}
    </Box>
  );
};

export default ARPoster;