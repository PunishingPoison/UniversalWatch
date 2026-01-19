export class VideoSync {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.videoElement = null;
        this.isProgrammaticUpdate = false;

        // Bind methods
        this.handlePlay = this.handlePlay.bind(this);
        this.handlePause = this.handlePause.bind(this);
        this.handleSeek = this.handleSeek.bind(this);

        // Start searching for video
        this.findVideo();
        setInterval(() => this.findVideo(), 2000); // Check periodically for changes
    }

    findVideo() {
        const getAllVideos = (root) => {
            let videos = Array.from(root.querySelectorAll('video'));
            // Search in shadow roots
            const allElements = root.querySelectorAll('*');
            for (let el of allElements) {
                if (el.shadowRoot) {
                    videos = [...videos, ...getAllVideos(el.shadowRoot)];
                }
            }
            return videos;
        };

        const videos = getAllVideos(document);
        if (videos.length === 0) return;

        // Filter out tiny videos (ads, previews)
        const candidates = videos.filter(v =>
            v.getBoundingClientRect().width > 200 &&
            v.getBoundingClientRect().height > 150
        );

        if (candidates.length === 0) return;

        // Pick the largest one
        const mainVideo = candidates.reduce((prev, current) => {
            const prevRect = prev.getBoundingClientRect();
            const curRect = current.getBoundingClientRect();
            return (prevRect.width * prevRect.height > curRect.width * curRect.height) ? prev : current;
        });

        if (this.videoElement !== mainVideo) {
            this.attachToVideo(mainVideo);
        }
    }

    attachToVideo(video) {
        if (this.videoElement) {
            this.removeListeners();
        }
        console.log('Attached to video:', video);
        this.videoElement = video;
        // visual indicator
        this.videoElement.style.border = "4px solid #9333ea";
        this.addListeners();
    }

    addListeners() {
        if (!this.videoElement) return;
        this.videoElement.addEventListener('play', this.handlePlay);
        this.videoElement.addEventListener('pause', this.handlePause);
        this.videoElement.addEventListener('seeked', this.handleSeek);
    }

    removeListeners() {
        if (!this.videoElement) return;
        this.videoElement.removeEventListener('play', this.handlePlay);
        this.videoElement.removeEventListener('pause', this.handlePause);
        this.videoElement.removeEventListener('seeked', this.handleSeek);
    }

    handlePlay() {
        if (this.isProgrammaticUpdate) return;
        console.log('Video Play detected');
        this.socketManager.sendVideoState({
            isPlaying: true,
            currentTime: this.videoElement.currentTime,
            timestamp: Date.now()
        });
    }

    handlePause() {
        if (this.isProgrammaticUpdate) return;
        console.log('Video Pause detected');
        this.socketManager.sendVideoState({
            isPlaying: false,
            currentTime: this.videoElement.currentTime,
            timestamp: Date.now()
        });
    }

    handleSeek() {
        if (this.isProgrammaticUpdate) return;
        console.log('Video Seek detected');
        this.socketManager.sendVideoState({
            isPlaying: !this.videoElement.paused,
            currentTime: this.videoElement.currentTime,
            timestamp: Date.now()
        });
    }

    // Called when receiving update from socket
    updateState(state) {
        if (!this.videoElement) return;

        this.isProgrammaticUpdate = true;

        const TOLERANCE = 0.5; // seconds
        const diff = Math.abs(this.videoElement.currentTime - state.currentTime);

        // Sync Time if difference is significant
        if (diff > TOLERANCE) {
            this.videoElement.currentTime = state.currentTime;
        }

        // Sync Play/Pause
        if (state.isPlaying && this.videoElement.paused) {
            this.videoElement.play().catch(e => console.error(e));
        } else if (!state.isPlaying && !this.videoElement.paused) {
            this.videoElement.pause();
        }

        setTimeout(() => {
            this.isProgrammaticUpdate = false;
        }, 100);
    }
}
