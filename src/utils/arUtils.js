// AR utility functions

export const checkARSupport = async () => {
    // Check for WebXR support
    if ("xr" in navigator) {
      try {
        const isSupported = await navigator.xr.isSessionSupported("immersive-ar")
        return { supported: isSupported, method: "webxr" }
      } catch (error) {
        console.log("WebXR not supported:", error)
      }
    }
  
    // Check for iOS AR Quick Look
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      return { supported: true, method: "quicklook" }
    }
  
    // Check for Android
    const isAndroid = /Android/i.test(navigator.userAgent)
    if (isAndroid) {
      return { supported: true, method: "webxr-fallback" }
    }
  
    return { supported: false, method: null }
  }
  
  export const generateUSDZ = (wallArtData) => {
    // In a real implementation, you would generate a USDZ file
    // For now, return a placeholder
    return `data:model/vnd.usdz+zip;base64,${btoa("USDZ placeholder")}`
  }
  
  export const initializeWebXR = async () => {
    if (!("xr" in navigator)) {
      throw new Error("WebXR not supported")
    }
  
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
      })
      return session
    } catch (error) {
      throw new Error("Failed to initialize AR session: " + error.message)
    }
  }
  
  export const detectMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }
  
  export const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      console.error("Camera permission denied:", error)
      return false
    }
  }
  