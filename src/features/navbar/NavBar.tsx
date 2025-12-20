import { useState, useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"

import { startTeleprompter, stopTeleprompter, changeLanguage } from "../../app/thunks"
import SpeechRecognizer from "../../lib/speech-recognizer"

import {
  toggleEdit,
  // flipHorizontally,
  // flipVertically,
  setFontSize,
  setMargin,
  setOpacity,
  setScrollOffset,
  setLanguage,
  selectStatus,
  // selectHorizontallyFlipped,
  // selectVerticallyFlipped,
  selectFontSize,
  selectMargin,
  selectOpacity,
  selectScrollOffset,
  selectLanguage,
  SUPPORTED_LOCALES,
} from "./navbarSlice"

import { resetTranscriptionIndices, updateInitialTextForLanguage, setContent } from "../content/contentSlice"

export const NavBar = () => {
  const dispatch = useAppDispatch()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const status = useAppSelector(selectStatus)
  const fontSize = useAppSelector(selectFontSize)
  const margin = useAppSelector(selectMargin)
  const opacity = useAppSelector(selectOpacity)
  const scrollOffset = useAppSelector(selectScrollOffset)
  // const horizontallyFlipped = useAppSelector(selectHorizontallyFlipped)
  // const verticallyFlipped = useAppSelector(selectVerticallyFlipped)
  const language = useAppSelector(selectLanguage)

  useEffect(() => {
    // Check if speech recognition is supported
    const recognizer = new SpeechRecognizer()
    setIsSpeechSupported(Boolean(recognizer.getIsSupported()))
  }, [])

  const toggleMobileMenu = () => {
    // Stop the teleprompter if it's currently playing
    if (status === "started") {
      dispatch(stopTeleprompter())
    }
    // Always toggle the menu state
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const isMarkdown = file.name.toLowerCase().endsWith('.md')
      dispatch(setContent({ content, isMarkdown }))
      dispatch(resetTranscriptionIndices())
    }
    reader.onerror = () => {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error reading file")
      }
    }
    reader.readAsText(file, "UTF-8")

    // Reset the input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <nav
      className="navbar is-black has-text-light is-unselectable"
      role="navigation"
      aria-label="main navigation"
    >
      <div className="navbar-brand">
        <div className="navbar-item">
          <div className="title has-text-grey">
            <div className="is-hidden-mobile">Voice-Activated Teleprompter</div>
            <div className="is-hidden-desktop is-hidden-tablet">Teleprompter</div>
            <ul className="is-size-7 is-hidden-mobile">
              <li className="first has-text-white">
                <a href="https://github.com/jlecomte/voice-activated-teleprompter">Based on original code by Julien Lecomte</a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Play button */}
        <div className="navbar-item">
          <button
            className="button is-primary is-small"
            disabled={status === "editing"}
            onClick={() =>
              dispatch(
                status === "stopped" ? startTeleprompter() : stopTeleprompter(),
              )
            }
            title={
              !isSpeechSupported
                ? "Speech recognition not supported in this browser"
                : (status === "stopped" || status === "editing"
                    ? "Start teleprompter (keyboard shortcut: P)"
                    : "Stop teleprompter (keyboard shortcut: P)")
            }
            aria-label={
              !isSpeechSupported
                ? "Speech recognition not supported"
                : (status === "stopped" || status === "editing"
                    ? "Start teleprompter, press P key to start"
                    : "Stop teleprompter, press P key to stop")
            }
          >
            <span className="icon is-small">
              {!isSpeechSupported ? "⚠" : (status === "stopped" || status === "editing" ? "▶" : "■")}
            </span>
          </button>
        </div>
        
        {/* Mobile menu toggle */}
        <button
          type="button"
          className={`navbar-burger burger ${isMobileMenuOpen ? "is-active" : ""}`}
          aria-label="menu"
          aria-expanded={isMobileMenuOpen}
          onClick={toggleMobileMenu}
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
      </div>
      
      <div className={`navbar-menu ${isMobileMenuOpen ? "is-active" : ""}`}>
        <div className="navbar-end">
          {status === "stopped" ? (
            <>
              <div className="navbar-item">
                <div className="field">
                  <div className="control">
                    <div className="select is-small">
                      <select
                        value={language}
                        onChange={e => {
                          const newLanguage = e.currentTarget.value
                          dispatch(setLanguage(newLanguage))
                          dispatch(changeLanguage(newLanguage))
                          dispatch(updateInitialTextForLanguage(newLanguage))
                        }}
                        title="Select Language"
                      >
                        {Object.keys(SUPPORTED_LOCALES).map(locale => {
                          const label =
                            SUPPORTED_LOCALES[
                              locale as keyof typeof SUPPORTED_LOCALES
                            ]
                          return (
                            <option key={locale} value={locale}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="navbar-item slider">
                <label htmlFor="font-size-slider" className="slider-label">Font size:</label>
                <input
                  id="font-size-slider"
                  type="range"
                  step="5"
                  min="10"
                  max="200"
                  value={fontSize}
                  onChange={e =>
                    dispatch(setFontSize(parseInt(e.currentTarget.value, 10)))
                  }
                  title="Font size"
                />
              </div>
              <div className="navbar-item slider">
                <label htmlFor="margin-slider" className="slider-label">Margin:</label>
                <input
                  id="margin-slider"
                  type="range"
                  step="10"
                  min="0"
                  max="500"
                  value={margin}
                  onChange={e =>
                    dispatch(setMargin(parseInt(e.currentTarget.value, 10)))
                  }
                  title="Margin"
                />
              </div>
              <div className="navbar-item slider">
                <label htmlFor="brightness-slider" className="slider-label">Brightness:</label>
                <input
                  id="brightness-slider"
                  type="range"
                  step="10"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={e =>
                    dispatch(setOpacity(parseInt(e.currentTarget.value, 10)))
                  }
                  title="Brightness"
                />
              </div>
              <div className="navbar-item slider">
                <label htmlFor="line-position-slider" className="slider-label">Line position:</label>
                <input
                  id="line-position-slider"
                  type="range"
                  step="10"
                  min="10"
                  max="200"
                  value={scrollOffset}
                  onChange={e =>
                    dispatch(setScrollOffset(parseInt(e.currentTarget.value, 10)))
                  }
                  title="Line position"
                />
              </div>
            </>
          ) : null}

          <div className="buttons navbar-item">
            {status !== "started" ? (
              <>
                <button
                  className={`button ${status === "editing" ? "editing" : ""}`}
                  onClick={() => dispatch(toggleEdit())}
                  title="Edit"
                  aria-label="Edit text"
                >
                  <span className="icon is-small">
                    ✏
                  </span>
                  <span className="is-sr-only">Edit</span>
                </button>
                <button
                  className="button"
                  disabled={status !== "stopped"}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload text file"
                  aria-label="Upload text file"
                >
                  <span className="icon is-small">
                    ⬆
                  </span>
                  <span className="is-sr-only">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain,.md,text/markdown"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                {/* Flip buttons commented out as they are not needed */}
                {/* <button
                  className={`button ${horizontallyFlipped ? "horizontally-flipped" : ""}`}
                  disabled={status !== "stopped"}
                  onClick={() => dispatch(flipHorizontally())}
                  title="Flip Text Horizontally"
                  aria-label="Flip text horizontally"
                >
                  <span className="icon is-small">
                    ↔
                  </span>
                  <span className="is-sr-only">Flip Horizontal</span>
                </button>
                <button
                  className={`button ${verticallyFlipped ? "vertically-flipped" : ""}`}
                  disabled={status !== "stopped"}
                  onClick={() => dispatch(flipVertically())}
                  title="Flip Text Vertically"
                  aria-label="Flip text vertically"
                >
                  <span className="icon is-small">
                    ↕
                  </span>
                  <span className="is-sr-only">Flip Vertical</span>
                </button> */}
                <button
                  className="button"
                  disabled={status !== "stopped"}
                  onClick={() => dispatch(resetTranscriptionIndices())}
                  title="Restart from the beginning"
                  aria-label="Restart from beginning"
                >
                  <span className="icon is-small">
                    ↻
                  </span>
                  <span className="is-sr-only">Restart</span>
                </button>
              </>
            ) : null}

          </div>
        </div>
      </div>
    </nav>
  )
}
