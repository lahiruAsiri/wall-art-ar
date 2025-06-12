import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import Container from "@mui/material/Container"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import ImageDisplay from "./components/ImageDisplay"

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            AR Wall Art Demo
          </Typography>
          <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary">
            Experience how your wall art looks on your wall with AR
          </Typography>
          <ImageDisplay />
        </Box>
      </Container>
    </ThemeProvider>
  )
}

export default App
