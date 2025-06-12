import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"

// Import WebXR polyfill for better browser support
import "webxr-polyfill"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
