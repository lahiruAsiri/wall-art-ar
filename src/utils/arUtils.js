// AR utility functions for WebXR and device detection
import * as THREE from "three"

export const checkWebXRSupport = async () => {
  if (!("xr" in navigator)) {
    return { supported: false, reason: "WebXR not available" }
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-ar")
    return { supported, reason: supported ? "WebXR AR supported" : "WebXR AR not supported" }
  } catch (error) {
    return { supported: false, reason: `WebXR check failed: ${error.message}` }
  }
}

export const checkDeviceCapabilities = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)
  const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasCamera,
    supportsWebXR: "xr" in navigator,
  }
}

export const initializeWebXRSession = async (requiredFeatures = ["hit-test"], optionalFeatures = ["dom-overlay"]) => {
  if (!("xr" in navigator)) {
    throw new Error("WebXR not supported")
  }

  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures,
      optionalFeatures,
    })

    return session
  } catch (error) {
    throw new Error(`Failed to start AR session: ${error.message}`)
  }
}

export const setupHitTesting = async (session) => {
  try {
    const referenceSpace = await session.requestReferenceSpace("viewer")
    const hitTestSource = await session.requestHitTestSource({ space: referenceSpace })
    return { referenceSpace, hitTestSource }
  } catch (error) {
    throw new Error(`Hit testing setup failed: ${error.message}`)
  }
}

export const createReticle = () => {
  // Create a reticle for AR placement indication
  const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  })
  const reticle = new THREE.Mesh(geometry, material)
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  return reticle
}

export const handleHitTest = (frame, hitTestSource, referenceSpace, reticle) => {
  if (!frame || !hitTestSource || !referenceSpace || !reticle) return false

  const hitTestResults = frame.getHitTestResults(hitTestSource)

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0]
    const pose = hit.getPose(referenceSpace)

    if (pose) {
      reticle.visible = true
      reticle.matrix.fromArray(pose.transform.matrix)
      return true
    }
  }

  reticle.visible = false
  return false
}
