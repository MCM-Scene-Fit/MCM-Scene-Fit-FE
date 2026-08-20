import { useEffect, useRef, useState } from 'react'
import type { BodyProfile } from '../types'
import { HumanSilhouette } from './HumanSilhouette'

type CameraCaptureProps = {
  body: BodyProfile
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * 카메라를 열고, 실루엣 가이드에 맞춰 서면 그 자리에서 바로 찍는다.
 * 찍은 사진은 파일 선택으로 올린 것과 똑같이 취급된다 — 이후 자세 인식·경고는
 * 그 파이프라인을 그대로 탄다.
 */
export function CameraCapture({ body, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')

  useEffect(() => {
    let cancelled = false
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 카메라를 지원하지 않습니다. 사진을 올려 주세요.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setError('카메라를 열 수 없습니다. 권한을 허용했는지 확인해 주세요.'))
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [facing])

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth <= 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    if (facing === 'user') {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], 'capture.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="camera-modal" role="dialog" aria-modal="true" aria-label="사진 촬영">
      <div className="camera-stage">
        {error ? (
          <p className="camera-error">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-video ${facing === 'user' ? 'is-mirrored' : ''}`}
            />
            <div className="camera-guide">
              <HumanSilhouette
                heightCm={body.heightCm}
                build={body.build}
                showGround={false}
                tone="ghost"
              />
            </div>
          </>
        )}
      </div>

      <p className="camera-hint">가이드 안에 맞춰 정면으로 서 주세요. 팔은 자연스럽게 내려 주세요.</p>

      <div className="camera-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="camera-flip"
          aria-label="카메라 전환"
          onClick={() => setFacing((current) => (current === 'user' ? 'environment' : 'user'))}
        >
          ⟳
        </button>
        <button type="button" className="btn btn-primary" onClick={capture} disabled={Boolean(error)}>
          촬영
        </button>
      </div>
    </div>
  )
}
