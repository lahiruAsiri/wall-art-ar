"use client"

import { useRef, useEffect, useState } from "react"
import { Box, IconButton, Typography, Fab, Paper, Button, Alert } from "@mui/material"
import { Close, RotateRight, CenterFocusStrong, Add, Remove } from "@mui/icons-material"
import * as THREE from "three"

const ARViewer = ({ wallArtData, onClose }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const frameRef = useRef(null)
  const animationFrameRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })

  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [framePosition, setFramePosition] = useState({ x: 0, y: 0, z: -2 })
  const [error, setError] = useState(null)

  useEffect(() => {
    startCamera()
    return () => {
      cleanup()
    }
  }, [])

  const startCamera = async () => {
    try {
      console.log("Starting camera...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            .play()
            .then(() => {
              console.log("Camera started successfully")
              setCameraStarted(true)
              initScene()
            })
            .catch((err) => {
              console.error("Video play failed:", err)
              setError(`Failed to play video: ${err.message}`)
            })
        }
      }
    } catch (error) {
      console.error("Camera error:", error)
      setError(`Camera error: ${error.message}`)
      // Try with any camera as fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .then(() => {
                console.log("Fallback camera started")
                setCameraStarted(true)
                initScene()
              })
              .catch((err) => {
                console.error("Video play failed:", err)
                setError(`Failed to play video (fallback): ${err.message}`)
              })
          }
        }
      } catch (err) {
        console.error("All camera attempts failed:", err)
        setError(`All camera attempts failed: ${err.message}`)
      }
    }
  }

  const initScene = () => {
    console.log("Initializing 3D scene...")

    // Create scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Create frame
    createFrame()

    // Position camera
    camera.position.z = 5

    // Add event listeners
    addEventListeners()

    // Start animation loop
    animate()

    console.log("Scene initialized")
  }

  const createFrame = () => {
    console.log("Creating frame with image:", wallArtData.imageUrl)

    const group = new THREE.Group()

    // Frame
    const frameGeometry = new THREE.BoxGeometry(2, 2.5, 0.1)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1,
    })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    group.add(frameMesh)

    // Picture
    const pictureGeometry = new THREE.PlaneGeometry(1.8, 2.3)
    const textureLoader = new THREE.TextureLoader()

    // Use a placeholder color while loading
    const tempMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc })
    const pictureMesh = new THREE.Mesh(pictureGeometry, tempMaterial)

    // Load the actual texture
    textureLoader.load(
      wallArtData.imageUrl,
      (texture) => {
        console.log("Texture loaded successfully")
        pictureMesh.material = new THREE.MeshBasicMaterial({ map: texture })
      },
      undefined,
      (error) => console.error("Error loading texture:", error),
    )

    pictureMesh.position.z = 0.06
    group.add(pictureMesh)

    // Position and hide initially
    group.position.set(0, 0, -2)
    group.visible = false

    sceneRef.current.add(group)
    frameRef.current = group

    console.log("Frame created")
  }

  const addEventListeners = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Touch events
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)
    canvas.addEventListener("touchend", handleTouchEnd)

    // Mouse events (for testing on desktop)
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)

    // Prevent default behaviors
    canvas.addEventListener("touchstart", (e) => e.preventDefault())
    canvas.addEventListener("touchmove", (e) => e.preventDefault())
  }

  const handleTouchStart = (event) => {
    event.preventDefault()
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }

    if (!isPlaced) {
      handlePlace()
    } else {
      setIsDragging(true)
    }
  }

  const handleTouchMove = (event) => {
    if (!isDragging || !isPlaced || !frameRef.current) return
    event.preventDefault()

    const touch = event.touches[0]
    const deltaX = (touch.clientX - touchStartRef.current.x) * 0.01
    const deltaY = (touch.clientY - touchStartRef.current.y) * -0.01

    // Update frame position
    const newPosition = {
      x: frameRef.current.position.x + deltaX,
      y: frameRef.current.position.y + deltaY,
      z: frameRef.current.position.z,
    }

    frameRef.current.position.set(newPosition.x, newPosition.y, newPosition.z)
    setFramePosition(newPosition)

    // Update touch start for next move
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Mouse handlers (for desktop testing)
  const handleMouseDown = (event) => {
    touchStartRef.current = { x: event.clientX, y: event.clientY }

    if (!isPlaced) {
      handlePlace()
    } else {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (event) => {
    if (!isDragging || !isPlaced || !frameRef.current) return

    const deltaX = (event.clientX - touchStartRef.current.x) * 0.01
    const deltaY = (event.clientY - touchStartRef.current.y) * -0.01

    // Update frame position
    const newPosition = {
      x: frameRef.current.position.x + deltaX,
      y: frameRef.current.position.y + deltaY,
      z: frameRef.current.position.z,
    }

    frameRef.current.position.set(newPosition.x, newPosition.y, newPosition.z)
    setFramePosition(newPosition)

    // Update mouse position for next move
    touchStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const animate = () => {
    animationFrameRef.current = requestAnimationFrame(animate)

    // Add subtle floating animation when not dragging
    if (frameRef.current && isPlaced && !isDragging) {
      const time = Date.now() * 0.001
      frameRef.current.rotation.y = Math.sin(time * 0.5) * 0.05
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  const handlePlace = () => {
    console.log("Placing artwork")
    setIsPlaced(true)
    if (frameRef.current) {
      frameRef.current.visible = true
      frameRef.current.position.set(0, 0, -2)
    }
  }

  const handleScale = (direction) => {
    const newScale = direction === "up" ? scale * 1.2 : scale * 0.8
    const clampedScale = Math.max(0.5, Math.min(3.0, newScale))
    setScale(clampedScale)

    if (frameRef.current) {
      frameRef.current.scale.setScalar(clampedScale)
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
    }

    const canvas = canvasRef.current
    if (canvas) {
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
    }
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
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={onClose}>
            Close
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
        backgroundColor: "black",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Camera Video */}
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
        }}
      />

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          touchAction: "none", // Prevent scrolling
        }}
      />

      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 20,
          right: 20,
          backgroundColor: "rgba(0,0,0,0.7)",
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
          backgroundColor: "rgba(0,255,0,0.8)",
          color: "white",
          px: 2,
          py: 1,
          borderRadius: 2,
          zIndex: 10,
        }}
      >
        <Typography variant="caption">{cameraStarted ? "📹 Camera Active" : "📷 Starting..."}</Typography>
      </Box>

      {/* Place Button */}
      {!isPlaced && cameraStarted && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 120,
            left: 20,
            right: 20,
            p: 3,
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <Typography variant="h6" gutterBottom>
            🎯 Place Your Wall Art
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Tap anywhere to place your artwork
          </Typography>
          <Button variant="contained" onClick={handlePlace} size="large" fullWidth>
            Place Artwork Here
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
            zIndex: 10,
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            🎨 Adjust Your Artwork
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-around", gap: 1 }}>
            <Fab size="small" onClick={() => handleScale("down")} color="primary">
              <Remove />
            </Fab>
            <Fab size="small" onClick={() => handleScale("up")} color="primary">
              <Add />
            </Fab>
            <Fab size="small" onClick={handleRotate} color="secondary">
              <RotateRight />
            </Fab>
            <Fab size="small" onClick={handleReset} color="default">
              <CenterFocusStrong />
            </Fab>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
            Drag the artwork to move it around
          </Typography>
        </Paper>
      )}

      {/* Instructions */}
      {isPlaced && (
        <Box
          sx={{
            position: "absolute",
            top: 80,
            left: 20,
            right: 20,
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            p: 2,
            borderRadius: 2,
            zIndex: 10,
            textAlign: "center",
          }}
        >
          <Typography variant="body2">👆 Touch and drag to move the artwork</Typography>
        </Box>
      )}

      {/* Loading */}
      {!cameraStarted && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "white",
            zIndex: 10,
          }}
        >
          <Typography variant="h6">📷 Starting Camera...</Typography>
          <Typography variant="body2">Please allow camera access</Typography>
        </Box>
      )}
    </Box>
  )
}

export default ARViewer
