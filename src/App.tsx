import { useEffect } from "react"
import { NavBar } from "./features/navbar/NavBar"
import { Content } from "./features/content/Content"

const App = () => {
  useEffect(() => {
    // Prevent zoom on input focus for iOS
    const handleTouchStart = () => {
      document.documentElement.style.fontSize = "16px"
    }
    
    // Add touch event listener for iOS zoom prevention
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.addEventListener("touchstart", handleTouchStart, { passive: true })
    }
    
    return () => {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.removeEventListener("touchstart", handleTouchStart)
      }
    }
  }, [])

  return (
    <div className="app">
      <NavBar />
      <Content />
    </div>
  )
}

export default App
