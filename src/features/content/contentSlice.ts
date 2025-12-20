import type { PayloadAction } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"
import { type TextElement, tokenize } from "../../lib/word-tokenizer"
import { toggleEdit, SUPPORTED_LOCALES } from "../navbar/navbarSlice"

export interface ContentSliceState {
  rawText: string
  textElements: TextElement[]
  finalTranscriptIndex: number
  interimTranscriptIndex: number
}

// Translations for the initial text in all supported languages
const initialTextTranslations = {
  "en-US": 'Click on the "Edit" button and paste your content here...',
  "fr-FR": 'Cliquez sur le bouton "Modifier" et collez votre contenu ici...',
  "de-DE": 'Klicken Sie auf die Schaltfläche "Bearbeiten" und fügen Sie Ihren Inhalt hier ein...',
  "it-IT": 'Fai clic sul pulsante "Modifica" e incolla il tuo contenuto qui...',
  "pt-BR": 'Clique no botão "Editar" e cole seu conteúdo aqui...',
  "es-ES": 'Haz clic en el botón "Editar" y pega tu contenido aquí...',
  "sv-SE": 'Klicka på knappen "Redigera" och klistra in ditt innehåll här...'
}

// Function to get the appropriate initial text based on the language
const getInitialText = (language: string): string => {
  return initialTextTranslations[language as keyof typeof initialTextTranslations] || initialTextTranslations["en-US"]
}

// Detect browser language and default to pt-BR if Portuguese, otherwise en-US
const detectLanguage = (): string => {
  const savedLanguage = localStorage.getItem("teleprompter-language")
  if (savedLanguage) {
    return savedLanguage
  }

  if (Object.prototype.hasOwnProperty.call(SUPPORTED_LOCALES, navigator.language)) {
    return navigator.language
  }

  return "en-US"
}

const initialText = getInitialText(detectLanguage())

const initialState: ContentSliceState = {
  rawText: initialText,
  textElements: tokenize(initialText),
  finalTranscriptIndex: -1,
  interimTranscriptIndex: -1,
}

export const contentSlice = createAppSlice({
  name: "content",

  // `createSlice` will infer the state type from the `initialState` argument
  initialState,

  // The `reducers` field lets us define reducers and generate associated actions
  reducers: create => ({
    setContent: create.reducer((state, action: PayloadAction<string>) => {
      state.rawText = action.payload
      state.finalTranscriptIndex = -1
      state.interimTranscriptIndex = -1
    }),

    setFinalTranscriptIndex: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.finalTranscriptIndex = action.payload
      },
    ),

    setInterimTranscriptIndex: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.interimTranscriptIndex = action.payload
      },
    ),

    resetTranscriptionIndices: create.reducer(state => {
      state.finalTranscriptIndex = -1
      state.interimTranscriptIndex = -1
    }),

    updateInitialTextForLanguage: create.reducer((state, action: PayloadAction<string>) => {
      // Only update if the current text is still the initial text
      const currentLanguage = action.payload
      const newInitialText = getInitialText(currentLanguage)
      
      // Check if the current text is any of the initial text translations
      const isCurrentTextInitial = Object.values(initialTextTranslations).includes(
        state.rawText as any
      )
      
      if (isCurrentTextInitial) {
        state.rawText = newInitialText
        state.textElements = tokenize(newInitialText)
        state.finalTranscriptIndex = -1
        state.interimTranscriptIndex = -1
      }
    }),
  }),

  extraReducers: builder =>
    builder.addCase(toggleEdit, state => {
      state.textElements = tokenize(state.rawText)
    }),

  selectors: {
    selectRawText: state => state.rawText,
    selectTextElements: state => state.textElements,
    selectFinalTranscriptIndex: state => state.finalTranscriptIndex,
    selectInterimTranscriptIndex: state => state.interimTranscriptIndex,
  },
})

export const {
  setContent,
  setFinalTranscriptIndex,
  setInterimTranscriptIndex,
  resetTranscriptionIndices,
  updateInitialTextForLanguage,
} = contentSlice.actions

export const {
  selectRawText,
  selectTextElements,
  selectFinalTranscriptIndex,
  selectInterimTranscriptIndex,
} = contentSlice.selectors
