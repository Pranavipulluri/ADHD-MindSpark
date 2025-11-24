import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { Camera, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FocusMonitorProps {
  isActive: boolean;
  onDistraction: () => void;
}

const FocusMonitor: React.FC<FocusMonitorProps> = ({ isActive, onDistraction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [focusStatus, setFocusStatus] = useState<'focused' | 'distracted' | 'sleeping'>('focused');
  const [distractionCount, setDistractionCount] = useState(0);
  
  const distractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sleepingCountRef = useRef(0);
  const distractedCountRef = useRef(0);

  // Initialize TensorFlow and Face Detection
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        await tf.ready();
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: true,
        };
        const faceDetector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        setDetector(faceDetector);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing face detector:', error);
        setIsLoading(false);
      }
    };

    initializeDetector();

    return () => {
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  // Start/Stop camera based on isActive
  useEffect(() => {
    if (isActive && !cameraEnabled) {
      startCamera();
    } else if (!isActive && cameraEnabled) {
      stopCamera();
    }
  }, [isActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraEnabled(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Please allow camera access to enable focus monitoring');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraEnabled(false);
    }
  };

  // Calculate Eye Aspect Ratio (EAR) to detect closed eyes
  const calculateEAR = (landmarks: any[]) => {
    // Get eye landmarks (simplified)
    const leftEye = landmarks.slice(33, 42);
    const rightEye = landmarks.slice(133, 142);
    
    const getEyeAspectRatio = (eye: any[]) => {
      if (eye.length < 6) return 1;
      
      // Vertical distance
      const vertical1 = Math.hypot(
        eye[1].x - eye[5].x,
        eye[1].y - eye[5].y
      );
      const vertical2 = Math.hypot(
        eye[2].x - eye[4].x,
        eye[2].y - eye[4].y
      );
      
      // Horizontal distance
      const horizontal = Math.hypot(
        eye[0].x - eye[3].x,
        eye[0].y - eye[3].y
      );
      
      return (vertical1 + vertical2) / (2 * horizontal);
    };
    
    const leftEAR = getEyeAspectRatio(leftEye);
    const rightEAR = getEyeAspectRatio(rightEye);
    
    return (leftEAR + rightEAR) / 2;
  };

  // Detect if face is centered
  const isFaceCentered = (face: any) => {
    if (!videoRef.current) return false;
    
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    const box = face.box;
    const centerX = box.xMin + box.width / 2;
    const centerY = box.yMin + box.height / 2;
    
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;
    
    const distanceFromCenter = Math.hypot(
      centerX - videoCenterX,
      centerY - videoCenterY
    );
    
    const maxDistance = Math.min(videoWidth, videoHeight) * 0.3;
    
    return distanceFromCenter < maxDistance;
  };

  // Main detection loop
  useEffect(() => {
    if (!detector || !isActive || !cameraEnabled) return;

    const detectFocus = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        requestAnimationFrame(detectFocus);
        return;
      }

      try {
        const faces = await detector.estimateFaces(videoRef.current, {
          flipHorizontal: false
        });

        // Draw on canvas
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw video frame
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
        }

        if (faces.length === 0) {
          // No face detected - student not in frame
          distractedCountRef.current++;
          sleepingCountRef.current = 0;
          
          if (distractedCountRef.current > 30) { // ~1 second at 30fps
            setFocusStatus('distracted');
            triggerDistraction('not-in-frame');
          }
        } else {
          const face = faces[0];
          const landmarks = face.keypoints;
          
          // Check if eyes are closed
          const ear = calculateEAR(landmarks);
          const eyesClosedThreshold = 0.15;
          
          if (ear < eyesClosedThreshold) {
            sleepingCountRef.current++;
            distractedCountRef.current = 0;
            
            if (sleepingCountRef.current > 90) { // ~3 seconds
              setFocusStatus('sleeping');
              triggerDistraction('sleeping');
            }
          } else if (!isFaceCentered(face)) {
            // Face detected but looking away
            distractedCountRef.current++;
            sleepingCountRef.current = 0;
            
            if (distractedCountRef.current > 60) { // ~2 seconds
              setFocusStatus('distracted');
              triggerDistraction('looking-away');
            }
          } else {
            // Focused
            sleepingCountRef.current = 0;
            distractedCountRef.current = 0;
            setFocusStatus('focused');
          }
        }
      } catch (error) {
        console.error('Error detecting faces:', error);
      }

      requestAnimationFrame(detectFocus);
    };

    detectFocus();
  }, [detector, isActive, cameraEnabled]);

  const triggerDistraction = (type: string) => {
    // Clear any existing timeout
    if (distractionTimeoutRef.current) {
      clearTimeout(distractionTimeoutRef.current);
    }

    // Set new timeout to prevent rapid alerts
    distractionTimeoutRef.current = setTimeout(() => {
      setDistractionCount(prev => prev + 1);
      onDistraction();
      playAlarm(type);
    }, 1000);
  };

  const playAlarm = (type: string) => {
    // Create audio context and play alarm
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // 800 Hz alarm tone
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Stay Focused! 🎯', {
        body: type === 'sleeping' 
          ? 'Wake up! Keep your eyes on the screen!' 
          : type === 'not-in-frame'
          ? 'Come back! Stay in frame!'
          : 'Focus! Look at the screen!',
        icon: '/icons/icon48.png'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-purple-100 rounded-lg p-4 flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <p className="text-purple-800">Loading focus monitor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera Feed */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '240px' }}>
        {cameraEnabled ? (
          <>
            <video
              ref={videoRef}
              className="hidden"
              width="640"
              height="480"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className="w-full h-full object-cover"
            />
            
            {/* Focus Status Overlay */}
            <div className="absolute top-3 right-3 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
              style={{
                backgroundColor: focusStatus === 'focused' 
                  ? 'rgba(34, 197, 94, 0.9)' 
                  : focusStatus === 'sleeping'
                  ? 'rgba(239, 68, 68, 0.9)'
                  : 'rgba(251, 146, 60, 0.9)',
                color: 'white'
              }}
            >
              {focusStatus === 'focused' ? (
                <><Eye className="w-4 h-4" /> Focused</>
              ) : focusStatus === 'sleeping' ? (
                <><EyeOff className="w-4 h-4" /> Wake Up!</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Look Here!</>
              )}
            </div>

            {/* Distraction Counter */}
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              Distractions: {distractionCount}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-2" />
              <p>Camera will start when timer begins</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Focus Monitor will alert you if you look away, close your eyes, or leave the frame for too long.
          </span>
        </p>
      </div>
    </div>
  );
};

export default FocusMonitor;
