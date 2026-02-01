// Image Processing Web Worker
// Handles all heavy image processing off the main thread

const processImage = async (imageData, settings) => {
    const {
        outputFormat,
        quality,
        lossless,
        preserveMetadata,
        resize,
        rotate,
        flip,
        filters,
        crop
    } = settings;

    // Create OffscreenCanvas for image processing
    const img = await createImageBitmap(imageData.blob);

    let width = img.width;
    let height = img.height;

    // Apply crop first
    if (crop && crop.enabled) {
        width = crop.width;
        height = crop.height;
    }

    // Apply resize
    if (resize && resize.enabled) {
        if (resize.mode === 'percentage') {
            width = Math.round(width * (resize.percentage / 100));
            height = Math.round(height * (resize.percentage / 100));
        } else {
            if (resize.lockAspect) {
                const aspectRatio = img.width / img.height;
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

    // Handle rotation dimensions
    if (rotate === 90 || rotate === 270) {
        [width, height] = [height, width];
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Apply rotation/flip transforms
    ctx.save();

    if (rotate || flip) {
        ctx.translate(width / 2, height / 2);

        if (rotate) {
            ctx.rotate((rotate * Math.PI) / 180);
        }

        if (flip) {
            ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        }

        if (rotate === 90 || rotate === 270) {
            ctx.translate(-height / 2, -width / 2);
        } else {
            ctx.translate(-width / 2, -height / 2);
        }
    }

    // Draw image with crop
    if (crop && crop.enabled) {
        ctx.drawImage(
            img,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, width, height
        );
    } else {
        const srcWidth = rotate === 90 || rotate === 270 ? height : width;
        const srcHeight = rotate === 90 || rotate === 270 ? width : height;
        ctx.drawImage(img, 0, 0, srcWidth, srcHeight);
    }

    ctx.restore();

    // Apply filters
    if (filters) {
        const imageDataObj = ctx.getImageData(0, 0, width, height);
        const data = imageDataObj.data;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Grayscale
            if (filters.grayscale) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = g = b = gray;
            }

            // Brightness (-100 to 100)
            if (filters.brightness !== undefined && filters.brightness !== 0) {
                const brightness = (filters.brightness / 100) * 255;
                r += brightness;
                g += brightness;
                b += brightness;
            }

            // Contrast (-100 to 100)
            if (filters.contrast !== undefined && filters.contrast !== 0) {
                const contrast = (filters.contrast + 100) / 100;
                const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                r = factor * (r - 128) + 128;
                g = factor * (g - 128) + 128;
                b = factor * (b - 128) + 128;
            }

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageDataObj, 0, 0);
    }

    // Convert to output format
    let mimeType;
    let qualityValue = quality / 100;

    switch (outputFormat) {
        case 'webp':
            mimeType = 'image/webp';
            break;
        case 'avif':
            mimeType = 'image/avif';
            break;
        case 'jpeg':
            mimeType = 'image/jpeg';
            break;
        case 'png':
            mimeType = 'image/png';
            qualityValue = undefined; // PNG doesn't use quality
            break;
        default:
            mimeType = 'image/webp';
    }

    // For lossless WebP
    if (lossless && outputFormat === 'webp') {
        qualityValue = 1;
    }

    const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: qualityValue
    });

    return {
        id: imageData.id,
        convertedBlob: blob,
        convertedSize: blob.size,
        width,
        height,
        format: outputFormat
    };
};

// Message handler
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'PROCESS_IMAGE':
            try {
                const result = await processImage(payload.imageData, payload.settings);
                self.postMessage({ type: 'PROCESS_COMPLETE', payload: result });
            } catch (error) {
                self.postMessage({
                    type: 'PROCESS_ERROR',
                    payload: { id: payload.imageData.id, error: error.message }
                });
            }
            break;

        case 'PROCESS_BATCH':
            const { images, settings } = payload;
            let processed = 0;

            for (const imageData of images) {
                try {
                    const result = await processImage(imageData, settings);
                    processed++;
                    self.postMessage({
                        type: 'BATCH_PROGRESS',
                        payload: { ...result, progress: processed / images.length }
                    });
                } catch (error) {
                    processed++;
                    self.postMessage({
                        type: 'PROCESS_ERROR',
                        payload: { id: imageData.id, error: error.message }
                    });
                }
            }

            self.postMessage({ type: 'BATCH_COMPLETE' });
            break;

        case 'ESTIMATE_SIZE':
            try {
                const estimate = await processImage(payload.imageData, payload.settings);
                self.postMessage({
                    type: 'SIZE_ESTIMATE',
                    payload: { id: payload.imageData.id, estimatedSize: estimate.convertedSize }
                });
            } catch (error) {
                self.postMessage({
                    type: 'ESTIMATE_ERROR',
                    payload: { id: payload.imageData.id, error: error.message }
                });
            }
            break;
    }
};
