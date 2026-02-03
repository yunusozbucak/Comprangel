import React from 'react';
import { useImageContext, presets } from '../context/ImageContext';

const ALL_OUTPUT_FORMATS = [
    { value: 'webp', label: 'WebP' },
    { value: 'avif', label: 'AVIF' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' }
];

const PRESETS = [
    { value: 'web', label: 'WEB', icon: '🌐' },
    { value: 'high', label: 'HQ', icon: '✨' },
    { value: 'smallest', label: 'MIN', icon: '📦' },
    { value: 'custom', label: 'CUSTOM', icon: '⚙️' }
];

export function CompressionSettings() {
    const { state, actions } = useImageContext();
    const { settings, inputFormats } = state;

    // Filter output formats to exclude input formats
    const getAvailableOutputFormats = () => {
        if (inputFormats.length === 0) {
            return ALL_OUTPUT_FORMATS;
        }
        
        return ALL_OUTPUT_FORMATS.filter(format => {
            // Normalize format comparison (handle both 'jpeg' and 'jpg')
            const normalizedFormat = format.value.toLowerCase();
            const normalizedInputFormats = inputFormats.map(f => 
                f.toLowerCase() === 'jpg' ? 'jpeg' : f.toLowerCase()
            );
            
            return !normalizedInputFormats.includes(normalizedFormat);
        });
    };

    const OUTPUT_FORMATS = getAvailableOutputFormats();

    // Check if current output format is still available, if not, switch to first available
    React.useEffect(() => {
        if (OUTPUT_FORMATS.length > 0 && !OUTPUT_FORMATS.some(f => f.value === settings.outputFormat)) {
            actions.setOutputFormat(OUTPUT_FORMATS[0].value);
        }
    }, [OUTPUT_FORMATS, settings.outputFormat, actions]);

    return (
        <div className="bg-surface block-border p-5 space-y-5">
            {/* Output Format */}
            <div>
                <label className="pixel-text text-sm text-text-secondary tracking-wider mb-3 block">
                    OUTPUT FORMAT
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {OUTPUT_FORMATS.map(format => (
                        <button
                            key={format.value}
                            onClick={() => actions.setOutputFormat(format.value)}
                            className={`
                p-3 text-center transition-all pixel-text text-lg tracking-wide
                ${settings.outputFormat === format.value
                                    ? 'bg-primary text-text block-btn'
                                    : 'bg-surface-light block-border-sm text-text-muted hover:text-text'
                                }
              `}
                        >
                            {format.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Presets */}
            <div>
                <label className="pixel-text text-sm text-text-secondary tracking-wider mb-3 block">
                    PRESET
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => actions.setPreset(preset.value)}
                            className={`
                py-2 px-2 text-center transition-all
                ${settings.preset === preset.value
                                    ? 'bg-secondary text-text block-btn'
                                    : 'bg-surface-light block-border-sm text-text-muted hover:text-text'
                                }
              `}
                        >
                            <span className="block text-lg mb-1">{preset.icon}</span>
                            <span className="text-xs">{preset.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quality */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="pixel-text text-sm text-text-secondary tracking-wider">
                        QUALITY
                    </label>
                    <span className="pixel-text text-2xl text-primary">{settings.quality}%</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.quality}
                    onChange={(e) => actions.setQuality(parseInt(e.target.value))}
                    disabled={settings.lossless}
                    className={`w-full ${settings.lossless ? 'opacity-40' : ''}`}
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>SMALLER</span>
                    <span>BETTER</span>
                </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
                {(settings.outputFormat === 'webp' || settings.outputFormat === 'png') && (
                    <button
                        onClick={() => actions.setSettings({ lossless: !settings.lossless })}
                        className={`
              p-3 text-left transition-all
              ${settings.lossless ? 'bg-primary text-text' : 'bg-surface-light text-text-muted'}
              block-border-sm
            `}
                    >
                        <span className="block text-xs text-text-secondary mb-1">MODE</span>
                        <span className="pixel-text text-lg">{settings.lossless ? 'LOSSLESS' : 'LOSSY'}</span>
                    </button>
                )}

                <button
                    onClick={() => actions.setSettings({ preserveMetadata: !settings.preserveMetadata })}
                    className={`
            p-3 text-left transition-all
            ${settings.preserveMetadata ? 'bg-secondary text-text' : 'bg-surface-light text-text-muted'}
            block-border-sm
          `}
                >
                    <span className="block text-xs text-text-secondary mb-1">EXIF</span>
                    <span className="pixel-text text-lg">{settings.preserveMetadata ? 'KEEP' : 'STRIP'}</span>
                </button>
            </div>

            {/* Filename */}
            <div>
                <label className="pixel-text text-sm text-text-secondary tracking-wider mb-2 block">
                    OUTPUT NAME
                </label>
                <input
                    type="text"
                    value={settings.filenamePattern}
                    onChange={(e) => actions.setSettings({ filenamePattern: e.target.value })}
                    placeholder="{name}"
                    className="w-full px-4 py-3 bg-surface-light block-inset text-text text-sm focus:outline-none"
                />
                <p className="text-xs text-text-muted mt-1">
                    Variables: {'{name}'} {'{date}'} {'{format}'}
                </p>
            </div>
        </div>
    );
}
