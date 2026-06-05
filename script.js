/**
 * Image Resizer & Compressor for UPSC, IIT-JEE, and NEET Applications
 * Enhanced with Universal Image Format Support, HEIC/HEIF Conversion, and Auto-JPG Conversion
 * Client-side image processing using HTML5 Canvas API + heic2any library
 * No server uploads, 100% private processing
 */

// ============================================================================
// CONFIGURATION: Official image specifications for all exams
// ============================================================================

const IMAGE_SPECS = {
    upsc: {
        photo: {
            width: 472,
            height: 591,
            minSize: 20,
            maxSize: 300,
            label: 'UPSC Photo'
        },
        signature: {
            width: 413,
            height: 177,
            minSize: 20,
            maxSize: 50,
            label: 'UPSC Signature'
        }
    },
    iitjee: {
        photo: {
            width: 413,
            height: 531,
            minSize: 10,
            maxSize: 200,
            label: 'IIT-JEE Photo'
        },
        signature: {
            width: 413,
            height: 177,
            minSize: 10,
            maxSize: 100,
            label: 'IIT-JEE Signature'
        }
    },
    neet: {
        passport: {
            width: 413,
            height: 531,
            minSize: 10,
            maxSize: 200,
            label: 'NEET Passport Size Photo'
        },
        postcard: {
            width: 472,
            height: 708,
            minSize: 10,
            maxSize: 200,
            label: 'NEET Postcard Size Photo'
        },
        signature: {
            width: 413,
            height: 177,
            minSize: 4,
            maxSize: 30,
            label: 'NEET Signature'
        },
        thumb: {
            width: 120,
            height: 120,
            minSize: 10,
            maxSize: 200,
            label: 'NEET Thumb Impression'
        }
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let appState = {
    uploadedFile: null,
    uploadedImage: null,
    imageFormat: 'jpg', // Track original format
    selectedPreset: null,
    selectedType: null,
    processedImage: null,
    processedQuality: null,
    processedSize: null,
    candidateName: '',
    photoDate: ''
};

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileFormatInfo: document.getElementById('fileFormatInfo'),
    uploadSection: document.getElementById('uploadSection'),
    heicLoadingState: document.getElementById('heicLoadingState'),
    presetSection: document.getElementById('presetSection'),
    upscPhotoOptions: document.getElementById('upscPhotoOptions'),
    candidateName: document.getElementById('candidateName'),
    photoDate: document.getElementById('photoDate'),
    processingSection: document.getElementById('processingSection'),
    qualityPercent: document.getElementById('qualityPercent'),
    currentSize: document.getElementById('currentSize'),
    previewSection: document.getElementById('previewSection'),
    previewImage: document.getElementById('previewImage'),
    finalSize: document.getElementById('finalSize'),
    finalDimensions: document.getElementById('finalDimensions'),
    finalQuality: document.getElementById('finalQuality'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    faqToggles: document.querySelectorAll('.faq-toggle'),
    contactForm: document.getElementById('contactForm'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn')
};

// ============================================================================
// FILE UPLOAD HANDLERS
// ============================================================================

/**
 * Initialize upload area with drag and drop support
 */
function initializeUploadArea() {
    // Click to upload
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    
    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });
    
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            elements.fileInput.files = files;
            handleFileSelect();
        }
    });
}

/**
 * Handle file selection with HEIC/HEIF conversion support
 * Detects Apple's HEIC format and converts it to JPEG client-side
 * using the heic2any library before processing.
 */
async function handleFileSelect() {
    const file = elements.fileInput.files[0];
    
    if (!file) return;
    
    // Validate file type - accepts all image formats
    if (!file.type.startsWith('image/')) {
        showError('Please upload a valid image file (PNG, JPG, WebP, BMP, HEIC, etc.)');
        return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }
    
    // Check if file is HEIC/HEIF format
    const isHeicFormat = file.type === 'image/heic' || file.type === 'image/heif';
    
    // If HEIC/HEIF, show loading state and convert
    if (isHeicFormat) {
        elements.heicLoadingState.classList.remove('hidden');
        
        try {
            // Use heic2any library to convert HEIC blob to JPEG blob
            const convertedBlob = await window.heic2any({
                blob: file,
                toType: 'image/jpeg'
            });
            
            // Create a new File object from the converted blob
            // Use the original filename but with .jpg extension
            const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            const convertedFile = new File(
                [convertedBlob],
                originalNameWithoutExt + '.jpg',
                { type: 'image/jpeg' }
            );
            
            // Update file input and proceed with converted file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(convertedFile);
            elements.fileInput.files = dataTransfer.files;
            
            // Process the converted file
            processConvertedFile(convertedFile);
            
            // Hide loading state
            elements.heicLoadingState.classList.add('hidden');
        } catch (error) {
            // If conversion fails, show friendly error
            console.error('HEIC conversion error:', error);
            elements.heicLoadingState.classList.add('hidden');
            showError('Failed to convert iPhone format (HEIC). Please try another image or use a different format.');
            return;
        }
    } else {
        // For standard web images, proceed with existing logic
        processConvertedFile(file);
    }
}

/**
 * Process the file (either converted from HEIC or standard format)
 * This wraps the existing FileReader pipeline for consistency.
 */
function processConvertedFile(file) {
    appState.uploadedFile = file;
    elements.fileName.textContent = file.name;
    
    // Display original format information
    const formatType = getImageFormatFromMimeType(file.type);
    appState.imageFormat = formatType;
    elements.fileFormatInfo.textContent = `Original format: ${formatType.toUpperCase()} • Will be converted to JPG`;
    
    elements.fileInfo.classList.remove('hidden');
    
    // Read file as image (existing FileReader pipeline)
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            appState.uploadedImage = img;
        };
        img.onerror = () => {
            showError('Failed to load image. Please try another file.');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
}

/**
 * Extract image format from MIME type
 * Now recognizes HEIC and HEIF formats
 */
function getImageFormatFromMimeType(mimeType) {
    const formats = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/bmp': 'bmp',
        'image/gif': 'gif',
        'image/tiff': 'tiff',
        'image/x-tiff': 'tiff',
        'image/heic': 'heic',
        'image/heif': 'heif'
    };
    
    return formats[mimeType] || 'unknown';
}

// ============================================================================
// PRESET SELECTION HANDLERS
// ============================================================================

/**
 * Initialize preset button listeners
 */
function initializePresetButtons() {
    elements.presetButtons.forEach(btn => {
        btn.addEventListener('click', () => handlePresetSelection(btn));
    });
}

/**
 * Handle preset button click
 */
function handlePresetSelection(btn) {
    if (!appState.uploadedImage) {
        showError('Please upload an image first');
        return;
    }
    
    // Remove active state from all buttons
    elements.presetButtons.forEach(b => b.classList.remove('active'));
    
    // Add active state to clicked button
    btn.classList.add('active');
    
    // Get preset and type
    const preset = btn.dataset.preset;
    const type = btn.dataset.type;
    
    appState.selectedPreset = preset;
    appState.selectedType = type;
    
    // Show UPSC photo options if applicable
    if (preset === 'upsc' && type === 'photo') {
        elements.upscPhotoOptions.classList.remove('hidden');
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        elements.photoDate.value = today;
    } else {
        elements.upscPhotoOptions.classList.add('hidden');
    }
    
    // Start processing
    processImage();
}

// ============================================================================
// IMAGE PROCESSING: BINARY SEARCH FOR OPTIMAL QUALITY WITH FORMAT CONVERSION
// ============================================================================

/**
 * Main image processing function
 * Uses binary search to find optimal JPEG quality for target file size
 * Handles format conversion from any input format to JPG
 */
async function processImage() {
    if (!appState.uploadedImage || !appState.selectedPreset || !appState.selectedType) {
        showError('Please upload an image and select a preset');
        return;
    }
    
    // Show processing section
    elements.processingSection.classList.remove('hidden');
    elements.previewSection.classList.add('hidden');
    
    // Get specs for selected preset
    const specs = IMAGE_SPECS[appState.selectedPreset][appState.selectedType];
    
    // Get watermark info if needed
    if (appState.selectedPreset === 'upsc' && appState.selectedType === 'photo') {
        appState.candidateName = elements.candidateName.value || '';
        appState.photoDate = elements.photoDate.value || new Date().toISOString().split('T')[0];
    }
    
    try {
        // Binary search for optimal quality
        const result = await binarySearchQuality(
            appState.uploadedImage,
            specs.width,
            specs.height,
            specs.minSize,
            specs.maxSize,
            appState.selectedPreset,
            appState.selectedType,
            appState.imageFormat
        );
        
        if (result.success) {
            appState.processedImage = result.dataUrl;
            appState.processedQuality = result.quality;
            appState.processedSize = result.size;
            
            // Update UI
            updatePreview(result);
            
            // Hide processing, show preview
            elements.processingSection.classList.add('hidden');
            elements.previewSection.classList.remove('hidden');
        } else {
            showError(result.error || 'Unable to process image. Please try again.');
            elements.processingSection.classList.add('hidden');
        }
    } catch (error) {
        console.error('Processing error:', error);
        showError('An error occurred during processing: ' + error.message);
        elements.processingSection.classList.add('hidden');
    }
}

/**
 * Binary search algorithm to find optimal JPEG quality
 * Ensures the final file size falls within the target range
 * Handles transparent backgrounds for non-JPG formats
 */
async function binarySearchQuality(image, targetWidth, targetHeight, minSizeKB, maxSizeKB, preset, type, originalFormat) {
    const minSizeBytes = minSizeKB * 1024;
    const maxSizeBytes = maxSizeKB * 1024;
    
    let lowQuality = 0.1;
    let highQuality = 1.0;
    let bestQuality = 0.5;
    let bestResult = null;
    let iterations = 0;
    const maxIterations = 20;
    
    while (iterations < maxIterations && (highQuality - lowQuality) > 0.01) {
        const midQuality = (lowQuality + highQuality) / 2;
        
        // Update UI with current progress
        updateProcessingProgress(midQuality * 100);
        
        // Compress image at this quality (with transparent-to-white conversion if needed)
        const result = compressImage(
            image,
            targetWidth,
            targetHeight,
            midQuality,
            preset,
            type,
            originalFormat
        );
        
        const dataUrl = result.dataUrl;
        const sizeInBytes = getDataUrlSize(dataUrl);
        const sizeInKB = sizeInBytes / 1024;
        
        // Update current size display
        elements.currentSize.textContent = Math.round(sizeInKB);
        
        // Check if size is within range
        if (sizeInBytes >= minSizeBytes && sizeInBytes <= maxSizeBytes) {
            // Perfect match!
            return {
                success: true,
                dataUrl: dataUrl,
                quality: Math.round(midQuality * 100),
                size: Math.round(sizeInKB),
                dimensions: `${targetWidth}x${targetHeight}`
            };
        } else if (sizeInBytes < minSizeBytes) {
            // Too small, increase quality
            lowQuality = midQuality;
            bestQuality = midQuality;
            bestResult = {
                success: true,
                dataUrl: dataUrl,
                quality: Math.round(midQuality * 100),
                size: Math.round(sizeInKB),
                dimensions: `${targetWidth}x${targetHeight}`
            };
        } else {
            // Too large, decrease quality
            highQuality = midQuality;
            bestQuality = midQuality;
            bestResult = {
                success: true,
                dataUrl: dataUrl,
                quality: Math.round(midQuality * 100),
                size: Math.round(sizeInKB),
                dimensions: `${targetWidth}x${targetHeight}`
            };
        }
        
        iterations++;
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    if (bestResult && bestResult.size >= minSizeKB && bestResult.size <= maxSizeKB) {
        return bestResult;
    } else if (bestResult) {
        // Best attempt (may be outside range)
        return bestResult;
    } else {
        return {
            success: false,
            error: 'Could not process image to specifications'
        };
    }
}

/**
 * Compress image using Canvas API
 * Handles transparent-to-white background conversion for non-JPG formats
 * Applies watermark for UPSC photos
 * Always outputs as JPG regardless of input format
 */
function compressImage(image, targetWidth, targetHeight, quality, preset, type, originalFormat) {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Fill background with WHITE first (critical for PNG transparency and non-JPG formats)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Calculate aspect ratio
    const imgAspect = image.width / image.height;
    const canvasAspect = targetWidth / targetHeight;
    
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgAspect > canvasAspect) {
        // Image is wider, fit to height
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgAspect;
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
    } else {
        // Image is taller, fit to width
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgAspect;
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
    }
    
    // Draw resized image on white background
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    
    // Add watermark for UPSC photos
    if (preset === 'upsc' && type === 'photo' && appState.candidateName) {
        addWatermark(ctx, targetWidth, targetHeight, appState.candidateName, appState.photoDate);
    }
    
    // Convert to JPEG with specified quality
    // Note: toDataURL always outputs image/jpeg when specified, regardless of input format
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    
    return {
        dataUrl: dataUrl,
        quality: quality
    };
}

/**
 * Add text watermark to image (name and date)
 * Required for UPSC 2026 applications
 */
function addWatermark(ctx, width, height, name, date) {
    // Setup text style
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add semi-transparent background for text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(5, height - 35, width - 10, 30);
    
    // Draw name
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(name, width / 2, height - 22);
    
    // Draw date
    ctx.font = '10px Arial';
    ctx.fillText(date, width / 2, height - 10);
}

/**
 * Calculate size of data URL in bytes
 * Accounts for Base64 encoding overhead
 */
function getDataUrlSize(dataUrl) {
    // Remove the data URL prefix
    const base64String = dataUrl.split(',')[1];
    
    // Calculate size accounting for Base64 encoding (33% overhead)
    const sizeInBytes = Math.ceil((base64String.length * 3) / 4);
    
    return sizeInBytes;
}

/**
 * Update processing progress display
 */
function updateProcessingProgress(quality) {
    elements.qualityPercent.textContent = Math.round(quality);
}

/**
 * Update preview with processed image
 */
function updatePreview(result) {
    elements.previewImage.src = result.dataUrl;
    elements.finalSize.textContent = result.size + ' KB';
    elements.finalDimensions.textContent = result.dimensions;
    elements.finalQuality.textContent = result.quality + '%';
}

// ============================================================================
// DOWNLOAD HANDLER
// ============================================================================

/**
 * Download processed image as JPG
 */
function handleDownload() {
    if (!appState.processedImage) {
        showError('No processed image available');
        return;
    }
    
    // Create link and trigger download
    const link = document.createElement('a');
    link.href = appState.processedImage;
    
    // Generate filename with JPG extension
    const preset = appState.selectedPreset.toUpperCase();
    const type = appState.selectedType.charAt(0).toUpperCase() + appState.selectedType.slice(1);
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${preset}_${type}_${timestamp}.jpg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Image downloaded successfully as JPG!');
}

/**
 * Reset to upload state
 */
function handleReset() {
    // Reset state
    appState = {
        uploadedFile: null,
        uploadedImage: null,
        imageFormat: 'jpg',
        selectedPreset: null,
        selectedType: null,
        processedImage: null,
        processedQuality: null,
        processedSize: null,
        candidateName: '',
        photoDate: ''
    };
    
    // Reset UI
    elements.fileInput.value = '';
    elements.fileInfo.classList.add('hidden');
    elements.heicLoadingState.classList.add('hidden');
    elements.previewSection.classList.add('hidden');
    elements.processingSection.classList.add('hidden');
    elements.upscPhotoOptions.classList.add('hidden');
    elements.presetButtons.forEach(btn => btn.classList.remove('active'));
    elements.candidateName.value = '';
    elements.photoDate.value = '';
    elements.fileFormatInfo.textContent = '';
}

// ============================================================================
// FAQ ACCORDION
// ============================================================================

/**
 * Initialize FAQ accordions
 */
function initializeFAQ() {
    elements.faqToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const answer = toggle.nextElementSibling;
            const isHidden = answer.classList.contains('hidden');
            
            // Close all other answers
            document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
            document.querySelectorAll('.faq-toggle span:last-child').forEach(s => s.textContent = '+');
            
            // Toggle current answer
            if (isHidden) {
                answer.classList.remove('hidden');
                toggle.querySelector('span:last-child').textContent = '−';
            }
        });
    });
}

// ============================================================================
// CONTACT FORM HANDLER
// ============================================================================

/**
 * Initialize contact form
 */
function initializeContactForm() {
    elements.contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;
        
        // In a real app, you'd send this to a backend
        console.log('Contact form submission:', { email, message });
        
        showSuccess('Thank you! Your message has been received. We\'ll get back to you soon.');
        elements.contactForm.reset();
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Show error message
 */
function showError(message) {
    // Create alert
    const alert = document.createElement('div');
    alert.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    alert.textContent = '❌ ' + message;
    
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Create alert
    const alert = document.createElement('div');
    alert.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    alert.textContent = '✓ ' + message;
    
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the entire application
 */
function initializeApp() {
    console.log('Initializing Image Resizer & Compressor App (Enhanced with HEIC/HEIF Support)');
    console.log('Supported formats: JPG, PNG (with transparency handling), WebP, BMP, GIF, TIFF, HEIC/HEIF');
    console.log('HEIC/HEIF conversion: Powered by heic2any library');
    
    // Setup handlers
    initializeUploadArea();
    initializePresetButtons();
    initializeFAQ();
    initializeContactForm();
    
    // Setup download and reset buttons
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.resetBtn.addEventListener('click', handleReset);
    
    // Set today's date as default for UPSC photos
    const today = new Date().toISOString().split('T')[0];
    elements.photoDate.value = today;
    
    console.log('App initialized successfully');
    console.log('Image specs loaded:', Object.keys(IMAGE_SPECS).length, 'exam presets');
}

/**
 * Run initialization when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ============================================================================
// PERFORMANCE OPTIMIZATION: Add custom CSS animation for alerts
// ============================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
    
    /* Prevent layout shift during ad insertion */
    .ad-slot {
        contain: layout style paint;
    }
    
    /* Performance: GPU acceleration for smooth scrolling */
    html {
        scroll-behavior: smooth;
    }
    
    /* Optimize canvas rendering */
    canvas {
        image-rendering: -webkit-optimize-contrast;
    }
`;
document.head.appendChild(style);
