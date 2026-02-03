import { useCallback, useRef, useEffect } from 'react';
import { useImageContext } from '../context/ImageContext';

export function useImageProcessor() {
    const { state, actions } = useImageContext();
    const processingRef = useRef(false);
    const settingsRef = useRef(state.settings);

    // Keep settings ref always up to date
    useEffect(() => {
        settingsRef.current = state.settings;
    }, [state.settings]);

    const processImage = useCallback(async (file, settings) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = async () => {
                try {
                    const {
                        outputFormat = 'webp',
                        quality = 80,
                        lossless = false,
                        resize,
                        rotate = 0,
                        flip,
                        filters
                    } = settings;

                    let width = img.width;
                    let height = img.height;

                    // Apply resize
                    if (resize?.enabled) {
                        if (resize.mode === 'percentage') {
                            width = Math.round(width * (resize.percentage / 100));
                            height = Math.round(height * (resize.percentage / 100));
                        } else {
                            const aspectRatio = img.width / img.height;
                            if (resize.lockAspect) {
                                if (resize.width) {
                                    width = resize.width;
                                    height = Math.round(resize.width / aspectRatio);
                                } else if (resize.height) {
                                    height = resize.height;
                                    width = Math.round(resize.height * aspectRatio);
                                }
                            } else {
                                width = resize.width || width;
                                height = resize.height || height;
                            }
                        }
                    }

                    // Swap dimensions for 90/270 rotation
                    const finalWidth = (rotate === 90 || rotate === 270) ? height : width;
                    const finalHeight = (rotate === 90 || rotate === 270) ? width : height;

                    const createCanvas = (w, h) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');

                        // Apply transforms
                        ctx.save();
                        ctx.translate(w / 2, h / 2);

                        if (rotate) {
                            ctx.rotate((rotate * Math.PI) / 180);
                        }

                        if (flip?.horizontal || flip?.vertical) {
                            ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
                        }

                        // Draw image centered
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                        ctx.restore();

                        // Apply filters
                        if (filters?.grayscale || filters?.brightness || filters?.contrast) {
                            const imageData = ctx.getImageData(0, 0, w, h);
                            const data = imageData.data;

                            for (let i = 0; i < data.length; i += 4) {
                                let r = data[i];
                                let g = data[i + 1];
                                let b = data[i + 2];

                                if (filters.grayscale) {
                                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                                    r = g = b = gray;
                                }

                                if (filters.brightness) {
                                    const brightness = (filters.brightness / 100) * 255;
                                    r += brightness;
                                    g += brightness;
                                    b += brightness;
                                }

                                if (filters.contrast) {
                                    const factor = (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast));
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

                        return canvas;
                    };

                    // Size validation and fallback system
                    const attemptConversion = async (format, qualityValue, canvasWidth, canvasHeight) => {
                        let mimeType, finalQuality = qualityValue;

                        switch (format) {
                            case 'webp': 
                                mimeType = 'image/webp';
                                if (!lossless) {
                                    finalQuality = Math.min(0.85, Math.max(0.5, qualityValue));
                                } else {
                                    finalQuality = 1;
                                }
                                break;
                            case 'avif': 
                                mimeType = 'image/avif';
                                finalQuality = Math.min(0.4, Math.max(0.15, qualityValue));
                                break;
                            case 'jpeg': 
                                mimeType = 'image/jpeg';
                                finalQuality = Math.min(0.92, Math.max(0.6, qualityValue));
                                break;
                            case 'png': 
                                mimeType = 'image/png'; 
                                finalQuality = undefined;
                                break;
                        }

                        const canvas = createCanvas(canvasWidth, canvasHeight);
                        
                        return new Promise((resolveConvert) => {
                            canvas.toBlob(
                                (blob) => {
                                    if (blob) {
                                        resolveConvert({
                                            convertedBlob: blob,
                                            convertedSize: blob.size,
                                            width: canvasWidth,
                                            height: canvasHeight,
                                            format: format,
                                            qualityUsed: finalQuality
                                        });
                                    } else {
                                        resolveConvert(null);
                                    }
                                },
                                mimeType,
                                finalQuality
                            );
                        });
                    };

                    // Aggressive dimension optimization for AVIF
                    let optimizedWidth = finalWidth;
                    let optimizedHeight = finalHeight;
                    
                    if (outputFormat === 'avif') {
                        const maxDimension = Math.max(finalWidth, finalHeight);
                        if (maxDimension > 1024) {
                            // More aggressive scaling for AVIF
                            const scale = Math.max(0.4, 1024 / maxDimension);
                            optimizedWidth = Math.round(finalWidth * scale);
                            optimizedHeight = Math.round(finalHeight * scale);
                        }
                    }

                    // Conversion attempt chain with fallbacks
                    const originalSize = file.originalSize || file.size;
                    let result = null;
                    let attempts = [];

                    // Primary format attempt
                    result = await attemptConversion(outputFormat, quality / 100, optimizedWidth, optimizedHeight);
                    attempts.push({ format: outputFormat, quality: quality / 100, result });

                    if (result && result.convertedSize < originalSize) {
                        resolve(result);
                        return;
                    }

                    // Fallback 1: Same format with lower quality
                    if (outputFormat !== 'png') {
                        const lowerQuality = Math.max(0.1, (quality / 100) * 0.5);
                        result = await attemptConversion(outputFormat, lowerQuality, optimizedWidth, optimizedHeight);
                        attempts.push({ format: outputFormat, quality: lowerQuality, result });

                        if (result && result.convertedSize < originalSize) {
                            resolve(result);
                            return;
                        }
                    }

                    // Fallback 2: Try WebP (usually best compression)
                    if (outputFormat !== 'webp') {
                        const webpQuality = Math.min(0.6, quality / 100);
                        result = await attemptConversion('webp', webpQuality, optimizedWidth, optimizedHeight);
                        attempts.push({ format: 'webp', quality: webpQuality, result });

                        if (result && result.convertedSize < originalSize) {
                            resolve(result);
                            return;
                        }
                    }

                    // Fallback 3: WebP with very low quality
                    result = await attemptConversion('webp', 0.3, optimizedWidth, optimizedHeight);
                    attempts.push({ format: 'webp', quality: 0.3, result });

                    if (result && result.convertedSize < originalSize) {
                        resolve(result);
                        return;
                    }

                    // Fallback 4: JPEG with maximum compression
                    result = await attemptConversion('jpeg', 0.4, optimizedWidth, optimizedHeight);
                    attempts.push({ format: 'jpeg', quality: 0.4, result });

                    if (result && result.convertedSize < originalSize) {
                        resolve(result);
                        return;
                    }

                    // Fallback 5: Reduce dimensions significantly and try again
                    const emergencyScale = 0.5;
                    const emergencyWidth = Math.round(optimizedWidth * emergencyScale);
                    const emergencyHeight = Math.round(optimizedHeight * emergencyScale);
                    
                    result = await attemptConversion('webp', 0.4, emergencyWidth, emergencyHeight);
                    attempts.push({ format: 'webp', quality: 0.4, dimensions: `${emergencyWidth}x${emergencyHeight}`, result });

                    if (result && result.convertedSize < originalSize) {
                        resolve(result);
                        return;
                    }

                    // If all attempts failed, return the smallest result we got
                    const validResults = attempts.filter(a => a.result).map(a => a.result);
                    if (validResults.length > 0) {
                        const smallestResult = validResults.reduce((min, curr) => 
                            curr.convertedSize < min.convertedSize ? curr : min
                        );
                        resolve(smallestResult);
                    } else {
                        reject(new Error('Failed to create compressed image'));
                    }

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = file.previewUrl;
        });
    }, []);

    // Process batch of files - uses settingsRef to always get latest settings
    const processBatch = useCallback(async (files) => {
        if (processingRef.current || files.length === 0) return;

        processingRef.current = true;
        actions.setProcessing({ isProcessing: true, isPaused: false, progress: 0 });

        let processed = 0;
        // Get current settings at the time of processing
        const currentSettings = settingsRef.current;

        for (const file of files) {
            actions.updateFile(file.id, { isConverting: true });

            try {
                const result = await processImage(file, currentSettings);

                // Revoke old URL if exists
                if (file.webpUrl) {
                    URL.revokeObjectURL(file.webpUrl);
                }

                actions.updateFile(file.id, {
                    convertedBlob: result.convertedBlob,
                    convertedSize: result.convertedSize,
                    convertedWidth: result.width,
                    convertedHeight: result.height,
                    outputFormat: result.format,
                    webpUrl: URL.createObjectURL(result.convertedBlob),
                    isConverting: false,
                    isConverted: true,
                    addedToHistory: false, // Reset so it gets added to history again
                    error: null
                });
            } catch (error) {
                console.error('Conversion error:', error);
                actions.updateFile(file.id, {
                    isConverting: false,
                    error: error.message
                });
            }

            processed++;
            actions.updateProgress(processed / files.length);
        }

        actions.setProcessing({ isProcessing: false, progress: 1 });
        processingRef.current = false;
    }, [actions, processImage]);

    // Reconvert all files with current settings
    const reconvertAll = useCallback(() => {
        const filesToConvert = state.files.filter(f => !f.isConverting);
        if (filesToConvert.length > 0) {
            processingRef.current = false; // Reset processing flag to allow reconversion
            processBatch(filesToConvert);
        }
    }, [state.files, processBatch]);

    return {
        processImage,
        processBatch,
        reconvertAll,
        isProcessing: state.processing.isProcessing,
        isPaused: state.processing.isPaused,
        progress: state.processing.progress
    };
}
