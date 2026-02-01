import { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
    files: [],
    settings: {
        outputFormat: 'webp',
        quality: 80,
        lossless: false,
        preserveMetadata: false,
        preset: 'custom', // 'web', 'high', 'smallest', 'custom'
        resize: {
            enabled: false,
            mode: 'percentage', // 'percentage' or 'dimensions'
            percentage: 100,
            width: null,
            height: null,
            lockAspect: true
        },
        rotate: 0, // 0, 90, 180, 270
        flip: {
            horizontal: false,
            vertical: false
        },
        filters: {
            grayscale: false,
            brightness: 0,
            contrast: 0
        },
        crop: {
            enabled: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },
        filenamePattern: '{name}'
    },
    theme: 'dark',
    history: [],
    processing: {
        isProcessing: false,
        isPaused: false,
        progress: 0,
        currentFile: null
    }
};

// Action types
const ActionTypes = {
    ADD_FILES: 'ADD_FILES',
    UPDATE_FILE: 'UPDATE_FILE',
    REMOVE_FILE: 'REMOVE_FILE',
    CLEAR_FILES: 'CLEAR_FILES',
    REORDER_FILES: 'REORDER_FILES',
    SET_SETTINGS: 'SET_SETTINGS',
    SET_QUALITY: 'SET_QUALITY',
    SET_OUTPUT_FORMAT: 'SET_OUTPUT_FORMAT',
    SET_PRESET: 'SET_PRESET',
    SET_THEME: 'SET_THEME',
    ADD_TO_HISTORY: 'ADD_TO_HISTORY',
    CLEAR_HISTORY: 'CLEAR_HISTORY',
    SET_PROCESSING: 'SET_PROCESSING',
    UPDATE_PROGRESS: 'UPDATE_PROGRESS'
};

// Presets configuration
const presets = {
    web: { quality: 75, lossless: false },
    high: { quality: 95, lossless: false },
    smallest: { quality: 50, lossless: false },
    lossless: { quality: 100, lossless: true }
};

// Reducer
function imageReducer(state, action) {
    switch (action.type) {
        case ActionTypes.ADD_FILES:
            return {
                ...state,
                files: [...state.files, ...action.payload]
            };

        case ActionTypes.UPDATE_FILE:
            return {
                ...state,
                files: state.files.map(file =>
                    file.id === action.payload.id
                        ? { ...file, ...action.payload.updates }
                        : file
                )
            };

        case ActionTypes.REMOVE_FILE:
            return {
                ...state,
                files: state.files.filter(file => file.id !== action.payload)
            };

        case ActionTypes.CLEAR_FILES:
            return {
                ...state,
                files: []
            };

        case ActionTypes.REORDER_FILES:
            const { sourceIndex, destinationIndex } = action.payload;
            const newFiles = [...state.files];
            const [removed] = newFiles.splice(sourceIndex, 1);
            newFiles.splice(destinationIndex, 0, removed);
            return {
                ...state,
                files: newFiles
            };

        case ActionTypes.SET_SETTINGS:
            return {
                ...state,
                settings: { ...state.settings, ...action.payload }
            };

        case ActionTypes.SET_QUALITY:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    quality: action.payload,
                    preset: 'custom'
                }
            };

        case ActionTypes.SET_OUTPUT_FORMAT:
            return {
                ...state,
                settings: { ...state.settings, outputFormat: action.payload }
            };

        case ActionTypes.SET_PRESET:
            const presetConfig = presets[action.payload];
            return {
                ...state,
                settings: {
                    ...state.settings,
                    preset: action.payload,
                    ...(presetConfig || {})
                }
            };

        case ActionTypes.SET_THEME:
            return {
                ...state,
                theme: action.payload
            };

        case ActionTypes.ADD_TO_HISTORY:
            return {
                ...state,
                history: [action.payload, ...state.history].slice(0, 50) // Keep last 50
            };

        case ActionTypes.CLEAR_HISTORY:
            return {
                ...state,
                history: []
            };

        case ActionTypes.SET_PROCESSING:
            return {
                ...state,
                processing: { ...state.processing, ...action.payload }
            };

        case ActionTypes.UPDATE_PROGRESS:
            return {
                ...state,
                processing: { ...state.processing, progress: action.payload }
            };

        default:
            return state;
    }
}

// Context
const ImageContext = createContext(null);

// Provider component
export function ImageProvider({ children }) {
    const [state, dispatch] = useReducer(imageReducer, initialState);

    // Action creators
    const addFiles = useCallback((files) => {
        dispatch({ type: ActionTypes.ADD_FILES, payload: files });
    }, []);

    const updateFile = useCallback((id, updates) => {
        dispatch({ type: ActionTypes.UPDATE_FILE, payload: { id, updates } });
    }, []);

    const removeFile = useCallback((id) => {
        dispatch({ type: ActionTypes.REMOVE_FILE, payload: id });
    }, []);

    const clearFiles = useCallback(() => {
        dispatch({ type: ActionTypes.CLEAR_FILES });
    }, []);

    const reorderFiles = useCallback((sourceIndex, destinationIndex) => {
        dispatch({ type: ActionTypes.REORDER_FILES, payload: { sourceIndex, destinationIndex } });
    }, []);

    const setSettings = useCallback((settings) => {
        dispatch({ type: ActionTypes.SET_SETTINGS, payload: settings });
    }, []);

    const setQuality = useCallback((quality) => {
        dispatch({ type: ActionTypes.SET_QUALITY, payload: quality });
    }, []);

    const setOutputFormat = useCallback((format) => {
        dispatch({ type: ActionTypes.SET_OUTPUT_FORMAT, payload: format });
    }, []);

    const setPreset = useCallback((preset) => {
        dispatch({ type: ActionTypes.SET_PRESET, payload: preset });
    }, []);

    const setTheme = useCallback((theme) => {
        dispatch({ type: ActionTypes.SET_THEME, payload: theme });
    }, []);

    const addToHistory = useCallback((entry) => {
        dispatch({ type: ActionTypes.ADD_TO_HISTORY, payload: entry });
    }, []);

    const clearHistory = useCallback(() => {
        dispatch({ type: ActionTypes.CLEAR_HISTORY });
    }, []);

    const setProcessing = useCallback((processing) => {
        dispatch({ type: ActionTypes.SET_PROCESSING, payload: processing });
    }, []);

    const updateProgress = useCallback((progress) => {
        dispatch({ type: ActionTypes.UPDATE_PROGRESS, payload: progress });
    }, []);

    const value = {
        state,
        dispatch,
        actions: {
            addFiles,
            updateFile,
            removeFile,
            clearFiles,
            reorderFiles,
            setSettings,
            setQuality,
            setOutputFormat,
            setPreset,
            setTheme,
            addToHistory,
            clearHistory,
            setProcessing,
            updateProgress
        }
    };

    return (
        <ImageContext.Provider value={value}>
            {children}
        </ImageContext.Provider>
    );
}

// Custom hook for using context
export function useImageContext() {
    const context = useContext(ImageContext);
    if (!context) {
        throw new Error('useImageContext must be used within ImageProvider');
    }
    return context;
}

export { ActionTypes, presets };
