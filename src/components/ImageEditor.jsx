import { useState, useRef, useEffect, useCallback } from 'react';

export function ImageEditor({ file, onSave, onClose }) {
    const [settings, setSettings] = useState({
        resize: {
            enabled: false,
            mode: 'percentage',
            percentage: 100,
            width: file.width,
            height: file.height,
            lockAspect: true
        },
        rotate: 0,
        flip: { horizontal: false, vertical: false },
        filters: {
            grayscale: false,
            brightness: 0,
            contrast: 0
        },
        crop: {
            enabled: false,
            x: 0,
            y: 0,
            width: file.width,
            height: file.height
        }
    });

    const canvasRef = useRef(null);
    const originalAspect = file.width / file.height;

    // Update preview
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            // Apply resize
            if (settings.resize.enabled) {
                if (settings.resize.mode === 'percentage') {
                    width = Math.round(width * (settings.resize.percentage / 100));
                    height = Math.round(height * (settings.resize.percentage / 100));
                } else {
                    width = settings.resize.width || width;
                    height = settings.resize.height || height;
                }
            }

            // Handle rotation dimensions
            if (settings.rotate === 90 || settings.rotate === 270) {
                canvas.width = height;
                canvas.height = width;
            } else {
                canvas.width = width;
                canvas.height = height;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);

            if (settings.rotate) {
                ctx.rotate((settings.rotate * Math.PI) / 180);
            }

            ctx.scale(
                settings.flip.horizontal ? -1 : 1,
                settings.flip.vertical ? -1 : 1
            );

            ctx.translate(-width / 2, -height / 2);
            ctx.drawImage(img, 0, 0, width, height);
            ctx.restore();

            // Apply filters
            if (settings.filters.grayscale || settings.filters.brightness !== 0 || settings.filters.contrast !== 0) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i + 1];
                    let b = data[i + 2];

                    if (settings.filters.grayscale) {
                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        r = g = b = gray;
                    }

                    if (settings.filters.brightness !== 0) {
                        const brightness = (settings.filters.brightness / 100) * 255;
                        r += brightness;
                        g += brightness;
                        b += brightness;
                    }

                    if (settings.filters.contrast !== 0) {
                        const contrast = (settings.filters.contrast + 100) / 100;
                        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                        r = factor * (r - 128) + 128;
                        g = factor * (g - 128) + 128;
                        b = factor * (b - 128) + 128;
                    }

                    data[i] = Math.max(0, Math.min(255, r));
                    data[i + 1] = Math.max(0, Math.min(255, g));
                    data[i + 2] = Math.max(0, Math.min(255, b));
                }

                ctx.putImageData(imageData, 0, 0);
            }
        };
        img.src = file.previewUrl;
    }, [file.previewUrl, settings]);

    const handleWidthChange = (value) => {
        const width = parseInt(value) || 0;
        const height = settings.resize.lockAspect
            ? Math.round(width / originalAspect)
            : settings.resize.height;
        setSettings(s => ({
            ...s,
            resize: { ...s.resize, width, height }
        }));
    };

    const handleHeightChange = (value) => {
        const height = parseInt(value) || 0;
        const width = settings.resize.lockAspect
            ? Math.round(height * originalAspect)
            : settings.resize.width;
        setSettings(s => ({
            ...s,
            resize: { ...s.resize, width, height }
        }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-light">
                <h2 className="text-text text-xl font-bold">Edit Image</h2>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-surface-light text-text-muted hover:text-text"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-text font-medium"
                    >
                        Apply
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Preview */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ background: 'repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px' }}
                    />
                </div>

                {/* Controls */}
                <div className="w-80 bg-surface border-l border-surface-light overflow-y-auto p-4 space-y-6">
                    {/* Resize */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={settings.resize.enabled}
                                onChange={(e) => setSettings(s => ({
                                    ...s,
                                    resize: { ...s.resize, enabled: e.target.checked }
                                }))}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-text font-medium">Resize</span>
                        </label>

                        {settings.resize.enabled && (
                            <div className="space-y-3 pl-7">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSettings(s => ({
                                            ...s,
                                            resize: { ...s.resize, mode: 'percentage' }
                                        }))}
                                        className={`px-3 py-1.5 rounded text-sm ${settings.resize.mode === 'percentage'
                                                ? 'bg-primary text-text'
                                                : 'bg-surface-light text-text-muted'
                                            }`}
                                    >
                                        Percentage
                                    </button>
                                    <button
                                        onClick={() => setSettings(s => ({
                                            ...s,
                                            resize: { ...s.resize, mode: 'dimensions' }
                                        }))}
                                        className={`px-3 py-1.5 rounded text-sm ${settings.resize.mode === 'dimensions'
                                                ? 'bg-primary text-text'
                                                : 'bg-surface-light text-text-muted'
                                            }`}
                                    >
                                        Dimensions
                                    </button>
                                </div>

                                {settings.resize.mode === 'percentage' ? (
                                    <div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="200"
                                            value={settings.resize.percentage}
                                            onChange={(e) => setSettings(s => ({
                                                ...s,
                                                resize: { ...s.resize, percentage: parseInt(e.target.value) }
                                            }))}
                                            className="w-full accent-primary"
                                        />
                                        <div className="text-center text-text-muted text-sm mt-1">
                                            {settings.resize.percentage}%
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={settings.resize.width || ''}
                                                onChange={(e) => handleWidthChange(e.target.value)}
                                                placeholder="Width"
                                                className="flex-1 px-3 py-2 rounded bg-surface-light text-text text-sm"
                                            />
                                            <span className="text-text-muted">×</span>
                                            <input
                                                type="number"
                                                value={settings.resize.height || ''}
                                                onChange={(e) => handleHeightChange(e.target.value)}
                                                placeholder="Height"
                                                className="flex-1 px-3 py-2 rounded bg-surface-light text-text text-sm"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-text-muted">
                                            <input
                                                type="checkbox"
                                                checked={settings.resize.lockAspect}
                                                onChange={(e) => setSettings(s => ({
                                                    ...s,
                                                    resize: { ...s.resize, lockAspect: e.target.checked }
                                                }))}
                                                className="accent-primary"
                                            />
                                            Lock aspect ratio
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rotate */}
                    <div>
                        <span className="text-text font-medium block mb-3">Rotate</span>
                        <div className="flex gap-2">
                            {[0, 90, 180, 270].map(deg => (
                                <button
                                    key={deg}
                                    onClick={() => setSettings(s => ({ ...s, rotate: deg }))}
                                    className={`flex-1 py-2 rounded text-sm ${settings.rotate === deg
                                            ? 'bg-primary text-text'
                                            : 'bg-surface-light text-text-muted hover:text-text'
                                        }`}
                                >
                                    {deg}°
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Flip */}
                    <div>
                        <span className="text-text font-medium block mb-3">Flip</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSettings(s => ({
                                    ...s,
                                    flip: { ...s.flip, horizontal: !s.flip.horizontal }
                                }))}
                                className={`flex-1 py-2 rounded text-sm ${settings.flip.horizontal
                                        ? 'bg-primary text-text'
                                        : 'bg-surface-light text-text-muted hover:text-text'
                                    }`}
                            >
                                ↔ Horizontal
                            </button>
                            <button
                                onClick={() => setSettings(s => ({
                                    ...s,
                                    flip: { ...s.flip, vertical: !s.flip.vertical }
                                }))}
                                className={`flex-1 py-2 rounded text-sm ${settings.flip.vertical
                                        ? 'bg-primary text-text'
                                        : 'bg-surface-light text-text-muted hover:text-text'
                                    }`}
                            >
                                ↕ Vertical
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <span className="text-text font-medium block mb-3">Filters</span>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.filters.grayscale}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        filters: { ...s.filters, grayscale: e.target.checked }
                                    }))}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-text-muted text-sm">Grayscale</span>
                            </label>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-text-muted">Brightness</span>
                                    <span className="text-text">{settings.filters.brightness}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={settings.filters.brightness}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        filters: { ...s.filters, brightness: parseInt(e.target.value) }
                                    }))}
                                    className="w-full accent-primary"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-text-muted">Contrast</span>
                                    <span className="text-text">{settings.filters.contrast}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={settings.filters.contrast}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        filters: { ...s.filters, contrast: parseInt(e.target.value) }
                                    }))}
                                    className="w-full accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => setSettings({
                            resize: { enabled: false, mode: 'percentage', percentage: 100, width: file.width, height: file.height, lockAspect: true },
                            rotate: 0,
                            flip: { horizontal: false, vertical: false },
                            filters: { grayscale: false, brightness: 0, contrast: 0 },
                            crop: { enabled: false, x: 0, y: 0, width: file.width, height: file.height }
                        })}
                        className="w-full py-2 rounded-lg bg-surface-light text-text-muted hover:text-text text-sm"
                    >
                        Reset All
                    </button>
                </div>
            </div>
        </div>
    );
}
