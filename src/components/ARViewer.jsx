"use client"

import { useRef, useEffect, useState } from "react"
import { Box, IconButton, Typography, Fab, Paper, Slider, Button } from "@mui/material"
import { Close, RotateRight, CenterFocusStrong } from "@mui/icons-material"
import * as THREE from "three"

const ARViewer = ({ wallArtData, onClose }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const frameRef = useRef(null)

  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const [componentMounted, setComponentMounted] = useState(false)

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

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Create frame
    createFrame()

    // Position camera
    camera.position.z = 3

    // Start animation
    animate()
  }

  const createFrame = () => {
    const group = new THREE.Group()

    // Frame
    const frameGeometry = new THREE.BoxGeometry(2.2, 2.8, 0.1)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    group.add(frameMesh)

    // Picture
    const pictureGeometry = new THREE.PlaneGeometry(2, 2.6)
    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(wallArtData.imageUrl)
    const pictureMaterial = new THREE.MeshLambertMaterial({ map: texture })
    const pictureMesh = new THREE.Mesh(pictureGeometry, pictureMaterial)
    pictureMesh.position.z = 0.06
    group.add(pictureMesh)

    // Hide initially
    group.position.set(0, 0, -2)
    group.visible = false

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const animate = () => {
    requestAnimationFrame(animate)
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  const handlePlace = () => {
    setIsPlaced(true)
    if (frameRef.current) {
      frameRef.current.visible = true
      frameRef.current.position.set(0, 0, -1.5)
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
    if (frameRef.current) {
      frameRef.current.scale.setScalar(1)
      frameRef.current.rotation.z = 0
      frameRef.current.position.set(0, 0, -1.5)
    }
  }

  const cleanup = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
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

      {/* Place Button */}
      {!isPlaced && cameraStarted && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 100,
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
            Point at a wall and tap to place
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
            🎨 Adjust Size & Position
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">Size: {scale.toFixed(1)}x</Typography>
            <Slider value={scale} onChange={handleScale} min={0.5} max={2.5} step={0.1} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-around" }}>
            <Fab onClick={handleRotate} color="primary">
              <RotateRight />
            </Fab>
            <Fab onClick={handleReset} color="secondary">
              <CenterFocusStrong />
            </Fab>
          </Box>
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
            width: 60,
            height: 60,
            border: "3px solid white",
            borderRadius: "50%",
            zIndex: 5,
            "&::before": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 3,
              height: 30,
              backgroundColor: "white",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 30,
              height: 3,
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
