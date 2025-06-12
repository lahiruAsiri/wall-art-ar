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
  const animationRef = useRef(null)

  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStream, setCameraStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    initializeAR()
    return () => {
      cleanup()
    }
  }, [])

  const initializeAR = async () => {
    try {
      console.log("Starting AR initialization...")

      // First, start camera
      await startCamera()

      // Wait a bit for camera to initialize
      setTimeout(() => {
        initializeThreeJS()
        setIsLoading(false)
      }, 1000)
    } catch (err) {
      console.error("AR initialization failed:", err)
      setError(`Camera Error: ${err.message}`)
      setIsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      console.log("Requesting camera access...")

      // Request camera with specific constraints
      const constraints = {
        video: {
          facingMode: { ideal: "environment" }, // Prefer back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Camera stream obtained:", stream)

      setCameraStream(stream)

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", true)
        videoRef.current.setAttribute("webkit-playsinline", true)
        videoRef.current.muted = true

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          videoRef.current
            .play()
            .then(() => {
              console.log("Video playing successfully")
              setCameraReady(true)
            })
            .catch((err) => {
              console.error("Video play failed:", err)
              setError("Failed to start camera preview")
            })
        }

        videoRef.current.onerror = (err) => {
          console.error("Video error:", err)
          setError("Camera preview error")
        }
      }
    } catch (err) {
      console.error("Camera access failed:", err)
      let errorMessage = "Camera access failed. "

      if (err.name === "NotAllowedError") {
        errorMessage += "Please allow camera permissions and refresh the page."
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera found on this device."
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera is being used by another app."
      } else {
        errorMessage += err.message
      }

      throw new Error(errorMessage)
    }
  }

  const initializeThreeJS = () => {
    if (!canvasRef.current) {
      console.error("Canvas ref not available")
      return
    }

    console.log("Initializing Three.js...")

    // Create scene
    const scene = new THREE.Scene()

    // Create camera with proper aspect ratio
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0) // Transparent background
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Store references
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create picture frame
    createPictureFrame()

    // Position camera
    camera.position.set(0, 0, 3)
    camera.lookAt(0, 0, 0)

    // Start render loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)

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

    console.log("Three.js initialized successfully")
  }

  const createPictureFrame = () => {
    const group = new THREE.Group()

    // Frame dimensions
    const frameWidth = 1.2
    const frameHeight = 1.6
    const frameDepth = 0.06
    const borderWidth = 0.06

    // Create frame border (wood frame)
    const frameGeometry = new THREE.BoxGeometry(frameWidth + borderWidth * 2, frameHeight + borderWidth * 2, frameDepth)
    const frameMaterial = new THREE.MeshLambertMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    frameMesh.castShadow = true
    group.add(frameMesh)

    // Create inner frame
    const innerFrameGeometry = new THREE.BoxGeometry(
      frameWidth + borderWidth,
      frameHeight + borderWidth,
      frameDepth * 0.8,
    )
    const innerFrameMaterial = new THREE.MeshLambertMaterial({
      color: 0x654321,
    })
    const innerFrameMesh = new THREE.Mesh(innerFrameGeometry, innerFrameMaterial)
    innerFrameMesh.position.z = frameDepth * 0.1
    group.add(innerFrameMesh)

    // Create artwork plane
    const artworkGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight)

    // Load artwork texture
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = "anonymous"

    const artworkTexture = textureLoader.load(
      wallArtData.imageUrl,
      (texture) => {
        console.log("Artwork texture loaded successfully")
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
      },
      (progress) => {
        console.log("Loading texture:", progress)
      },
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

    // Add subtle glass effect
    const glassGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      roughness: 0,
      metalness: 0,
    })
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial)
    glassMesh.position.z = frameDepth / 2 + 0.02
    group.add(glassMesh)

    // Position the frame initially hidden
    group.position.set(0, 0, -2)
    group.visible = false
    group.castShadow = true

    sceneRef.current.add(group)
    frameRef.current = group

    console.log("Picture frame created")
  }

  const handlePlaceFrame = () => {
    console.log("Placing frame...")
    setIsPlaced(true)
    if (frameRef.current) {
      frameRef.current.visible = true
      frameRef.current.position.set(0, 0, -1.5)
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
      frameRef.current.position.set(0, 0, -1.5)
    }
  }

  const cleanup = () => {
    console.log("Cleaning up AR viewer...")

    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop()
        console.log("Camera track stopped")
      })
    }

    // Cleanup Three.js
    if (rendererRef.current) {
      rendererRef.current.dispose()
    }

    // Remove event listeners
    window.removeEventListener("resize", () => {})
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
          zIndex: 9999,
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            📷 Starting Camera...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cameraReady ? "Camera ready! Loading AR..." : "Please wait while we access your camera"}
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
          zIndex: 9999,
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1">{error}</Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try these steps:
          </Typography>
          <Typography variant="body2" component="div" sx={{ textAlign: "left", mb: 3 }}>
            1. Refresh the page
            <br />
            2. Allow camera permissions
            <br />
            3. Make sure no other app is using the camera
            <br />
            4. Try a different browser (Chrome recommended)
          </Typography>
          <Button variant="contained" onClick={onClose}>
            Close and Try Again
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
        zIndex: 9999,
      }}
    >
      {/* Camera Video Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        webkit-playsinline="true"
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
          top: 20,
          right: 20,
          backgroundColor: "rgba(0,0,0,0.8)",
          color: "white",
          zIndex: 10,
          "&:hover": {
            backgroundColor: "rgba(0,0,0,0.9)",
          },
        }}
      >
        <Close />
      </IconButton>

      {/* Camera Status Indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          gap: 1,
          backgroundColor: cameraReady ? "rgba(0,255,0,0.8)" : "rgba(255,165,0,0.8)",
          color: "white",
          px: 2,
          py: 1,
          borderRadius: 2,
          zIndex: 10,
          fontSize: "0.875rem",
        }}
      >
        <Cameraswitch fontSize="small" />
        <Typography variant="caption">{cameraReady ? "📹 Camera Active" : "📷 Starting Camera..."}</Typography>
      </Box>

      {/* Instructions */}
      {!isPlaced && cameraReady && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 120,
            left: 20,
            right: 20,
            p: 3,
            backgroundColor: "rgba(255,255,255,0.95)",
            textAlign: "center",
            zIndex: 10,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            🎯 Place Your Artwork
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Point your camera at a wall and tap the button below
          </Typography>
          <Button
            variant="contained"
            onClick={handlePlaceFrame}
            sx={{ mt: 2 }}
            startIcon={<CenterFocusStrong />}
            size="large"
            fullWidth
          >
            Place Artwork on Wall
          </Button>
        </Paper>
      )}

      {/* Controls */}
      {isPlaced && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            p: 3,
            backgroundColor: "rgba(255,255,255,0.95)",
            zIndex: 10,
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
            🎨 Adjust Your Artwork
          </Typography>

          {/* Scale control */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Size: {scale.toFixed(1)}x
            </Typography>
            <Slider
              value={scale}
              onChange={handleScaleChange}
              min={0.3}
              max={3.0}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{
                color: "primary.main",
                "& .MuiSlider-thumb": {
                  width: 24,
                  height: 24,
                },
              }}
            />
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-around", gap: 2 }}>
            <Fab size="medium" onClick={handleRotate} color="primary" sx={{ boxShadow: 3 }}>
              <RotateRight />
            </Fab>
            <Fab size="medium" onClick={handleReset} color="secondary" sx={{ boxShadow: 3 }}>
              <CenterFocusStrong />
            </Fab>
          </Box>
        </Paper>
      )}

      {/* Crosshair for placement */}
      {!isPlaced && cameraReady && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 80,
            height: 80,
            border: "4px solid #fff",
            borderRadius: "50%",
            zIndex: 5,
            boxShadow: "0 0 30px rgba(0,0,0,0.7)",
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": {
                transform: "translate(-50%, -50%) scale(1)",
                opacity: 1,
              },
              "50%": {
                transform: "translate(-50%, -50%) scale(1.1)",
                opacity: 0.7,
              },
              "100%": {
                transform: "translate(-50%, -50%) scale(1)",
                opacity: 1,
              },
            },
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 4,
              height: 40,
              backgroundColor: "#fff",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 40,
              height: 4,
              backgroundColor: "#fff",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            },
          }}
        />
      )}
    </Box>
  )
}

export default ARViewer
