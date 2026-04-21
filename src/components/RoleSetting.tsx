import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

interface RoleSettingProps {
  onBack: () => void;
}

export default function RoleSetting({ onBack }: RoleSettingProps) {
  const { roles, setRoles, selectedRoleId, setSelectedRoleId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [picTimestamp, setPicTimestamp] = useState<number>(Date.now());
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Fetch user profile for nickname and ID
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setNickname(data.profile?.nickname || data.user?.name || 'Player');
          setUserId(data.user?.id || '');
        }
      })
      .catch(err => console.error('Failed to fetch profile:', err));

    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoles(data);
          // Set default if none selected or if current selection is invalid
          if (data.length > 0) {
            const isValid = data.find(r => r.id === selectedRoleId);
            if (!selectedRoleId || !isValid) {
              setSelectedRoleId(data[0].id);
            }
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch roles:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectRole = (id: string) => {
    setSelectedRoleId(id);
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    setIsSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() })
      });
      // Allow a brief show of success or just stop saving state
      setTimeout(() => setIsSaving(false), 500);
    } catch (e) {
      console.error('Failed to save nickname', e);
      setIsSaving(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setShowCamera(true);
      setSnapshot(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('無法存取相機，請確認權限設定');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const takeAndUploadSnapshot = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // Mirror the canvas context so the saved image matches the video preview
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setSnapshot(dataUrl);

        setIsSaving(true);
        try {
          await fetch('/api/user/selfie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: dataUrl })
          });
          setPicTimestamp(Date.now());
          stopCamera();
        } catch (e) {
          console.error('Failed to save selfie', e);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [cameraStream]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
      <div className="max-w-2xl w-full bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            角色設定
          </h1>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
          >
            返回
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-white">玩家暱稱</h2>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:border-purple-500 text-lg text-white"
                placeholder="輸入您的暱稱..."
              />
              <button
                onClick={handleSaveNickname}
                disabled={isSaving || !nickname.trim()}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-slate-700 rounded-xl font-bold text-lg transition-colors"
              >
                {isSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-2">此暱稱將在 RPG 模式及戰鬥中顯示給其他玩家看。</p>
          </div>

          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-white w-full text-left">照片</h2>
            <div className="mb-4 relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-600 bg-slate-800 flex items-center justify-center">
              {userId ? (
                <img
                  src={`/assets/players_pic/${userId}.png?t=${picTimestamp}`}
                  alt="Player Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/players/character.png'; // Fallback
                  }}
                />
              ) : (
                <span className="text-slate-500 text-sm">無照片</span>
              )}
            </div>
            <button
              onClick={startCamera}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-colors"
            >
              拍照
            </button>
          </div>
        </div>

        {showCamera && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-6 rounded-3xl max-w-md w-full flex flex-col items-center">
              <h2 className="text-2xl font-bold mb-4 text-white">拍攝大頭貼</h2>

              <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center">
                {!snapshot ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    onPlay={() => {
                      if (videoRef.current) {
                        videoRef.current.style.transform = "scaleX(-1)";
                      }
                    }}
                  ></video>
                ) : (
                  <img src={snapshot} alt="Snapshot" className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={stopCamera}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 rounded-xl font-bold"
                >
                  取消
                </button>
                <button
                  onClick={takeAndUploadSnapshot}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? '上傳中...' : '拍照並上傳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 animate-pulse text-slate-400">載入中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-10">
                目前沒有可用的角色。
              </div>
            ) : (
              roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role.id)}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all transform hover:scale-[1.02] ${
                    selectedRoleId === role.id
                      ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  {selectedRoleId === role.id && (
                    <div className="absolute top-4 right-4 text-pink-500 font-bold bg-pink-500/20 px-3 py-1 rounded-full text-sm">
                      已選擇
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-4">{role.name}</h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 mb-2">走路圖</span>
                      <img
                        src={`/assets/players/${role.role_walk_sprite}`}
                        alt="Walk Sprite"
                        className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-2"
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = '/assets/players/character.png';
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 mb-2">攻擊圖</span>
                      <img
                        src={`/assets/players/${role.role_atk_sprite}`}
                        alt="Attack Sprite"
                        className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-2"
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = '/assets/players/character_atk.png';
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
