"use client"

import { useRef, useEffect, useState } from "react"
import { Box, IconButton, Typography, Fab, Paper, Slider, Button } from "@mui/material"
import { Close, RotateRight, CenterFocusStrong } from "@mui/icons-material"
import * as THREE from "three"

const ARViewer = ({ wallArtData, onClose }) => {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const frameRef = useRef(null)
  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)

    // Store references
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create picture frame with artwork
    createPictureFrame()

    // Position camera
    camera.position.z = 5

    // Start render loop
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener("resize", handleResize)

    // Simulate camera background (in real AR, this would be camera feed)
    document.body.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"

    return () => {
      window.removeEventListener("resize", handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      document.body.style.background = ""
    }
  }, [])

  const createPictureFrame = () => {
    const group = new THREE.Group()

    // Frame dimensions
    const frameWidth = 2
    const frameHeight = 2.5
    const frameDepth = 0.1
    const borderWidth = 0.1

    // Create frame border
    const frameGeometry = new THREE.BoxGeometry(frameWidth + borderWidth * 2, frameHeight + borderWidth * 2, frameDepth)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x2c1810 })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    frameMesh.castShadow = true
    group.add(frameMesh)

    // Create artwork plane
    const artworkGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight)

    // Load artwork texture
    const textureLoader = new THREE.TextureLoader()
    const artworkTexture = textureLoader.load(
      wallArtData.imageUrl,
      () => {
        // Texture loaded successfully
        console.log("Artwork texture loaded")
      },
      undefined,
      (error) => {
        console.error("Error loading artwork texture:", error)
      },
    )

    const artworkMaterial = new THREE.MeshLambertMaterial({
      map: artworkTexture,
    })
    const artworkMesh = new THREE.Mesh(artworkGeometry, artworkMaterial)
    artworkMesh.position.z = frameDepth / 2 + 0.01
    group.add(artworkMesh)

    // Add glass effect
    const glassGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      roughness: 0,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0,
    })
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial)
    glassMesh.position.z = frameDepth / 2 + 0.02
    group.add(glassMesh)

    // Position the frame
    group.position.set(0, 0, 0)
    group.castShadow = true

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const handlePlaceFrame = () => {
    setIsPlaced(true)
    // In real AR, this would place the frame at the detected surface
    if (frameRef.current) {
      frameRef.current.position.y = 0
    }
  }

  const handleScaleChange = (event, newValue) => {
    setScale(newValue)
    if (frameRef.current) {
      frameRef.current.scale.setScalar(newValue)
    }
  }

  const handleRotate = () => {
    const newRotation = rotation + Math.PI / 4
    setRotation(newRotation)
    if (frameRef.current) {
      frameRef.current.rotation.z = newRotation
    }
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
    if (frameRef.current) {
      frameRef.current.scale.setScalar(1)
      frameRef.current.rotation.z = 0
      frameRef.current.position.set(0, 0, 0)
    }
  }

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Three.js mount point */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          backgroundColor: "rgba(0,0,0,0.5)",
          color: "white",
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0.7)",
          },
        }}
      >
        <Close />
      </IconButton>

      {/* Instructions */}
      {!isPlaced && (
        <Paper
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            p: 2,
            backgroundColor: "rgba(255,255,255,0.9)",
            textAlign: "center",
          }}
        >
          <Typography variant="h6" gutterBottom>
            AR Wall Art Viewer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Point your camera at a wall and tap to place the artwork
          </Typography>
          <Button variant="contained" onClick={handlePlaceFrame} sx={{ mt: 2 }} startIcon={<CenterFocusStrong />}>
            Place Artwork
          </Button>
        </Paper>
      )}

      {/* Controls */}
      {isPlaced && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            p: 2,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Adjust Artwork
          </Typography>

          {/* Scale control */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption">Size</Typography>
            <Slider value={scale} onChange={handleScaleChange} min={0.5} max={2} step={0.1} valueLabelDisplay="auto" />
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-around" }}>
            <Fab size="small" onClick={handleRotate}>
              <RotateRight />
            </Fab>
            <Fab size="small" onClick={handleReset}>
              <CenterFocusStrong />
            </Fab>
          </Box>
        </Paper>
      )}

      {/* Crosshair for placement */}
      {!isPlaced && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 40,
            height: 40,
            border: "2px solid white",
            borderRadius: "50%",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 2,
              height: 20,
              backgroundColor: "white",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 20,
              height: 2,
              backgroundColor: "white",
            },
          }}
        />
      )}
    </Box>
  )
}

export default ARViewer
