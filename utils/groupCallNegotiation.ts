/**
 * Trạng thái thương lượng WebRTC cho một cặp peer trong cuộc gọi nhóm.
 *
 * Quy ước quan trọng: mỗi cặp chỉ có ĐÚNG MỘT bên tạo offer, chọn theo thứ tự
 * id (`shouldIOffer`). Trước đây cả hai bên đều tạo offer, còn bên nhận offer
 * thì đệm lại và không bao giờ trả lời — kết quả là không bên nào có
 * audio/video.
 */
export interface PeerNegState {
  makingOffer: boolean
  ignoreOffer: boolean
  haveRemoteDesc: boolean
  /** ICE đến trước khi có remote description, phải đợi để add sau. */
  ice: RTCIceCandidateInit[]
}

export function createNegState(): PeerNegState {
  return {
    makingOffer: false,
    ignoreOffer: false,
    haveRemoteDesc: false,
    ice: [],
  }
}

/**
 * Chỉ bên có id nhỏ hơn chủ động offer. Hàm thuần, đối xứng: với mọi cặp
 * (a, b) đúng một trong hai trả về true.
 */
export function shouldIOffer(myUserId: string, remoteUserId: string): boolean {
  return myUserId < remoteUserId
}

/** Bên không phải offerer nhường khi xảy ra glare (perfect negotiation). */
export function isPolitePeer(myUserId: string, remoteUserId: string): boolean {
  return !shouldIOffer(myUserId, remoteUserId)
}

export function bufferIce(
  state: PeerNegState,
  candidate: RTCIceCandidateInit,
): PeerNegState {
  state.ice.push(candidate)
  return state
}

/** Lấy toàn bộ ICE đang chờ và làm rỗng hàng đợi (giữ nguyên thứ tự). */
export function drainIce(state: PeerNegState): RTCIceCandidateInit[] {
  if (state.ice.length === 0) return []
  const pending = state.ice
  state.ice = []
  return pending
}
