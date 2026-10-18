import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, X, Camera, Keyboard, AlertCircle, CheckCircle } from 'lucide-react';
import { validateRetailBarcode } from '../../lib/calculations';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  title = 'Scan Retail Barcode',
}) => {
  const [manualInput, setManualInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Focus manual input automatically
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setInputError(null);
      setManualInput('');
      setLastScanned(null);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access not granted or unavailable:', err);
      setInputError('Camera unavailable. You can use a USB Barcode Scanner or type the digits below.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualInput.trim();
    if (!clean) {
      setInputError('Please enter barcode digits.');
      return;
    }

    const validation = validateRetailBarcode(clean);
    if (!validation.isValid && clean.length < 3) {
      setInputError('Invalid barcode format. Expected EAN-13, EAN-8, UPC-A, UPC-E, or Code 128.');
      return;
    }

    setLastScanned(clean);
    onBarcodeDetected(clean);
    onClose();
  };

  // Keyboard wedge listener (scanners behave like fast typing ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on the input field, let native handling happen
      if (document.activeElement === inputRef.current) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ''; // Reset if typing is human speed
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          onBarcodeDetected(buffer);
          onClose();
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onBarcodeDetected, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-[#E87512]" />
            <h3 className="font-semibold text-neutral-800 text-sm">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Hardware Scanner Prompt */}
          <div className="bg-[#FDF3E7] border border-[#E87512]/30 rounded-lg p-3 text-xs text-neutral-800 flex items-start gap-2.5">
            <Keyboard className="w-4 h-4 text-[#E87512] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">USB / Bluetooth Scanner Ready</p>
              <p className="text-neutral-600 mt-0.5">
                Scan any physical barcode now using your handheld scanner gun. The code will be captured automatically.
              </p>
            </div>
          </div>

          {/* Camera Viewport Option */}
          {isCameraActive ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-neutral-300">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-2 border-red-500 rounded-sm pointer-events-none opacity-80" />
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white px-2.5 py-1 text-xs rounded transition-colors"
              >
                Turn off camera
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-2.5 px-3 border border-neutral-200 hover:border-[#E87512] bg-neutral-50 hover:bg-[#FDF3E7]/40 rounded-lg text-xs font-semibold text-neutral-700 flex items-center justify-center gap-2 transition-all"
            >
              <Camera className="w-4 h-4 text-neutral-500" />
              <span>Use Device Camera Scanner</span>
            </button>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label htmlFor="manual-barcode-input" className="block text-xs font-medium text-neutral-700 mb-1">
                Or type / paste barcode digits (preserving leading zeros):
              </label>
              <div className="relative">
                <input
                  id="manual-barcode-input"
                  ref={inputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    setInputError(null);
                  }}
                  placeholder="e.g. 4006381333931 or AFR-SKU-9021"
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded focus:ring-1 focus:ring-[#E87512] focus:border-[#E87512] outline-none"
                />
              </div>
            </div>

            {inputError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}

            {lastScanned && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Detected: <strong className="font-mono">{lastScanned}</strong></span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-3.5 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#E87512] hover:bg-[#C96009] text-white text-xs font-semibold rounded transition-colors"
              >
                Confirm Barcode
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
