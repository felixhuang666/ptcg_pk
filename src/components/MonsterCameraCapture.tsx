import React, { useState } from 'react';
import Camera, { FACING_MODES } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { Camera as CameraIcon, SwitchCamera, Upload, X } from 'lucide-react';

interface MonsterCameraCaptureProps {
  onCaptureComplete: (filename: string) => void;
  onCancel: () => void;
}

export default function MonsterCameraCapture({ onCaptureComplete, onCancel }: MonsterCameraCaptureProps) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<any>(FACING_MODES.ENVIRONMENT);
  const [isUploading, setIsUploading] = useState(false);

  const handleTakePhotoAnimationDone = (uri: string) => {
    setDataUri(uri);
  };

  const handleToggleCamera = () => {
    setFacingMode((prevMode: any) =>
      prevMode === FACING_MODES.ENVIRONMENT ? FACING_MODES.USER : FACING_MODES.ENVIRONMENT
    );
  };

  const handleUpload = async () => {
    if (!dataUri) return;
    setIsUploading(true);

    try {
      const filename = `monster_${Date.now()}.png`;
      const res = await fetch('/api/upload_monster_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_base64: dataUri,
          filename: filename
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Server error response:', errText);
        alert('Upload failed (HTTP ' + res.status + '). Please try again or reduce camera resolution.');
        return;
      }

      const data = await res.json();
      if (data.success) {
        onCaptureComplete(filename);
      } else {
        alert('Upload failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (e) {
      console.error('Upload error:', e);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onCancel} className="bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700">
          <X className="w-6 h-6" />
        </button>
      </div>

      {!dataUri ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <Camera
            onTakePhotoAnimationDone={handleTakePhotoAnimationDone}
            idealFacingMode={facingMode}
            isMaxResolution={false}
            imageCompression={0.8}
            isImageMirror={facingMode === FACING_MODES.USER}
          />
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-4 bg-slate-900 bg-opacity-50 p-4 rounded-full">
            <button
              onClick={handleToggleCamera}
              className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-full flex items-center justify-center transition-colors shadow-lg"
              title="Switch Camera"
            >
              <SwitchCamera className="w-8 h-8" />
            </button>
            {/* The default Camera component already has a snap button, but we add custom controls next to it */}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
          <h2 className="text-white text-2xl font-bold">Preview</h2>
          <img src={dataUri} alt="Captured Monster" className="max-h-[60vh] max-w-full object-contain rounded border-2 border-slate-600 shadow-xl" />

          <div className="flex gap-4">
            <button
              onClick={() => setDataUri(null)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
              disabled={isUploading}
            >
              <CameraIcon className="w-5 h-5" /> Retake
            </button>
            <button
              onClick={handleUpload}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
              disabled={isUploading}
            >
              <Upload className="w-5 h-5" />
              {isUploading ? 'Uploading...' : 'Use This Image'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
