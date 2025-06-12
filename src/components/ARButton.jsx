"use client"

import { useState } from "react"
import { Button, Typography, CircularProgress, Alert } from "@mui/material"
import { ViewInAr, Warning } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData, isSupported }) => {
  const [isARActive, setIsARActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const testCameraAccess = async () => {
    try {
      console.log("Testing camera access...")

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available on this device")
      }

      // Test camera access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      console.log("Camera test successful:", stream)

      // Stop test stream immediately
      stream.getTracks().forEach((track) => {
        track.stop()
        console.log("Test camera track stopped")
      })

      return true
    } catch (err) {
      console.error("Camera test failed:", err)

      let errorMessage = "Camera access failed: "
      switch (err.name) {
        case "NotAllowedError":
          errorMessage += "Permission denied. Please allow camera access."
          break
        case "NotFoundError":
          errorMessage += "No camera found on this device."
          break
        case "NotReadableError":
          errorMessage += "Camera is being used by another application."
          break
        case "OverconstrainedError":
          errorMessage += "Camera doesn't meet requirements."
          break
        default:
          errorMessage += err.message
      }

      throw new Error(errorMessage)
    }
  }

  const handleARClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      console.log("AR button clicked, starting camera test...")

      // Test camera access first
      await testCameraAccess()

      console.log("Camera test passed, starting AR...")

      // Small delay to ensure UI updates
      setTimeout(() => {
        setIsARActive(true)
        setIsLoading(false)
      }, 500)
    } catch (err) {
      console.error("AR start failed:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handleCloseAR = () => {
    console.log("Closing AR viewer...")
    setIsARActive(false)
  }

  return (
    <>
      <Button
        variant="contained"
        size="large"
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ViewInAr />}
        onClick={handleARClick}
        disabled={isLoading}
        sx={{
          minWidth: 220,
          py: 2,
          fontSize: "1.1rem",
          background: "linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          "&:hover": {
            background: "linear-gradient(45deg, #FF5252 30%, #26A69A 90%)",
            boxShadow: "0 6px 25px rgba(0,0,0,0.4)",
          },
          "&:disabled": {
            background: "rgba(0,0,0,0.12)",
          },
        }}
      >
        {isLoading ? "Starting Camera..." : "📱 View in AR"}
      </Button>

      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Try Again
            </Button>
          }
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {!isSupported && (
        <Alert severity="info" sx={{ mt: 2 }} icon={<Warning />}>
          <Typography variant="body2">📱 For best AR experience, use this on a mobile device with camera</Typography>
        </Alert>
      )}

      {/* AR Viewer - Full Screen */}
      {isARActive && <ARViewer wallArtData={wallArtData} onClose={handleCloseAR} />}
    </>
  )
}

export default ARButton
