"use client"

import { useState } from "react"
import { Button, Typography, CircularProgress, Alert, Box } from "@mui/material"
import { ViewInAr, Warning } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData, isSupported }) => {
  const [isARActive, setIsARActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleARClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      console.log("AR button clicked")

      // Quick camera availability check
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not available on this device")
      }

      // Start AR immediately - let ARViewer handle the camera setup
      setIsARActive(true)
      setIsLoading(false)
    } catch (err) {
      console.error("AR start failed:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handleCloseAR = () => {
    console.log("Closing AR viewer")
    setIsARActive(false)
  }

  return (
    <Box>
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
        }}
      >
        {isLoading ? "Starting..." : "📱 View in AR"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {!isSupported && (
        <Alert severity="info" sx={{ mt: 2 }} icon={<Warning />}>
          <Typography variant="body2">📱 For best results, use this on a mobile device with camera</Typography>
        </Alert>
      )}

      {/* AR Viewer */}
      {isARActive && <ARViewer wallArtData={wallArtData} onClose={handleCloseAR} />}
    </Box>
  )
}

export default ARButton
