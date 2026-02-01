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

                    const canvas = document.createElement('canvas');
                    canvas.width = finalWidth;
                    canvas.height = finalHeight;
                    const ctx = canvas.getContext('2d');

                    // Apply transforms
                    ctx.save();
                    ctx.translate(finalWidth / 2, finalHeight / 2);

                    if (rotate) {
                        ctx.rotate((rotate * Math.PI) / 180);
                    }

                    if (flip?.horizontal || flip?.vertical) {
                        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
                    }

                    // Draw image centered
                    ctx.drawImage(img, -width / 2, -height / 2, width, height);
                    ctx.restore();

                    // Apply filters
                    if (filters?.grayscale || filters?.brightness || filters?.contrast) {
                        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
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

                    // Determine output format
                    let mimeType = 'image/webp';
                    let qualityValue = quality / 100;

                    switch (outputFormat) {
                        case 'webp': mimeType = 'image/webp'; break;
                        case 'avif': mimeType = 'image/avif'; break;
                        case 'jpeg': mimeType = 'image/jpeg'; break;
                        case 'png': mimeType = 'image/png'; qualityValue = undefined; break;
                    }

                    if (lossless && outputFormat === 'webp') {
                        qualityValue = 1;
                    }

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve({
                                    convertedBlob: blob,
                                    convertedSize: blob.size,
                                    width: finalWidth,
                                    height: finalHeight,
                                    format: outputFormat
                                });
                            } else {
                                reject(new Error('Failed to create blob'));
                            }
                        },
                        mimeType,
                        qualityValue
                    );
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
