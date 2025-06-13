"use client"

import { useState } from "react"
import { Button, Typography, CircularProgress, Alert, Box } from "@mui/material"
import { ViewInAr } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData }) => {
  const [showAR, setShowAR] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Check camera availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not available on this device")
      }

      // Quick permission check
      await navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        // Stop the stream immediately, we just needed to check permission
        stream.getTracks().forEach((track) => track.stop())
      })

      setShowAR(true)
    } catch (err) {
      console.error("AR start failed:", err)
      setError(`Camera access failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setShowAR(false)
  }

  return (
    <Box>
      <Button
        variant="contained"
        size="large"
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ViewInAr />}
        onClick={handleClick}
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

      {showAR && <ARViewer wallArtData={wallArtData} onClose={handleClose} />}
    </Box>
  )
}

export default ARButton
