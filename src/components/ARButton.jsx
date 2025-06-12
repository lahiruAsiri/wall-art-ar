"use client"

import { useState } from "react"
import { Button, Alert, Typography } from "@mui/material"
import { ViewInAr } from "@mui/icons-material"
import ARViewer from "./ARViewer"

const ARButton = ({ wallArtData }) => {
  const [showAR, setShowAR] = useState(false)
  const [error, setError] = useState("")

  const handleClick = async () => {
    // Check camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera not supported on this device")
      return
    }

    setShowAR(true)
  }

  const handleClose = () => {
    setShowAR(false)
  }

  return (
    <>
      <Button
        variant="contained"
        size="large"
        startIcon={<ViewInAr />}
        onClick={handleClick}
        sx={{
          minWidth: 200,
          py: 2,
          background: "linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)",
          fontSize: "1.1rem",
          "&:hover": {
            background: "linear-gradient(45deg, #FF5252 30%, #26A69A 90%)",
          },
        }}
      >
        📱 View in AR
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {showAR && <ARViewer wallArtData={wallArtData} onClose={handleClose} />}
    </>
  )
}

export default ARButton
