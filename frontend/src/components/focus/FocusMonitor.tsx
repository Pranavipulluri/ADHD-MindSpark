import { AlertCircle, Camera, Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FocusMonitorProps {
  isActive: boolean;
  onDistraction: () => void;
}

const FocusMonitor: React.FC<FocusMonitorProps> = ({ isActive, onDistraction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [focusStatus, setFocusStatus] = useState<'focused' | 'distracted'>('focused');
  const [distractionCount, setDistractionCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const noFaceCountRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      console.log('🎥 FocusMonitor: isActive=true, starting camera...');
      startCamera();
    } else {
      console.log('🎥 FocusMonitor: isActive=false, stopping camera...');
      stopCamera();
    }
    
    return () => {
      console.log('🎥 FocusMonitor: cleanup, stopping camera...');
      stopCamera();
    };
  }, [isActive]);

  const startCamera = async () => {
    try {
      console.log('📹 Requesting camera access...');
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        console.log('🔔 Requesting notification permission...');
        await Notification.requestPermission();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      console.log('✅ Camera stream obtained!', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('📹 Video srcObject set, attempting to play...');
        
        try {
          await videoRef.current.play();
          console.log('✅ Video playing!');
          setCameraEnabled(true);
          startFocusChecking();
          startFaceDetection();
        } catch (playError) {
          console.error('❌ Error playing video:', playError);
        }
      } else {
        console.error('❌ videoRef.current is null!');
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      alert('⚠️ Camera Error: ' + error.message + '\n\nPlease allow camera access and try again.');
    }
  };

  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    
    // Clear all intervals
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    
    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      console.log(`🛑 Stopping ${tracks.length} camera tracks...`);
      tracks.forEach(track => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
      });
      videoRef.current.srcObject = null;
    }
    
    setCameraEnabled(false);
    setFaceDetected(false);
    noFaceCountRef.current = 0;
    console.log('✅ Camera stopped successfully');
  };

  // Simple motion/face detection using canvas pixel comparison
  const startFaceDetection = () => {
    console.log('👤 Starting face detection...');
    let lastFrame: ImageData | null = null;
    
    faceCheckIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {
        console.log('⚠️ Face detection: Missing video or canvas ref');
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.paused || video.ended) {
        console.log('⚠️ Face detection: Context missing or video not playing');
        return;
      }

      // Draw current frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (lastFrame) {
        // Check for significant changes (movement/presence)
        const diff = calculateFrameDifference(lastFrame, currentFrame);
        
        // If there's movement in center area (where face should be), person is present
        const centerDiff = calculateCenterDifference(lastFrame, currentFrame);
        
        console.log(`👤 Face Check: centerDiff=${centerDiff.toFixed(1)}, totalDiff=${diff.toFixed(1)}`);
        
        if (centerDiff > 15 || diff > 20) {
          // Movement detected - person is there
          console.log('✅ Face/movement detected!');
          setFaceDetected(true);
          noFaceCountRef.current = 0;
        } else {
          // No significant movement - might be away
          noFaceCountRef.current++;
          console.log(`⚠️ No movement detected (${noFaceCountRef.current}/3)`);
          
          if (noFaceCountRef.current > 3) { // 3 checks = ~15 seconds
            console.log('❌ Person appears to be AWAY');
            setFaceDetected(false);
          }
        }
      }
      
      lastFrame = currentFrame;
    }, 5000); // Check every 5 seconds
  };

  const calculateFrameDifference = (frame1: ImageData, frame2: ImageData): number => {
    let diff = 0;
    const pixels = frame1.data.length;
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < pixels; i += 40) {
      const r1 = frame1.data[i];
      const r2 = frame2.data[i];
      diff += Math.abs(r1 - r2);
    }
    
    return diff / (pixels / 40);
  };

  const calculateCenterDifference = (frame1: ImageData, frame2: ImageData): number => {
    const width = frame1.width;
    const height = frame1.height;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const radius = Math.min(width, height) / 4;
    
    let diff = 0;
    let count = 0;
    
    // Check center circle area
    for (let y = centerY - radius; y < centerY + radius; y += 10) {
      for (let x = centerX - radius; x < centerX + radius; x += 10) {
        const index = (y * width + x) * 4;
        if (index >= 0 && index < frame1.data.length) {
          diff += Math.abs(frame1.data[index] - frame2.data[index]);
          count++;
        }
      }
    }
    
    return count > 0 ? diff / count : 0;
  };

  const startFocusChecking = () => {
    checkIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      console.log(`⏰ Focus Check: Activity=${timeSinceActivity}ms ago, Face=${faceDetected}`);
      
      // Trigger distraction if:
      // 1. No keyboard/mouse activity for 10 seconds, OR
      // 2. No face detected in camera
      if (timeSinceActivity > 10000 || !faceDetected) {
        console.log('🚨 DISTRACTION DETECTED!');
        setFocusStatus('distracted');
        triggerDistraction();
        lastActivityRef.current = Date.now();
      } else {
        setFocusStatus('focused');
      }
    }, 5000); // Check every 5 seconds (faster response)
  };

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setFocusStatus('focused');
    };
    
    if (isActive) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      
      return () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keypress', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
      };
    }
  }, [isActive]);

  const triggerDistraction = () => {
    setDistractionCount(prev => prev + 1);
    onDistraction();
    playAlarm();
    showNotification();
  };

  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800; // High-pitched beep
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      // Second beep (higher pitch)
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 1000;
      
      gainNode2.gain.setValueAtTime(0.5, audioContext.currentTime + 0.3);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.3);
      
      oscillator2.start(audioContext.currentTime + 0.3);
      oscillator2.stop(audioContext.currentTime + 1.3);
      
      console.log('🔔 Alarm played!');
    } catch (error) {
      console.error('Error playing alarm:', error);
      // Fallback: try to use default beep
      window.alert('🔔 DISTRACTION ALERT! Get back to work!');
    }
  };

  const showNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Stay Focused!', {
        body: faceDetected 
          ? 'No activity detected! Are you still working?' 
          : 'You seem to be away! Get back to your task!',
        icon: '/icon48.png',
        requireInteraction: true
      });
    }
  };

  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Debug info */}
      {!cameraEnabled && isActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <p className="text-yellow-800">⚠️ Camera is starting... If it doesn't start, check browser permissions.</p>
        </div>
      )}
      
      {/* Hidden canvas for face detection */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '240px' }}>
        {/* Video element - ALWAYS rendered, just hidden when not active */}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover mirror"
          style={{ 
            transform: 'scaleX(-1)',
            display: cameraEnabled ? 'block' : 'none'
          }}
          autoPlay 
          playsInline 
          muted 
        />
        
        {cameraEnabled && (
          <>
            {/* Status Badge */}
            <div 
              className="absolute top-3 right-3 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg"
              style={{ 
                backgroundColor: focusStatus === 'focused' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)', 
                color: 'white' 
              }}
            >
              {focusStatus === 'focused' ? (
                <><Eye className="w-4 h-4" /> Focused</>
              ) : (
                <><EyeOff className="w-4 h-4" /> Distracted!</>
              )}
            </div>

            {/* Face Detection Indicator */}
            <div 
              className="absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2"
              style={{
                backgroundColor: faceDetected ? 'rgba(34, 197, 94, 0.8)' : 'rgba(251, 146, 60, 0.8)',
                color: 'white'
              }}
            >
              {faceDetected ? '✓ Present' : '⚠ Away'}
            </div>
            
            {/* Distraction Counter */}
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              🔔 Distractions: {distractionCount}
            </div>
          </>
        )}
        
        {!cameraEnabled && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-2" />
              {isActive ? (
                <>
                  <p className="text-yellow-300 font-semibold">Starting camera...</p>
                  <p className="text-xs mt-2">Please allow camera access when prompted</p>
                </>
              ) : (
                <p>Camera will start when timer begins</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Focus Monitor tracks your presence and activity. 
            {cameraEnabled && ' Stay in front of the camera and keep working!'}
          </span>
        </p>
        {cameraEnabled && (
          <button
            onClick={() => {
              playAlarm();
              showNotification();
            }}
            className="w-full mt-2 px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
          >
            🔔 Test Alarm & Notification
          </button>
        )}
      </div>
    </div>
  );
};

export default FocusMonitor;
