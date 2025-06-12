"use client"

import React, { useState } from "react"
import { Card, CardMedia, CardContent, CardActions, Typography, Box, Chip } from "@mui/material"
import ARButton from "./ARButton"

const ImageDisplay = () => {
  const [isARSupported, setIsARSupported] = useState(false)

  // Hardcoded wall art image with frame
  const wallArtData = {
    id: 1,
    title: "Abstract Mountain Landscape",
    price: "$89.99",
    imageUrl: "https://cdn.leonardo.ai/users/56148a3e-5d5e-4c3d-8a5d-9389c7a5de4a/generations/6eecfc46-f587-444d-ab71-981e2346d6fa/Leonardo_Lightning_XL_Mystic_Moon_Phases_0.jpg",
    frameColor: "black",
    size: "24x18 inches",
  }

  React.useEffect(() => {
    // Check AR support
    const checkARSupport = async () => {
      if ("xr" in navigator) {
        try {
          const supported = await navigator.xr.isSessionSupported("immersive-ar")
          setIsARSupported(supported)
        } catch (error) {
          console.log("WebXR not supported:", error)
          // Check for iOS AR Quick Look support
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
          setIsARSupported(isIOS)
        }
      } else {
        // Fallback: assume mobile devices can support AR
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        setIsARSupported(isMobile)
      }
    }

    checkARSupport()
  }, [])

  return (
    <Box sx={{ mt: 4 }}>
      <Card sx={{ maxWidth: 500, mx: "auto", boxShadow: 3 }}>
        <CardMedia
          component="img"
          height="400"
          image={wallArtData.imageUrl}
          alt={wallArtData.title}
          sx={{ objectFit: "cover" }}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {wallArtData.title}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" color="primary">
              {wallArtData.price}
            </Typography>
            <Chip label={wallArtData.size} variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Frame Color: {wallArtData.frameColor}
          </Typography>
          {!isARSupported && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
              AR feature works best on mobile devices
            </Typography>
          )}
        </CardContent>
        <CardActions sx={{ justifyContent: "center", pb: 3 }}>
          <ARButton wallArtData={wallArtData} isSupported={isARSupported} />
        </CardActions>
      </Card>
    </Box>
  )
}

export default ImageDisplay
