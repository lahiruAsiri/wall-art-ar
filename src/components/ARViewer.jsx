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
  const [debugInfo, setDebugInfo] = useState("")

  useEffect(() => {
    console.log("ARViewer mounted, starting initialization...")
    initializeAR()
    return () => {
      console.log("ARViewer unmounting, cleaning up...")
      cleanup()
    }
  }, [])

  const initializeAR = async () => {
    try {
      setDebugInfo("Checking camera availability...")
      console.log("Starting AR initialization...")

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device")
      }

      setDebugInfo("Requesting camera access...")
      await startCamera()

      setDebugInfo("Camera started, initializing 3D scene...")
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for camera to stabilize

      initializeThreeJS()
      setIsLoading(false)
      setDebugInfo("AR ready!")
    } catch (err) {
      console.error("AR initialization failed:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      console.log("Requesting camera access...")

      // Try different camera configurations
      const configs = [
        // Configuration 1: Ideal back camera
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Configuration 2: Prefer back camera
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Configuration 3: Any camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Configuration 4: Basic video
        {
          video: true,
        },
      ]

      let stream = null
      let lastError = null

      for (let i = 0; i < configs.length; i++) {
        try {
          console.log(`Trying camera config ${i + 1}:`, configs[i])
          setDebugInfo(`Trying camera configuration ${i + 1}...`)

          stream = await navigator.mediaDevices.getUserMedia(configs[i])
          console.log(`Camera config ${i + 1} successful:`, stream)
          break
        } catch (err) {
          console.log(`Camera config ${i + 1} failed:`, err.message)
          lastError = err
          continue
        }
      }

      if (!stream) {
        throw lastError || new Error("All camera configurations failed")
      }

      console.log("Camera stream obtained:", stream)
      setCameraStream(stream)

      // Set up video element
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      video.srcObject = stream
      video.setAttribute("playsinline", "true")
      video.setAttribute("webkit-playsinline", "true")
      video.muted = true
      video.autoplay = true

      // Handle video events
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Camera startup timeout"))
        }, 10000) // 10 second timeout

        video.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          setDebugInfo("Video metadata loaded, starting playback...")
          clearTimeout(timeout)

          video
            .play()
            .then(() => {
              console.log("Video playing successfully")
              setCameraReady(true)
              setDebugInfo("Camera active!")
              resolve()
            })
            .catch((playError) => {
              console.error("Video play failed:", playError)
              reject(new Error(`Video play failed: ${playError.message}`))
            })
        }

        video.onerror = (err) => {
          console.error("Video error:", err)
          clearTimeout(timeout)
          reject(new Error("Video element error"))
        }

        video.onloadstart = () => {
          console.log("Video load started")
          setDebugInfo("Loading video stream...")
        }

        video.oncanplay = () => {
          console.log("Video can play")
          setDebugInfo("Video ready to play...")
        }
      })
    } catch (err) {
      console.error("Camera access failed:", err)
      let errorMessage = "Camera failed: "

      switch (err.name) {
        case "NotAllowedError":
          errorMessage += "Permission denied. Please allow camera access and try again."
          break
        case "NotFoundError":
          errorMessage += "No camera found. Please check if your device has a camera."
          break
        case "NotReadableError":
          errorMessage += "Camera is busy. Please close other apps using the camera."
          break
        case "OverconstrainedError":
          errorMessage += "Camera doesn't support the required settings."
          break
        case "SecurityError":
          errorMessage += "Camera access blocked. Please use HTTPS."
          break
        default:
          errorMessage += err.message
      }

      throw new Error(errorMessage)
    }
  }

  const initializeThreeJS = () => {
    try {
      console.log("Initializing Three.js...")

      if (!canvasRef.current) {
        throw new Error("Canvas element not found")
      }

      // Create scene
      const scene = new THREE.Scene()

      // Create camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      })

      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(0x000000, 0) // Transparent
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

      // Start render loop
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate)
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      }
      animate()

      // Handle resize
      const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight
          cameraRef.current.updateProjectionMatrix()
          rendererRef.current.setSize(window.innerWidth, window.innerHeight)
        }
      }
      window.addEventListener("resize", handleResize)

      console.log("Three.js initialized successfully")
    } catch (err) {
      console.error("Three.js initialization failed:", err)
      setError(`3D initialization failed: ${err.message}`)
    }
  }

  const createPictureFrame = () => {
    const group = new THREE.Group()

    // Frame dimensions
    const frameWidth = 1.2
    const frameHeight = 1.6
    const frameDepth = 0.06
    const borderWidth = 0.06

    // Create frame
    const frameGeometry = new THREE.BoxGeometry(frameWidth + borderWidth * 2, frameHeight + borderWidth * 2, frameDepth)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    group.add(frameMesh)

    // Create artwork
    const artworkGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight)
    const textureLoader = new THREE.TextureLoader()

    const artworkTexture = textureLoader.load(
      wallArtData.imageUrl,
      () => console.log("Artwork loaded"),
      undefined,
      (error) => console.error("Artwork load error:", error),
    )

    const artworkMaterial = new THREE.MeshLambertMaterial({ map: artworkTexture })
    const artworkMesh = new THREE.Mesh(artworkGeometry, artworkMaterial)
    artworkMesh.position.z = frameDepth / 2 + 0.01
    group.add(artworkMesh)

    // Position and hide initially
    group.position.set(0, 0, -2)
    group.visible = false

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const handlePlaceFrame = () => {
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

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop()
        console.log("Camera track stopped:", track.kind)
      })
    }

    if (rendererRef.current) {
      rendererRef.current.dispose()
    }
  }

  // Loading screen
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "black",
          color: "white",
          zIndex: 9999,
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 350, backgroundColor: "rgba(255,255,255,0.95)" }}>
          <Typography variant="h6" gutterBottom color="text.primary">
            📷 Starting AR Camera
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {debugInfo}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            This may take a few seconds...
          </Typography>
          <Button onClick={onClose} sx={{ mt: 2 }} variant="outlined" size="small">
            Cancel
          </Button>
        </Paper>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </Box>
    )
  }

  // Error screen
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
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {error}
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom>
            Troubleshooting Steps:
          </Typography>
          <Typography variant="body2" component="div" sx={{ textAlign: "left", mb: 3 }}>
            1. <strong>Refresh the page</strong> and try again
            <br />
            2. <strong>Allow camera permissions</strong> when prompted
            <br />
            3. <strong>Close other apps</strong> that might be using the camera
            <br />
            4. <strong>Try Chrome browser</strong> for best compatibility
            <br />
            5. <strong>Check if HTTPS</strong> is enabled (required for camera)
          </Typography>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="outlined" onClick={onClose}>
              Close
            </Button>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </Box>
        </Paper>
      </Box>
    )
  }

  // Main AR interface
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
        }}
      >
        <Close />
      </IconButton>

      {/* Camera Status */}
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
        }}
      >
        <Cameraswitch fontSize="small" />
        <Typography variant="caption">{cameraReady ? "📹 Camera Active" : "📷 Starting..."}</Typography>
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
            Point your camera at a wall and tap below
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
          <Typography variant="subtitle1" gutterBottom>
            🎨 Adjust Artwork
          </Typography>

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
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-around", gap: 2 }}>
            <Fab size="medium" onClick={handleRotate} color="primary">
              <RotateRight />
            </Fab>
            <Fab size="medium" onClick={handleReset} color="secondary">
              <CenterFocusStrong />
            </Fab>
          </Box>
        </Paper>
      )}

      {/* Crosshair */}
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
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 4,
              height: 40,
              backgroundColor: "#fff",
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
            },
          }}
        />
      )}
    </Box>
  )
}

export default ARViewer
