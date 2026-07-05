import { useEffect } from "react"
import { NavBar } from "./features/navbar/NavBar"
import { Content } from "./features/content/Content"
import { ChordProConfirmBanner } from "./features/content/ChordProConfirmBanner"
import { DebugPanel } from "./features/debug/DebugPanel"
import { useAppDispatch, useAppSelector } from "./app/hooks"
import { startTeleprompter, stopTeleprompter } from "./app/thunks"
import { selectStatus } from "./features/navbar/navbarSlice"

const App = () => {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectStatus)

  useEffect(() => {
    // Prevent zoom on input focus for iOS
    const handleTouchStart = () => {
      document.documentElement.style.fontSize = "16px"
    }
    
    // Add keyboard event listener for play/pause shortcut
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is "P" or "p" (case insensitive)
      if (event.key.toLowerCase() === "p") {
        // Check if the event target is an input, textarea, or any element that allows text input
        const activeElement = document.activeElement
        const isInputFocused = activeElement && (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true"
        )
        
        // Only trigger the play/pause if not typing in an input field
        if (!isInputFocused) {
          // Prevent default behavior to avoid any conflicts
          event.preventDefault()
          
          // Dispatch the appropriate action based on current status
          if (status === "stopped") {
            dispatch(startTeleprompter())
          } else if (status === "started") {
            dispatch(stopTeleprompter())
          }
        }
      }
    }
    
    // Add touch event listener for iOS zoom prevention
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.addEventListener("touchstart", handleTouchStart, { passive: true })
    }
    
    // Add keyboard event listener
    document.addEventListener("keydown", handleKeyDown)
    
    return () => {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.removeEventListener("touchstart", handleTouchStart)
      }
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [dispatch, status])

  return (
    <div className="app">
      <NavBar />
      <ChordProConfirmBanner />
      <DebugPanel />
      <Content />
    </div>
  )
}

export default App
