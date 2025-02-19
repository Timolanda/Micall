import React, { useState, useRef, useEffect } from 'react';
import { Video, Square, Upload, Check } from 'lucide-react';

const EmergencyRecorder = ({ isEmergencyActive }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, completed, error
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    // Auto-start recording when emergency is activated
    if (isEmergencyActive && !isRecording) {
      startRecording();
    }
  }, [isEmergencyActive]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      
      videoRef.current.srcObject = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        uploadRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start recording timer
      const startTime = Date.now();
      const timerInterval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(timerInterval);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const uploadRecording = async () => {
    setUploadStatus('uploading');
    
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      
      // Create a unique filename with timestamp
      const filename = `emergency-recording-${Date.now()}.webm`;
      
      // Simulate encrypted upload to cloud storage
      // In production, replace with actual cloud storage upload
      await simulateEncryptedUpload(blob, filename);
      
      setUploadStatus('completed');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

  // Simulate encrypted upload (replace with actual implementation)
  const simulateEncryptedUpload = async (blob, filename) => {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000); // Simulate 2s upload
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
        />
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Upload status indicator */}
      {uploadStatus !== 'idle' && (
        <div className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1">
          {uploadStatus === 'uploading' && (
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-white animate-bounce" />
              <span className="text-white text-sm">Uploading...</span>
            </div>
          )}
          {uploadStatus === 'completed' && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-white text-sm">Uploaded</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-4 rounded-full ${
            isRecording 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Video className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default EmergencyRecorder; 