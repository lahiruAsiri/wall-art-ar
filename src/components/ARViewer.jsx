"use client"

import { useRef, useEffect, useState } from "react"
import { Box, IconButton, Typography, Fab, Paper, Slider, Button, Alert } from "@mui/material"
import { Close, RotateRight, CenterFocusStrong, Cameraswitch } from "@mui/icons-material"
import * as THREE from "three"

const ARViewer = ({ wallArtData, onClose }) => {
  const mountRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const frameRef = useRef(null)
  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStream, setCameraStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeAR()
    return () => {
      cleanup()
    }
  }, [])

  const initializeAR = async () => {
    try {
      // First, get camera access
      await startCamera()
      // Then initialize 3D scene
      await initializeThreeJS()
      setIsLoading(false)
    } catch (err) {
      console.error("AR initialization failed:", err)
      setError("Failed to access camera. Please allow camera permissions and try again.")
      setIsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setCameraStream(stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      throw new Error("Camera access denied: " + err.message)
    }
  }

  const initializeThreeJS = async () => {
    if (!mountRef.current) return

    // Create scene
    const scene = new THREE.Scene()

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    // Create renderer with alpha for transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvasRef.current,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x000000, 0) // Transparent background

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

    // Create picture frame
    createPictureFrame()

    // Position camera
    camera.position.z = 5

    // Start render loop
    const animate = () => {
      requestAnimationFrame(animate)
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener("resize", handleResize)
  }

  const createPictureFrame = () => {
    const group = new THREE.Group()

    // Frame dimensions
    const frameWidth = 1.5
    const frameHeight = 2
    const frameDepth = 0.08
    const borderWidth = 0.08

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
      () => console.log("Artwork texture loaded"),
      undefined,
      (error) => console.error("Error loading artwork texture:", error),
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

    // Position the frame initially off-screen
    group.position.set(0, 0, -3)
    group.visible = false // Hide until placed
    group.castShadow = true

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const handlePlaceFrame = () => {
    setIsPlaced(true)
    if (frameRef.current) {
      frameRef.current.visible = true
      frameRef.current.position.set(0, 0, -2)
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
      frameRef.current.position.set(0, 0, -2)
    }
  }

  const cleanup = () => {
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }

    // Cleanup Three.js
    if (rendererRef.current) {
      rendererRef.current.dispose()
    }
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "black",
        }}
      >
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            Starting AR Camera...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please allow camera access when prompted
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "black",
        }}
      >
        <Paper sx={{ p: 3, textAlign: "center", maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={onClose}>
            Close AR
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "black",
      }}
    >
      {/* Camera Video Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
      />

      {/* Three.js Canvas Overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "auto",
        }}
      />

      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          zIndex: 10,
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0.9)",
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
            backgroundColor: "rgba(255,255,255,0.95)",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <Typography variant="h6" gutterBottom>
            🎯 AR Wall Art Placement
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Point your camera at a wall and tap the button to place your artwork
          </Typography>
          <Button
            variant="contained"
            onClick={handlePlaceFrame}
            sx={{ mt: 1 }}
            startIcon={<CenterFocusStrong />}
            size="large"
          >
            Place Artwork Here
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
            backgroundColor: "rgba(255,255,255,0.95)",
            zIndex: 10,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            🎨 Adjust Your Artwork
          </Typography>

          {/* Scale control */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption">Size: {scale.toFixed(1)}x</Typography>
            <Slider
              value={scale}
              onChange={handleScaleChange}
              min={0.3}
              max={2.5}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-around", gap: 1 }}>
            <Fab size="medium" onClick={handleRotate} color="primary">
              <RotateRight />
            </Fab>
            <Fab size="medium" onClick={handleReset} color="secondary">
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
            width: 60,
            height: 60,
            border: "3px solid #fff",
            borderRadius: "50%",
            zIndex: 5,
            boxShadow: "0 0 20px rgba(0,0,0,0.5)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 3,
              height: 30,
              backgroundColor: "#fff",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 30,
              height: 3,
              backgroundColor: "#fff",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            },
          }}
        />
      )}

      {/* Camera indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          alignItems: "center",
          gap: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          px: 2,
          py: 1,
          borderRadius: 2,
          zIndex: 10,
        }}
      >
        <Cameraswitch fontSize="small" />
        <Typography variant="caption">AR Camera Active</Typography>
      </Box>
    </Box>
  )
}

export default ARViewer
