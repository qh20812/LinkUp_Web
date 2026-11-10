/**
 * Bật xử lý âm thanh của trình duyệt cho cuộc gọi: khử vọng, giảm ồn và tự
 * động ổn định âm lượng. Dùng chung cho call 1-1 và group call.
 */
export const CALL_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}
