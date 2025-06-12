"use client"

import { useState } from "react"
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material"
import { ViewInAr } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData, isSupported }) => {
  const [isARActive, setIsARActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const handleARClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Check if device supports WebXR
      if ("xr" in navigator) {
        const supported = await navigator.xr.isSessionSupported("immersive-ar")
        if (supported) {
          setIsARActive(true)
          setIsLoading(false)
          return
        }
      }

      // iOS AR Quick Look fallback
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        setShowInstructions(true)
        setIsLoading(false)
        return
      }

      // Android or other mobile devices - show AR viewer
      setIsARActive(true)
      setIsLoading(false)
    } catch (err) {
      console.error("AR initialization failed:", err)
      setError("AR feature is not available on this device")
      setIsLoading(false)
    }
  }

  const handleCloseAR = () => {
    setIsARActive(false)
  }

  const handleCloseInstructions = () => {
    setShowInstructions(false)
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
          minWidth: 200,
          py: 1.5,
          background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)",
          },
        }}
      >
        {isLoading ? "Loading AR..." : "View in AR"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* AR Viewer Dialog */}
      <Dialog fullScreen open={isARActive} onClose={handleCloseAR} sx={{ zIndex: 9999 }}>
        <ARViewer wallArtData={wallArtData} onClose={handleCloseAR} />
      </Dialog>

      {/* iOS Instructions Dialog */}
      <Dialog open={showInstructions} onClose={handleCloseInstructions}>
        <DialogTitle>AR Instructions</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            To view this wall art in AR on iOS:
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Tap the AR icon below</li>
              <li>Allow camera access</li>
              <li>Point your camera at a wall</li>
              <li>Tap to place the artwork</li>
              <li>Use gestures to resize and move</li>
            </ol>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInstructions}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ARButton
