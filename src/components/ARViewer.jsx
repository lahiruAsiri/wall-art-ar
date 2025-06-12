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
  const xrSessionRef = useRef(null)
  const hitTestSourceRef = useRef(null)
  const reticleRef = useRef(null)

  const [isPlaced, setIsPlaced] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [xrSupported, setXrSupported] = useState(false)
  const [xrActive, setXrActive] = useState(false)
  const [hitTestReady, setHitTestReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkXRSupport()
    startCamera()
    return () => {
      cleanup()
    }
  }, [])

  const checkXRSupport = async () => {
    if ("xr" in navigator) {
      try {
        const supported = await navigator.xr.isSessionSupported("immersive-ar")
        setXrSupported(supported)
        console.log("WebXR AR supported:", supported)
      } catch (err) {
        console.log("WebXR check failed:", err)
        setXrSupported(false)
      }
    } else {
      console.log("WebXR not available")
      setXrSupported(false)
    }
  }

  const startCamera = async () => {
    try {
      console.log("Starting camera...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

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
        setError("Camera access failed. Please allow camera permissions.")
      }
    }
  }

  const initThreeJS = () => {
    console.log("Initializing 3D scene...")

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.xr.enabled = true

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create reticle (placement indicator)
    createReticle()

    // Create artwork frame
    createArtworkFrame()

    // Position camera for non-AR mode
    camera.position.z = 3

    // Start render loop
    renderer.setAnimationLoop(animate)

    // Add interaction controls
    addInteractionControls()
  }

  const createReticle = () => {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    })
    const reticle = new THREE.Mesh(geometry, material)
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    sceneRef.current.add(reticle)
    reticleRef.current = reticle
  }

  const createArtworkFrame = () => {
    const group = new THREE.Group()

    // Frame
    const frameGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.05)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    frameMesh.castShadow = true
    group.add(frameMesh)

    // Picture
    const pictureGeometry = new THREE.PlaneGeometry(0.5, 0.7)
    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load(wallArtData.imageUrl)
    const pictureMaterial = new THREE.MeshLambertMaterial({ map: texture })
    const pictureMesh = new THREE.Mesh(pictureGeometry, pictureMaterial)
    pictureMesh.position.z = 0.026
    group.add(pictureMesh)

    // Initially hidden
    group.visible = false
    group.matrixAutoUpdate = false

    sceneRef.current.add(group)
    frameRef.current = group
  }

  const addInteractionControls = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Touch events
    canvas.addEventListener("touchstart", onTouch, { passive: false })
    canvas.addEventListener("touchmove", onTouchMove, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd, { passive: false })

    // Mouse events for desktop testing
    canvas.addEventListener("click", onClick)

    // Prevent default behaviors
    canvas.addEventListener("touchstart", (e) => e.preventDefault())
    canvas.addEventListener("touchmove", (e) => e.preventDefault())
  }

  const startXRSession = async () => {
    if (!xrSupported) {
      setError("WebXR AR not supported on this device")
      return
    }

    try {
      console.log("Starting XR session...")
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
      })

      xrSessionRef.current = session
      setXrActive(true)

      // Set up XR session
      await rendererRef.current.xr.setSession(session)

      // Initialize hit testing
      const referenceSpace = await session.requestReferenceSpace("viewer")
      const hitTestSource = await session.requestHitTestSource({ space: referenceSpace })
      hitTestSourceRef.current = hitTestSource
      setHitTestReady(true)

      console.log("XR session started successfully")

      session.addEventListener("end", () => {
        console.log("XR session ended")
        setXrActive(false)
        setHitTestReady(false)
        xrSessionRef.current = null
        hitTestSourceRef.current = null
      })
    } catch (err) {
      console.error("XR session failed:", err)
      setError(`AR session failed: ${err.message}`)
    }
  }

  const onTouch = (event) => {
    if (xrActive && hitTestReady && !isPlaced) {
      placeArtwork()
    } else if (isPlaced) {
      // Handle artwork interaction
      handleArtworkInteraction(event)
    }
  }

  const onTouchMove = (event) => {
    if (isPlaced && frameRef.current) {
      // Move artwork based on touch
      const touch = event.touches[0]
      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1

      // Convert screen coordinates to world coordinates
      const vector = new THREE.Vector3(x, y, 0.5)
      vector.unproject(cameraRef.current)
      const dir = vector.sub(cameraRef.current.position).normalize()
      const distance = -cameraRef.current.position.z / dir.z
      const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance))

      frameRef.current.position.copy(pos)
      frameRef.current.updateMatrix()
    }
  }

  const onTouchEnd = () => {
    // Touch ended
  }

  const onClick = (event) => {
    if (!xrActive && !isPlaced) {
      // Fallback placement for non-XR mode
      placeArtworkFallback(event)
    }
  }

  const placeArtwork = () => {
    if (reticleRef.current && frameRef.current) {
      frameRef.current.position.setFromMatrixPosition(reticleRef.current.matrix)
      frameRef.current.quaternion.setFromRotationMatrix(reticleRef.current.matrix)
      frameRef.current.visible = true
      frameRef.current.updateMatrix()
      setIsPlaced(true)
      reticleRef.current.visible = false
      console.log("Artwork placed at:", frameRef.current.position)
    }
  }

  const placeArtworkFallback = (event) => {
    if (frameRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      const vector = new THREE.Vector3(x, y, 0.5)
      vector.unproject(cameraRef.current)
      const dir = vector.sub(cameraRef.current.position).normalize()
      const distance = 2
      const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance))

      frameRef.current.position.copy(pos)
      frameRef.current.visible = true
      frameRef.current.updateMatrix()
      setIsPlaced(true)
    }
  }

  const handleArtworkInteraction = (event) => {
    // Handle artwork dragging and interaction
    console.log("Artwork interaction")
  }

  const animate = (timestamp, frame) => {
    if (xrActive && frame && hitTestSourceRef.current && !isPlaced) {
      // Hit testing for placement
      const referenceSpace = rendererRef.current.xr.getReferenceSpace()
      const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current)

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0]
        const pose = hit.getPose(referenceSpace)

        if (reticleRef.current && pose) {
          reticleRef.current.visible = true
          reticleRef.current.matrix.fromArray(pose.transform.matrix)
        }
      } else {
        if (reticleRef.current) {
          reticleRef.current.visible = false
        }
      }
    }

    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  const handleScale = (direction) => {
    const newScale = direction === "up" ? scale * 1.2 : scale * 0.8
    setScale(Math.max(0.3, Math.min(3.0, newScale)))
    if (frameRef.current) {
      frameRef.current.scale.setScalar(newScale)
      frameRef.current.updateMatrix()
    }
  }

  const handleRotate = () => {
    const newRotation = rotation + Math.PI / 4
    setRotation(newRotation)
    if (frameRef.current) {
      frameRef.current.rotation.z = newRotation
      frameRef.current.updateMatrix()
    }
  }

  const handleReset = () => {
    setIsPlaced(false)
    setScale(1)
    setRotation(0)
    if (frameRef.current) {
      frameRef.current.visible = false
      frameRef.current.scale.setScalar(1)
      frameRef.current.rotation.z = 0
      frameRef.current.updateMatrix()
    }
    if (reticleRef.current && xrActive) {
      reticleRef.current.visible = true
    }
  }

  const cleanup = () => {
    if (xrSessionRef.current) {
      xrSessionRef.current.end()
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
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
      {/* Camera Video (fallback for non-XR) */}
      {!xrActive && (
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
      )}

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
          touchAction: "none",
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

      {/* AR Status */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          backgroundColor: xrActive ? "rgba(0,255,0,0.8)" : "rgba(255,165,0,0.8)",
          color: "white",
          px: 2,
          py: 1,
          borderRadius: 2,
          zIndex: 10,
        }}
      >
        <Typography variant="caption">
          {xrActive ? "🚀 WebXR Active" : cameraStarted ? "📹 Camera Active" : "📷 Starting..."}
        </Typography>
      </Box>

      {/* Start AR Button */}
      {cameraStarted && xrSupported && !xrActive && (
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
            🚀 Start AR Experience
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter immersive AR mode for the best experience
          </Typography>
          <Button variant="contained" onClick={startXRSession} size="large" fullWidth>
            Start WebXR AR
          </Button>
        </Paper>
      )}

      {/* Placement Instructions */}
      {xrActive && !isPlaced && (
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
            🎯 Find a Surface
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Point your device at a wall or flat surface, then tap to place your artwork
          </Typography>
        </Paper>
      )}

      {/* Fallback Instructions */}
      {!xrSupported && cameraStarted && !isPlaced && (
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
            📱 Tap to Place
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            WebXR not supported. Tap anywhere to place your artwork
          </Typography>
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
            {xrActive ? "Touch and drag to move in AR space" : "Drag to move around"}
          </Typography>
        </Paper>
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
