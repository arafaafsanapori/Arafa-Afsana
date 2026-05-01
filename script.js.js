// Cinematic Video Generator
// Professional image-to-video animation with camera motion, particles, and light rays

class CinematicVideoGenerator {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadedImage = null;
        this.animationFrame = null;
        this.isAnimating = false;
        this.startTime = 0;
        this.videoChunks = [];
        this.mediaRecorder = null;
        this.stream = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Upload elements
        const uploadArea = document.getElementById('uploadArea');
        const uploadBtn = document.getElementById('uploadBtn');
        const imageUpload = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => imageUpload.click());
        uploadBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ffd89b';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });
        
        // Control elements
        document.getElementById('durationSlider').addEventListener('input', (e) => {
            document.getElementById('durationValue').textContent = e.target.value + 's';
        });
        
        document.getElementById('intensitySlider').addEventListener('input', (e) => {
            document.getElementById('intensityValue').textContent = e.target.value + 'x';
        });
        
        document.getElementById('particleDensity').addEventListener('input', (e) => {
            document.getElementById('particleValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('lightIntensity').addEventListener('input', (e) => {
            document.getElementById('lightValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('previewBtn').addEventListener('click', () => this.startPreview());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportVideo());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetToUpload());
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImage(file);
        }
    }
    
    processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.uploadedImage = img;
                this.setupCanvas();
                this.showPreviewSection();
                this.drawStillFrame();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        const aspectRatio = document.getElementById('aspectRatio').value;
        let width, height;
        
        switch(aspectRatio) {
            case '16:9':
                width = 1920;
                height = 1080;
                break;
            case '9:16':
                width = 1080;
                height = 1920;
                break;
            case '1:1':
                width = 1080;
                height = 1080;
                break;
            case '4:3':
                width = 1440;
                height = 1080;
                break;
            default:
                width = 1920;
                height = 1080;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
    }
    
    showPreviewSection() {
        document.getElementById('inputSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
    }
    
    drawStillFrame() {
        if (!this.uploadedImage) return;
        
        const { x, y, width, height } = this.calculateImageFit();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.uploadedImage, x, y, width, height);
        this.addParticles(0);
        this.addLightRays(0);
    }
    
    calculateImageFit() {
        const imgAspect = this.uploadedImage.width / this.uploadedImage.height;
        const canvasAspect = this.canvas.width / this.canvas.height;
        
        let width, height, x = 0, y = 0;
        
        if (imgAspect > canvasAspect) {
            width = this.canvas.width;
            height = this.canvas.width / imgAspect;
            y = (this.canvas.height - height) / 2;
        } else {
            height = this.canvas.height;
            width = this.canvas.height * imgAspect;
            x = (this.canvas.width - width) / 2;
        }
        
        return { x, y, width, height };
    }
    
    getCameraTransform(progress) {
        const motionType = document.getElementById('cameraMotion').value;
        const intensity = parseFloat(document.getElementById('intensitySlider').value);
        
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;
        
        switch(motionType) {
            case 'dolly-in':
                scale = 1 + (progress * 0.2 * intensity);
                break;
            case 'dolly-out':
                scale = 1 + ((1 - progress) * 0.2 * intensity);
                break;
            case 'pan-left':
                offsetX = progress * 0.1 * intensity * this.canvas.width;
                break;
            case 'pan-right':
                offsetX = -progress * 0.1 * intensity * this.canvas.width;
                break;
            case 'parallax':
                scale = 1 + (Math.sin(progress * Math.PI) * 0.1 * intensity);
                offsetX = Math.sin(progress * Math.PI * 2) * 0.05 * intensity * this.canvas.width;
                break;
            case 'zoom-pan':
                scale = 1 + (progress * 0.15 * intensity);
                offsetX = progress * 0.05 * intensity * this.canvas.width;
                break;
        }
        
        return { scale, offsetX, offsetY };
    }
    
    drawAnimationFrame(progress) {
        if (!this.uploadedImage) return;
        
        const { x, y, width, height } = this.calculateImageFit();
        const { scale, offsetX, offsetY } = this.getCameraTransform(progress);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply cinematic black bars (2.35:1 letterbox effect)
        const barHeight = this.canvas.height * 0.1;
        
        this.ctx.save();
        
        // Apply transform for camera motion
        const centerX = this.canvas.width / 2 + offsetX;
        const centerY = this.canvas.height / 2 + offsetY;
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        const drawX = centerX - scaledWidth / 2;
        const drawY = centerY - scaledHeight / 2;
        
        this.ctx.drawImage(this.uploadedImage, drawX, drawY, scaledWidth, scaledHeight);
        
        // Add color grading
        this.applyColorGrading(progress);
        
        // Add particles
        const particleDensity = parseInt(document.getElementById('particleDensity').value);
        if (particleDensity > 0) {
            this.addParticles(progress);
        }
        
        // Add light rays
        const lightIntensity = parseInt(document.getElementById('lightIntensity').value);
        if (lightIntensity > 0) {
            this.addLightRays(progress);
        }
        
        // Add cinematic letterbox bars
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, barHeight);
        this.ctx.fillRect(0, this.canvas.height - barHeight, this.canvas.width, barHeight);
        
        // Add subtle vignette
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.restore();
    }
    
    applyColorGrading(progress) {
        const gradeType = document.getElementById('colorGrade').value;
        const flicker = Math.sin(progress * Math.PI * 2 * 0.5) * 0.03;
        
        switch(gradeType) {
            case 'warm':
                this.ctx.fillStyle = `rgba(255, 200, 100, ${0.15 + flicker * 0.5})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            case 'cool':
                this.ctx.fillStyle = `rgba(70, 130, 200, ${0.12 + flicker * 0.3})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            case 'vintage':
                this.ctx.fillStyle = `rgba(180, 120, 70, ${0.1 + flicker * 0.4})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            case 'dramatic':
                this.ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + flicker * 0.3})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
        }
    }
    
    addParticles(progress) {
        const density = parseInt(document.getElementById('particleDensity').value);
        const particleCount = Math.floor(density / 100 * 150);
        
        for (let i = 0; i < particleCount; i++) {
            const x = (i * 131071) % this.canvas.width;
            const y = (i * 524287 + progress * 1000) % this.canvas.height;
            const size = 1 + (i % 3);
            const opacity = 0.3 + Math.sin(progress * Math.PI * 2 + i) * 0.2;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 220, 180, ${opacity * 0.6})`;
            this.ctx.fill();
        }
    }
    
    addLightRays(progress) {
        const intensity = parseInt(document.getElementById('lightIntensity').value) / 100;
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width * 0.7, 0,
            this.canvas.width * 0.3, this.canvas.height
        );
        
        const rayIntensity = intensity * (0.5 + Math.sin(progress * Math.PI * 2) * 0.3);
        
        gradient.addColorStop(0, `rgba(255, 230, 150, ${rayIntensity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(255, 200, 100, ${rayIntensity * 0.15})`);
        gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    startPreview() {
        if (this.isAnimating) {
            this.stopAnimation();
        }
        
        this.isAnimating = true;
        this.startTime = performance.now();
        const duration = parseFloat(document.getElementById('durationSlider').value) * 1000;
        
        const overlay = document.getElementById('canvasOverlay');
        overlay.classList.add('active');
        
        const animate = (now) => {
            const elapsed = now - this.startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            // Easing for smooth cinematic feel
            progress = this.easeInOutCubic(progress);
            
            this.drawAnimationFrame(progress);
            
            if (elapsed < duration) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.stopAnimation();
                overlay.classList.remove('active');
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.isAnimating = false;
        this.drawStillFrame();
    }
    
    async exportVideo() {
        const statusDiv = document.getElementById('exportStatus');
        statusDiv.textContent = '⏳ Rendering video... Please wait.';
        statusDiv.className = 'export-status info';
        
        try {
            const duration = parseFloat(document.getElementById('durationSlider').value);
            const fps = 30;
            const totalFrames = Math.ceil(duration * fps);
            const frameDelay = 1000 / fps;
            
            // Create a temporary canvas for recording
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Prepare frames
            const frames = [];
            statusDiv.textContent = `🎬 Capturing ${totalFrames} frames...`;
            
            for (let frame = 0; frame < totalFrames; frame++) {
                const progress = this.easeInOutCubic(frame / totalFrames);
                
                // Draw frame
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                const { x, y, width, height } = this.calculateImageFit();
                const { scale, offsetX, offsetY } = this.getCameraTransform(progress);
                
                const centerX = tempCanvas.width / 2 + offsetX;
                const centerY = tempCanvas.height / 2 + offsetY;
                const scaledWidth = width * scale;
                const scaledHeight = height * scale;
                const drawX = centerX - scaledWidth / 2;
                const drawY = centerY - scaledHeight / 2;
                
                tempCtx.drawImage(this.uploadedImage, drawX, drawY, scaledWidth, scaledHeight);
                
                // Apply effects
                this.applyColorGradingToContext(tempCtx, progress, tempCanvas);
                this.addParticlesToContext(tempCtx, progress, tempCanvas);
                this.addLightRaysToContext(tempCtx, progress, tempCanvas);
                
                // Add letterbox
                const barHeight = tempCanvas.height * 0.1;
                tempCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                tempCtx.fillRect(0, 0, tempCanvas.width, barHeight);
                tempCtx.fillRect(0, tempCanvas.height - barHeight, tempCanvas.width, barHeight);
                
                frames.push(tempCanvas.toDataURL('image/jpeg', 0.95));
                
                if (frame % 30 === 0) {
                    statusDiv.textContent = `🎬 Rendering: ${Math.round((frame / totalFrames) * 100)}%`;
                }
                
                await this.delay(frameDelay);
            }
            
            statusDiv.textContent = '📦 Creating video file...';
            
            // Create video using WebM/MP4
            const videoBlob = await this.createVideoFromFrames(frames, fps, tempCanvas.width, tempCanvas.height);
            
            // Download
            const url = URL.createObjectURL(videoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cinematic_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            statusDiv.textContent = '✅ Video exported successfully! Check your downloads.';
            statusDiv.className = 'export-status success';
            
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'export-status';
            }, 5000);
            
        } catch (error) {
            console.error('Export error:', error);
            statusDiv.textContent = '❌ Export failed. Please try again.';
            statusDiv.className = 'export-status error';
        }
    }
    
    applyColorGradingToContext(ctx, progress, canvas) {
        const gradeType = document.getElementById('colorGrade').value;
        
        switch(gradeType) {
            case 'warm':
                ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
            case 'cool':
                ctx.fillStyle = 'rgba(70, 130, 200, 0.12)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
            case 'vintage':
                ctx.fillStyle = 'rgba(180, 120, 70, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
            case 'dramatic':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
        }
    }
    
    addParticlesToContext(ctx, progress, canvas) {
        const density = parseInt(document.getElementById('particleDensity').value);
        const particleCount = Math.floor(density / 100 * 100);
        
        for (let i = 0; i < particleCount; i++) {
            const x = (i * 7919) % canvas.width;
            const y = (i * 8191 + progress * 500) % canvas.height;
            const size = 1 + (i % 2);
            const opacity = 0.2 + Math.sin(progress * Math.PI * 2 + i) * 0.1;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 180, ${opacity * 0.5})`;
            ctx.fill();
        }
    }
    
    addLightRaysToContext(ctx, progress, canvas) {
        const intensity = parseInt(document.getElementById('lightIntensity').value) / 100;
        const gradient = ctx.createLinearGradient(
            canvas.width * 0.7, 0,
            canvas.width * 0.3, canvas.height
        );
        
        gradient.addColorStop(0, `rgba(255, 230, 150, ${intensity * 0.25})`);
        gradient.addColorStop(0.5, `rgba(255, 200, 100, ${intensity * 0.1})`);
        gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    async createVideoFromFrames(frames, fps, width, height) {
        return new Promise(async (resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            const stream = canvas.captureStream(fps);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 8000000
            });
            
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };
            
            mediaRecorder.start();
            
            for (let i = 0; i < frames.length; i++) {
                const img = new Image();
                await new Promise((resolveImg) => {
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolveImg();
                    };
                    img.src = frames[i];
                });
                await this.delay(1000 / fps);
            }
            
            mediaRecorder.stop();
        });
    }
    
    applyVolumeToVideo(blob) {
        // Note: Advanced audio is complex in pure JS
        // Returns the blob as-is for now
        return blob;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    resetToUpload() {
        this.stopAnimation();
        document.getElementById('previewSection').classList.add('hidden');
        document.getElementById('inputSection').classList.remove('hidden');
        document.getElementById('imageUpload').value = '';
        this.uploadedImage = null;
        document.getElementById('exportStatus').textContent = '';
        document.getElementById('exportStatus').className = 'export-status';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CinematicVideoGenerator();
});