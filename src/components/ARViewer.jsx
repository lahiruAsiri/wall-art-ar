"use client"

import { useRef, useEffect, useState } from "react"
import { Box, IconButton, Typography, Fab, Paper, Slider, Button } from "@mui/material"
import { Close, RotateRight, CenterFocusStrong, ZoomIn, ZoomOut } from "@mui/icons-material"
import * as THREE from "three"

const ARViewer = ({ wallArtData, onClose }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const frameRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [framePosition, setFramePosition] = useState({ x: 0, y: 0, z: -2 })

  useEffect(() => {
    startCamera()
    return () => {
      cleanup()
    }
  }, [])

  const startCamera = async () => {
    try {
      console.log("Starting camera...")

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      // Set up video
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setCameraStarted(true)
          initThreeJS()
        }
      }
    } catch (error) {
      console.error("Camera error:", error)
      // Try with any camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setCameraStarted(true)
            initThreeJS()
          }
        }
      } catch (err) {
        console.error("All camera attempts failed:", err)
      }
    }
  }

  const initThreeJS = () => {
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
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create frame
    createFrame()

    // Position camera
    camera.position.z = 3

    // Add touch/mouse controls
    addInteractionControls()

    // Start animation
    animate()
  }

  const createFrame = () => {
    const group = new THREE.Group()

    // Frame (wood texture)
    const frameGeometry = new THREE.BoxGeometry(2.2, 2.8, 0.15)
    const frameMaterial = new THREE.MeshLambertMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    frameMesh.castShadow = true
    group.add(frameMesh)

    // Inner frame
    const innerFrameGeometry = new THREE.BoxGeometry(2.0, 2.6, 0.1)
    const innerFrameMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 })
    const innerFrameMesh = new THREE.Mesh(innerFrameGeometry, innerFrameMaterial)
    innerFrameMesh.position.z = 0.03
    group.add(innerFrameMesh)

    // Picture
    const pictureGeometry = new THREE.PlaneGeometry(1.8, 2.4)
    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(wallArtData.imageUrl)
    const pictureMaterial = new THREE.MeshLambertMaterial({ map: texture })
    const pictureMesh = new THREE.Mesh(pictureGeometry, pictureMaterial)
    pictureMesh.position.z = 0.08
    group.add(pictureMesh)

    // Glass effect
    const glassGeometry = new THREE.PlaneGeometry(1.8, 2.4)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      roughness: 0,
      metalness: 0,
      clearcoat: 1,
    })
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial)
    glassMesh.position.z = 0.09
    group.add(glassMesh)

    // Set initial position
    group.position.set(framePosition.x, framePosition.y, framePosition.z)
    group.visible = false
    group.name = "artworkFrame"

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const addInteractionControls = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Touch events for mobile
    canvas.addEventListener("touchstart", onTouchStart, { passive: false })
    canvas.addEventListener("touchmove", onTouchMove, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd, { passive: false })

    // Mouse events for desktop
    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("mouseup", onMouseUp)

    // Prevent default touch behaviors
    canvas.addEventListener("touchstart", (e) => e.preventDefault())
    canvas.addEventListener("touchmove", (e) => e.preventDefault())
  }

  const getPointerPosition = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    let clientX, clientY

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    }
  }

  const onTouchStart = (event) => {
    if (!isPlaced || !frameRef.current) return

    const pointer = getPointerPosition(event)
    setIsDragging(true)
    setDragStart({ x: pointer.x, y: pointer.y })

    // Add visual feedback
    if (frameRef.current) {
      frameRef.current.scale.setScalar(scale * 1.05)
    }
  }

  const onTouchMove = (event) => {
    if (!isDragging || !isPlaced || !frameRef.current) return

    const pointer = getPointerPosition(event)
    const deltaX = (pointer.x - dragStart.x) * 3
    const deltaY = (pointer.y - dragStart.y) * 3

    // Update frame position
    const newPosition = {
      x: framePosition.x + deltaX,
      y: framePosition.y + deltaY,
      z: framePosition.z,
    }

    frameRef.current.position.set(newPosition.x, newPosition.y, newPosition.z)
    setFramePosition(newPosition)
    setDragStart({ x: pointer.x, y: pointer.y })
  }

  const onTouchEnd = () => {
    setIsDragging(false)

    // Remove visual feedback
    if (frameRef.current) {
      frameRef.current.scale.setScalar(scale)
    }
  }

  // Mouse events (same logic as touch)
  const onMouseDown = (event) => onTouchStart(event)
  const onMouseMove = (event) => onTouchMove(event)
  const onMouseUp = () => onTouchEnd()

  const animate = () => {
    requestAnimationFrame(animate)

    // Add subtle floating animation when not dragging
    if (frameRef.current && isPlaced && !isDragging) {
      const time = Date.now() * 0.001
      frameRef.current.rotation.y = Math.sin(time * 0.5) * 0.02
      frameRef.current.position.y = framePosition.y + Math.sin(time) * 0.01
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  const handlePlace = () => {
    setIsPlaced(true)
    if (frameRef.current) {
      frameRef.current.visible = true
      const newPos = { x: 0, y: 0, z: -1.5 }
      frameRef.current.position.set(newPos.x, newPos.y, newPos.z)
      setFramePosition(newPos)
    }
  }

  const handleScale = (event, newValue) => {
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
    const resetPos = { x: 0, y: 0, z: -1.5 }
    setFramePosition(resetPos)

    if (frameRef.current) {
      frameRef.current.scale.setScalar(1)
      frameRef.current.rotation.z = 0
      frameRef.current.position.set(resetPos.x, resetPos.y, resetPos.z)
    }
  }

  const moveCloser = () => {
    const newPos = { ...framePosition, z: framePosition.z + 0.3 }
    setFramePosition(newPos)
    if (frameRef.current) {
      frameRef.current.position.set(newPos.x, newPos.y, newPos.z)
    }
  }

  const moveFarther = () => {
    const newPos = { ...framePosition, z: framePosition.z - 0.3 }
    setFramePosition(newPos)
    if (frameRef.current) {
      frameRef.current.position.set(newPos.x, newPos.y, newPos.z)
    }
  }

  const cleanup = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
    }

    // Remove event listeners
    const canvas = canvasRef.current
    if (canvas) {
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
      canvas.removeEventListener("mousedown", onMouseDown)
      canvas.removeEventListener("mousemove", onMouseMove)
      canvas.removeEventListener("mouseup", onMouseUp)
    }
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
      {cameraStarted && (
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
          <Typography variant="caption">📹 Camera Active</Typography>
        </Box>
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
          }}
        >
          <Typography variant="body2" align="center">
            👆 Drag to move • 🔄 Use controls to adjust • 📏 Pinch to resize
          </Typography>
        </Box>
      )}

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
            Point at a wall and tap to place your artwork
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

          {/* Size Control */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">Size: {scale.toFixed(1)}x</Typography>
            <Slider value={scale} onChange={handleScale} min={0.3} max={3.0} step={0.1} sx={{ mb: 1 }} />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-around", gap: 1 }}>
            <Fab size="small" onClick={moveCloser} color="primary">
              <ZoomIn />
            </Fab>
            <Fab size="small" onClick={moveFarther} color="primary">
              <ZoomOut />
            </Fab>
            <Fab size="small" onClick={handleRotate} color="secondary">
              <RotateRight />
            </Fab>
            <Fab size="small" onClick={handleReset} color="default">
              <CenterFocusStrong />
            </Fab>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
            Drag the artwork to move it around your wall
          </Typography>
        </Paper>
      )}

      {/* Crosshair */}
      {!isPlaced && cameraStarted && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 80,
            height: 80,
            border: "4px solid white",
            borderRadius: "50%",
            zIndex: 5,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
              "50%": { transform: "translate(-50%, -50%) scale(1.1)", opacity: 0.7 },
              "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
            },
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 4,
              height: 40,
              backgroundColor: "white",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 40,
              height: 4,
              backgroundColor: "white",
            },
          }}
        />
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
