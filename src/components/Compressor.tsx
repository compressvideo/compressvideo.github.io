import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  FileVideo,
  Play,
  Download,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  Zap,
  MessageSquare,
  AlertCircle,
  Clock,
  HardDrive,
  Maximize2
} from 'lucide-react';
import { ui, defaultLang, type LanguageKey } from '../i18n/ui';

interface CompressorProps {
  lang?: LanguageKey;
}

export default function Compressor({ lang = defaultLang }: CompressorProps) {
  const t = (key: keyof (typeof ui)[typeof defaultLang]): string => {
    return ui[lang]?.[key] || ui[defaultLang][key] || key;
  };

  // State
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);

  const [preset, setPreset] = useState<'smart' | 'discord' | 'whatsapp' | 'custom'>('smart');
  const [customCrf, setCustomCrf] = useState<number>(28);
  const [customScale, setCustomScale] = useState<'original' | '1080' | '720' | '480'>('original');

  const [status, setStatus] = useState<'idle' | 'loading' | 'compressing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Clean up object URLs and FFmpeg instance on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      if (ffmpegRef.current) {
        try {
          ffmpegRef.current.terminate();
        } catch (e) {
          // ignore cleanup error
        }
      }
    };
  }, [videoPreviewUrl, compressedUrl]);

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle file selection with validation
  const handleFile = (selectedFile: File) => {
    // 1. Format validation
    const isValidFormat =
      selectedFile.type.startsWith('video/') ||
      selectedFile.name.match(/\.(mp4|mov|webm|avi|mkv|flv|wmv|m4v)$/i);

    if (!isValidFormat) {
      setStatus('error');
      setErrorMessage('Unsupported file format. Please upload a valid video file (MP4, MOV, WebM, AVI, or MKV).');
      return;
    }

    // 2. Browser WebAssembly 2GB memory boundary validation
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File exceeds 2GB. Standard browser WebAssembly virtual memory cannot allocate files larger than 2GB. Please choose a smaller video.');
      return;
    }

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);

    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setVideoPreviewUrl(url);
    setStatus('idle');
    setProgress(0);
    setCompressedBlob(null);
    setCompressedUrl(null);
    setCompressedSize(null);
    setErrorMessage(null);

    // Read video metadata (duration & resolution)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setVideoResolution({ width: video.videoWidth, height: video.videoHeight });
    };
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Load FFmpeg instance
  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current && ffmpegRef.current.loaded) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress: p }) => {
      const percentage = Math.min(Math.round(p * 100), 99);
      setProgress(percentage);
      setProgressText(`${percentage}%`);
    });

    setProgressText(t('tool.loadingEngine'));
    setStatus('loading');

    // Using unpkg single-threaded ffmpeg-core 0.12.6 for rock-solid stability across all browsers
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
  };

  // Execute Compression
  const handleCompress = async () => {
    if (!file) return;

    try {
      setStatus('loading');
      setErrorMessage(null);
      setProgress(0);

      const ffmpeg = await loadFFmpeg();

      setStatus('compressing');
      setProgressText(t('tool.processingFrames'));

      const inputName = 'input_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const outputName = 'output.mp4';

      // Write input file to FFmpeg virtual file system
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Build FFmpeg command arguments based on preset
      const args: string[] = ['-i', inputName];

      if (preset === 'smart') {
        // Smart balance: CRF 28, fast preset, high efficiency
        args.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '28',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart'
        );
      } else if (preset === 'discord') {
        // Target < 25MB (aim for ~22MB to ensure safety margin)
        let targetBitrate = 1200;
        if (videoDuration > 0) {
          const targetBytes = 22 * 1024 * 1024;
          const calculatedKbits = Math.floor((targetBytes * 8) / videoDuration / 1000) - 96;
          targetBitrate = Math.max(300, Math.min(calculatedKbits, 2500));
        }

        args.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', `${targetBitrate}k`,
          '-maxrate', `${Math.floor(targetBitrate * 1.3)}k`,
          '-bufsize', `${Math.floor(targetBitrate * 2)}k`,
          '-vf', 'scale=-2:\'min(720,ih)\'',
          '-c:a', 'aac',
          '-b:a', '96k',
          '-movflags', '+faststart'
        );
      } else if (preset === 'whatsapp') {
        // Target < 16MB (aim for ~14MB)
        let targetBitrate = 900;
        if (videoDuration > 0) {
          const targetBytes = 14 * 1024 * 1024;
          const calculatedKbits = Math.floor((targetBytes * 8) / videoDuration / 1000) - 64;
          targetBitrate = Math.max(250, Math.min(calculatedKbits, 1800));
        }

        args.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', `${targetBitrate}k`,
          '-vf', 'scale=-2:\'min(480,ih)\'',
          '-c:a', 'aac',
          '-b:a', '64k',
          '-movflags', '+faststart'
        );
      } else if (preset === 'custom') {
        // Custom CRF and resolution scale
        let scaleFilter = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
        if (customScale === '1080') scaleFilter = 'scale=-2:\'min(1080,ih)\'';
        else if (customScale === '720') scaleFilter = 'scale=-2:\'min(720,ih)\'';
        else if (customScale === '480') scaleFilter = 'scale=-2:\'min(480,ih)\'';

        args.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', customCrf.toString(),
          '-vf', scaleFilter,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart'
        );
      }

      args.push(outputName);

      // Run FFmpeg command
      await ffmpeg.exec(args);

      // Read compressed file
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      setCompressedBlob(blob);
      setCompressedUrl(url);
      setCompressedSize(blob.size);
      setProgress(100);
      setStatus('completed');

      // Clean up files in FFmpeg memory
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (e) {
        // ignore cleanup error
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10B981', '#34D399', '#059669', '#6EE7B7'],
      });
    } catch (err: any) {
      console.error('Compression error:', err);
      setStatus('error');
      const errStr = String(err?.message || err).toLowerCase();
      if (
        errStr.includes('oom') ||
        errStr.includes('memory') ||
        errStr.includes('rangeerror') ||
        errStr.includes('abort')
      ) {
        setErrorMessage(
          'Device memory limit reached. This video exceeds available browser RAM. Try selecting a lower resolution (720p/480p) or a shorter clip.'
        );
      } else {
        setErrorMessage(err?.message || t('tool.error'));
      }
    }
  };

  // Reset tool
  const handleReset = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setFile(null);
    setVideoPreviewUrl(null);
    setCompressedBlob(null);
    setCompressedUrl(null);
    setCompressedSize(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
  };

  // Calculate percentage saved
  const percentageSaved =
    file && compressedSize ? Math.round(((file.size - compressedSize) / file.size) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Upload Error Banner (e.g. invalid format or >2GB) */}
      {!file && status === 'error' && errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-300">
              <p className="font-semibold">{t('tool.error')}</p>
              <p className="text-xs mt-0.5 text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone (when no file selected) */}
      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
          } shadow-soft dark:shadow-soft-dark`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="video/*,.mp4,.mov,.webm,.avi,.mkv"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {t('tool.dropTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('tool.dropSubtitle')}
              </p>
            </div>

            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{t('tool.dropFormats')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Loaded & Processing UI */}
      {file && (
        <div className="space-y-6">
          {/* Video Overview Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-soft dark:shadow-soft-dark flex flex-col md:flex-row items-center gap-5">
            {videoPreviewUrl && (
              <div className="relative w-full md:w-56 h-36 rounded-2xl overflow-hidden bg-slate-950 flex-shrink-0 shadow-inner">
                <video
                  src={videoPreviewUrl}
                  controls={false}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[11px] font-mono">
                  {formatDuration(videoDuration)}
                </div>
              </div>
            )}

            <div className="flex-1 w-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-white truncate text-base">
                    {file.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      {formatBytes(file.size)}
                    </span>
                    {videoResolution && (
                      <span className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" />
                        {videoResolution.width} × {videoResolution.height}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(videoDuration)}
                    </span>
                  </div>
                </div>

                {status !== 'compressing' && status !== 'loading' && (
                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={t('tool.changeVideo')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status & Compression Summary */}
              {status === 'completed' && compressedSize && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {t('tool.complete')}
                    </span>
                    <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      {formatBytes(file.size)} → {formatBytes(compressedSize)}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-xs">
                    {percentageSaved > 0 ? `-${percentageSaved}% ${t('tool.saved')}` : 'Optimized'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preset Selector (Only shown before compression or when completed) */}
          {status !== 'compressing' && status !== 'loading' && status !== 'completed' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-soft dark:shadow-soft-dark space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('tool.presetTitle')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Smart Balance */}
                <button
                  type="button"
                  onClick={() => setPreset('smart')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    preset === 'smart'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      {t('tool.presetSmart')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('tool.presetSmartDesc')}
                  </p>
                </button>

                {/* Discord / Email */}
                <button
                  type="button"
                  onClick={() => setPreset('discord')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    preset === 'discord'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {t('tool.presetDiscord')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('tool.presetDiscordDesc')}
                  </p>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => setPreset('whatsapp')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    preset === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      {t('tool.presetWhatsapp')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('tool.presetWhatsappDesc')}
                  </p>
                </button>
              </div>

              {/* Custom Accordion Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPreset(preset === 'custom' ? 'smart' : 'custom')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t('tool.presetCustom')}</span>
                </button>

                {preset === 'custom' && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          {t('tool.qualityLabel')} (CRF: {customCrf})
                        </label>
                        <span className="text-slate-400">
                          {customCrf <= 23
                            ? t('tool.qualityHigh')
                            : customCrf <= 29
                            ? t('tool.qualityMedium')
                            : t('tool.qualityLow')}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="18"
                        max="38"
                        step="1"
                        value={customCrf}
                        onChange={(e) => setCustomCrf(parseInt(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('tool.resolutionLabel')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['original', '1080', '720', '480'] as const).map((scale) => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setCustomScale(scale)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                              customScale === scale
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {scale === 'original' ? t('tool.resOriginal') : `${scale}p`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCompress}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t('tool.compressBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Compression Progress */}
          {(status === 'loading' || status === 'compressing') && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-soft dark:shadow-soft-dark space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {status === 'loading' ? t('tool.loadingEngine') : t('tool.compressing')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {progressText}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>
            </div>
          )}

          {/* Completed Download & Preview Screen */}
          {status === 'completed' && compressedUrl && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-soft dark:shadow-soft-dark space-y-6">
              {/* Preview Player */}
              <div className="rounded-2xl overflow-hidden bg-black max-h-96 flex items-center justify-center">
                <video
                  src={compressedUrl}
                  controls
                  playsInline
                  className="max-h-96 w-auto mx-auto"
                />
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={compressedUrl}
                  download={`compressed_${file.name.replace(/\.[^/.]+$/, '')}.mp4`}
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>{t('tool.downloadBtn')}</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('tool.compressAnother')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {status === 'error' && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold">{t('tool.error')}</p>
                {errorMessage && <p className="text-xs mt-1 text-red-600 dark:text-red-400">{errorMessage}</p>}
                <button
                  onClick={handleCompress}
                  className="mt-2 text-xs font-bold underline hover:no-underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
