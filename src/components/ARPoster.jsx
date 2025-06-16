import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useMediaQuery } from 'react-responsive';
import './ar-poster.css';

const ARPoster = ({ posterImage }) => {
  const [arActive, setArActive] = useState(false);
  const [arSupported, setArSupported] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const sceneRef = useRef(null);
  const xrSessionRef = useRef(null);
  const postersRef = useRef([]);

  useEffect(() => {
    // Load A-Frame
    const aframeScript = document.createElement('script');
    aframeScript.src = 'https://aframe.io/releases/1.3.0/aframe.min.js';
    aframeScript.async = true;
    document.head.appendChild(aframeScript);

    // Check WebXR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setArSupported(supported);
      });
    }

    // Load gl-matrix for matrix operations
    const glMatrixScript = document.createElement('script');
    glMatrixScript.src = 'https://glmatrix.net/latest/gl-matrix-min.js';
    document.head.appendChild(glMatrixScript);

    return () => {
      document.head.removeChild(aframeScript);
      document.head.removeChild(glMatrixScript);
    };
  }, []);

  useEffect(() => {
    if (!arActive || !sceneRef.current) return;

    let xrRefSpace = null;
    let xrViewerSpace = null;
    let xrHitTestSource = null;
    const MAX_POSTERS = 10;

    const startXRSession = async () => {
      try {
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local', 'hit-test'],
        });
        xrSessionRef.current = session;

        session.addEventListener('end', () => {
          setArActive(false);
          xrSessionRef.current = null;
        });

        session.addEventListener('select', (event) => {
          const reticle = sceneRef.current.querySelector('#reticle');
          if (reticle && reticle.getAttribute('visible')) {
            addPosterAt(reticle.object3D.matrix.elements);
          }
        });

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', { xrCompatible: true });
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

        xrViewerSpace = await session.requestReferenceSpace('viewer');
        xrHitTestSource = await session.requestHitTestSource({ space: xrViewerSpace });
        xrRefSpace = await session.requestReferenceSpace('local');

        const onXRFrame = (time, frame) => {
          const pose = frame.getViewerPose(xrRefSpace);
          const reticle = sceneRef.current.querySelector('#reticle');
          reticle.setAttribute('visible', false);

          if (xrHitTestSource && pose) {
            const hitTestResults = frame.getHitTestResults(xrHitTestSource);
            for (const hit of hitTestResults) {
              const hitPose = hit.getPose(xrRefSpace);
              const orientation = hitPose.transform.orientation;
              // Filter for vertical surfaces (walls, Y normal near 0)
              if (Math.abs(orientation.y) < 0.2) {
                reticle.setAttribute('visible', true);
                const matrix = hitPose.transform.matrix;
                const pos = window.glMatrix.vec3.create();
                const rot = window.glMatrix.quat.create();
                window.glMatrix.mat4.getTranslation(pos, matrix);
                window.glMatrix.mat4.getRotation(rot, matrix);
                reticle.setAttribute('position', `${pos[0]} ${pos[1]} ${pos[2]}`);
                reticle.setAttribute('rotation', {
                  x: THREE.MathUtils.radToDeg(rot[0]),
                  y: THREE.MathUtils.radToDeg(rot[1]),
                  z: THREE.MathUtils.radToDeg(rot[2]),
                });
                break;
              }
            }
          }

          session.requestAnimationFrame(onXRFrame);
        };

        session.requestAnimationFrame(onXRFrame);
      } catch (err) {
        console.error('XR session failed:', err);
        alert('Failed to start AR: ' + err.message);
        setArActive(false);
      }
    };

    const addPosterAt = (matrix) => {
      const poster = document.createElement('a-plane');
      poster.setAttribute('material', `src: ${posterImage}; transparent: true`);
      poster.setAttribute('width', '0.5');
      poster.setAttribute('height', '0.75');
      const pos = window.glMatrix.vec3.create();
      const rot = window.glMatrix.quat.create();
      window.glMatrix.mat4.getTranslation(pos, matrix);
      window.glMatrix.mat4.getRotation(rot, matrix);
      poster.setAttribute('position', `${pos[0]} ${pos[1]} ${pos[2]}`);
      poster.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(rot[0]),
        y: THREE.MathUtils.radToDeg(rot[1]),
        z: THREE.MathUtils.radToDeg(rot[2]),
      });
      sceneRef.current.appendChild(poster);

      postersRef.current.push(poster);
      if (postersRef.current.length > MAX_POSTERS) {
        const oldPoster = postersRef.current.shift();
        sceneRef.current.removeChild(oldPoster);
      }
    };

    startXRSession();

    return () => {
      if (xrSessionRef.current) {
        xrHitTestSource?.cancel();
        xrSessionRef.current.end();
      }
    };
  }, [arActive]);

  if (!isMobile) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          AR feature is only available on mobile devices.
        </Typography>
      </Box>
    );
  }

  if (!arSupported) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          WebXR AR is not supported on this device.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      {!arActive ? (
        <>
          <Typography variant="body1" mb={2}>
            Tap to place a poster on a wall using WebXR hit testing.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setArActive(true)}
            sx={{ mb: 2 }}
            disabled={!arSupported}
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
          <a-scene ref={sceneRef} embedded vr-mode-ui="enabled: false">
            <a-assets>
              <a-asset-item id="reticle-gltf" src="/media/gltf/reticle/reticle.gltf"></a-asset-item>
            </a-assets>
            <a-entity id="reticle" gltf-model="#reticle-gltf" visible="false"></a-entity>
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
            Point at a wall to see the reticle, then tap to place the poster.
          </Typography>
        </div>
      )}
    </Box>
  );
};

export default ARPoster;