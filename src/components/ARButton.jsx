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
  Box,
} from "@mui/material"
import { ViewInAr, CameraAlt } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData, isSupported }) => {
  const [isARActive, setIsARActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)

  const checkCameraPermission = async () => {
    try {
      // Check if camera permission is already granted
      const permission = await navigator.permissions.query({ name: "camera" })
      return permission.state === "granted"
    } catch (err) {
      // Fallback: try to access camera directly
      return false
    }
  }

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      // Stop the stream immediately as we just needed to check permission
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (err) {
      console.error("Camera access denied:", err)
      return false
    }
  }

  const handleARClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not available on this device")
      }

      // Check camera permission
      const hasPermission = await checkCameraPermission()
      if (!hasPermission) {
        setShowPermissionDialog(true)
        setIsLoading(false)
        return
      }

      // Test camera access
      const cameraWorking = await requestCameraAccess()
      if (!cameraWorking) {
        throw new Error("Camera access denied. Please allow camera permissions.")
      }

      // Start AR
      setIsARActive(true)
      setIsLoading(false)
    } catch (err) {
      console.error("AR initialization failed:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handlePermissionDialogClose = () => {
    setShowPermissionDialog(false)
    setIsLoading(false)
  }

  const handleTryAgain = async () => {
    setShowPermissionDialog(false)
    await handleARClick()
  }

  const handleCloseAR = () => {
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
          minWidth: 200,
          py: 1.5,
          background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)",
          },
        }}
      >
        {isLoading ? "Starting Camera..." : "View in AR"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">{error}</Typography>
          <Button size="small" onClick={() => setError(null)} sx={{ mt: 1 }}>
            Try Again
          </Button>
        </Alert>
      )}

      {/* Camera Permission Dialog */}
      <Dialog open={showPermissionDialog} onClose={handlePermissionDialogClose}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CameraAlt color="primary" />
          Camera Permission Required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            To use AR features, we need access to your camera.
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: "grey.100", borderRadius: 1 }}>
            <Typography variant="body2" component="div">
              <strong>Steps:</strong>
              <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>
                <li>Click "Allow Camera Access" below</li>
                <li>When prompted, select "Allow" for camera permission</li>
                <li>Point your camera at a wall to place artwork</li>
              </ol>
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Your camera feed stays on your device and is not recorded or shared.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePermissionDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleTryAgain} startIcon={<CameraAlt />}>
            Allow Camera Access
          </Button>
        </DialogActions>
      </Dialog>

      {/* AR Viewer */}
      {isARActive && <ARViewer wallArtData={wallArtData} onClose={handleCloseAR} />}
    </>
  )
}

export default ARButton
