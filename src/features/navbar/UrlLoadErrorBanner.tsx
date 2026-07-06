import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { selectUrlLoadError, setUrlLoadError } from "./navbarSlice"

/**
 * Visible error banner shown when a URL load fails (either the "Load from URL"
 * button or the `?content=` query-param path). Renders null when there's no
 * error. Dismissible via the [Dismiss] button.
 *
 * Uses `role="alert"` (not `status`) so screen readers announce immediately.
 */
export const UrlLoadErrorBanner = () => {
  const dispatch = useAppDispatch()
  const error = useAppSelector(selectUrlLoadError)

  if (!error) return null

  return (
    <div className="url-load-error-banner" role="alert" aria-live="assertive">
      <span className="url-load-error-message">{error}</span>
      <button
        type="button"
        className="url-load-error-dismiss"
        onClick={() => dispatch(setUrlLoadError(null))}
        aria-label="Dismiss error"
      >
        Dismiss
      </button>
    </div>
  )
}
