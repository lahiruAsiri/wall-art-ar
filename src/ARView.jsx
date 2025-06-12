import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { Button } from '@mui/material';

const ARView = ({ imageUrl, frameModelUrl, onClose }) => {
  const containerRef = useRef();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(
    new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    )
  );
  const rendererRef = useRef(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
  const reticleRef = useRef();
  const frameGroupRef = useRef(new THREE.Group());
  let hitTestSource = null;
  let hitTestSourceRequested = false;
  let isDragging = false;
  let initialTouchDistance = null;
  let initialScale = 1;
  let initialRotation = 0;

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // Set up renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Check WebXR support
    if (!navigator.xr) {
      alert('WebXR not supported on this device/browser.');
      onClose();
      return;
    }

    // Add AR button
    document.body.appendChild(
      ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
      })
    );

    // Load poster image as texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      // Create or load frame
      if (frameModelUrl) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(frameModelUrl, (gltf) => {
          const frame = gltf.scene;
          frame.name = 'frame';
          // Assume frame model has a plane named 'ArtPlane' for the poster
          const artPlane = frame.getObjectByName('ArtPlane') || new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: texture })
          );
          artPlane.material = new THREE.MeshBasicMaterial({ map: texture });
          frameGroupRef.current.add(frame);
          scene.add(frameGroupRef.current);
        }, undefined, (error) => {
          console.error('Error loading frame model:', error);
          // Fallback: Create simple frame
          createFallbackFrame(texture, scene);
        });
      } else {
        // Fallback: Create simple frame
        createFallbackFrame(texture, scene);
      }
    });

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Reticle for hit-test
    reticleRef.current = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticleRef.current.matrixAutoUpdate = false;
    reticleRef.current.visible = false;
    scene.add(reticleRef.current);

    // Controller for placement and dragging
    const controller = renderer.xr.getController(0);
    controller.addEventListener('selectstart', () => {
      isDragging = true;
    });
    controller.addEventListener('selectend', () => {
      isDragging = false;
    });
    controller.addEventListener('select', () => {
      if (reticleRef.current.visible) {
        frameGroupRef.current.position.copy(reticleRef.current.position);
        frameGroupRef.current.quaternion.copy(reticleRef.current.quaternion);
        frameGroupRef.current.visible = true;
      }
    });
    scene.add(controller);

    // Hit-test setup
    renderer.xr.addEventListener('sessionstart', () => {
      const session = renderer.xr.getSession();
      session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
        reticleRef.current.visible = false;
      });
      hitTestSourceRequested = true;
    });

    // Touch controls for scale and rotate
    const onTouchStart = (event) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
        initialRotation = Math.atan2(dy, dx);
      }
    };

    const onTouchMove = (event) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotation = Math.atan2(dy, dx);

        const frameGroup = frameGroupRef.current;
        if (frameGroup) {
          // Scale
          const scaleFactor = distance / initialTouchDistance;
          frameGroup.scale.set(
            initialScale * scaleFactor,
            initialScale * scaleFactor,
            initialScale * scaleFactor
          );
          // Rotate
          const deltaRotation = rotation - initialRotation;
          frameGroup.rotation.z = initialRotation + deltaRotation;
        }
      }
    };

    const onTouchEnd = () => {
      const frameGroup = frameGroupRef.current;
      if (frameGroup) {
        initialScale = frameGroup.scale.x;
        initialRotation = frameGroup.rotation.z;
      }
      initialTouchDistance = null;
    };

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        if (hitTestSourceRequested && hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            reticleRef.current.visible = true;
            reticleRef.current.matrix.fromArray(pose.transform.matrix);
            if (isDragging && frameGroupRef.current.visible) {
              frameGroupRef.current.position.copy(reticleRef.current.position);
              frameGroupRef.current.quaternion.copy(reticleRef.current.quaternion);
            }
          } else {
            reticleRef.current.visible = false;
          }
        }
      }
      renderer.render(scene, camera);
    });

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      const arButton = document.querySelector('.ar-button');
      if (arButton && document.body.contains(arButton)) {
        document.body.removeChild(arButton);
      }
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [imageUrl, frameModelUrl, onClose]);

  // Fallback frame creation
  const createFallbackFrame = (texture, scene) => {
    const artGeometry = new THREE.PlaneGeometry(1, 1);
    const artMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const artMesh = new THREE.Mesh(artGeometry, artMaterial);
    frameGroupRef.current.add(artMesh);

    const frameGeometry = new THREE.BoxGeometry(1.1, 1.1, 0.05);
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.z = 0.025;
    frameGroupRef.current.add(frameMesh);

    frameGroupRef.current.name = 'frame';
    scene.add(frameGroupRef.current);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
      }}
    >
      <Button
        variant="contained"
        color="secondary"
        onClick={onClose}
        sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1001 }}
      >
        Close
      </Button>
    </div>
  );
};

export default ARView;