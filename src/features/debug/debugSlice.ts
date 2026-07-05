import type { PayloadAction } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"

export interface DebugSliceState {
  isEnabled: boolean
  debugTranscript: string
}

const initialState: DebugSliceState = {
  isEnabled: false,
  debugTranscript: "",
}

export const debugSlice = createAppSlice({
  name: "debug",

  initialState,

  reducers: create => ({
    toggleDebug: create.reducer(state => {
      state.isEnabled = !state.isEnabled
    }),

    setDebugTranscript: create.reducer((state, action: PayloadAction<string>) => {
      state.debugTranscript = action.payload
    }),
  }),

  selectors: {
    selectIsDebugEnabled: state => state.isEnabled,
    selectDebugTranscript: state => state.debugTranscript,
  },
})

export const { toggleDebug, setDebugTranscript } = debugSlice.actions

export const { selectIsDebugEnabled, selectDebugTranscript } = debugSlice.selectors
