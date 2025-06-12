"use client"
import { Card, CardMedia, CardContent, CardActions, Typography, Box, Chip } from "@mui/material"
import ARButton from "./ARButton"

const ImageDisplay = () => {
  // Wall art data
  const wallArtData = {
    id: 1,
    title: "Abstract Mountain Landscape",
    price: "$89.99",
    imageUrl: "https://cdn.leonardo.ai/users/56148a3e-5d5e-4c3d-8a5d-9389c7a5de4a/generations/6eecfc46-f587-444d-ab71-981e2346d6fa/Leonardo_Lightning_XL_Mystic_Moon_Phases_0.jpg",
    frameColor: "black",
    size: "24x18 inches",
  }

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
        </CardContent>
        <CardActions sx={{ justifyContent: "center", pb: 3 }}>
          <ARButton wallArtData={wallArtData} />
        </CardActions>
      </Card>
    </Box>
  )
}

export default ImageDisplay



