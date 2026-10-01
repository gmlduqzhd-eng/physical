/**
 * 체육 활동 센서 데이터 안티 치팅(Anti-Cheat) & 지터 제거 필터
 * 단순 손목 털기(고주파 노이즈)를 방지하고 생체역학적으로 유효한 동작만 인정합니다.
 */

export interface MotionFilterConfig {
  minIntervalMs: number;       // 동일 동작 재인식 최소 간격 (예: 점프 최소 350ms, 스쿼트 최소 800ms)
  threshold: number;           // 가속도 벡터 변화량 최소 임계값
  maxFrequencyPerSec?: number; // 1초당 최대 허용 횟수 (초과 시 흔들기 편법으로 감지)
}

export class BiomechanicalMotionDetector {
  private lastTriggerTime: number = 0;
  private actionTimestamps: number[] = [];
  private baselineAccel: number = 9.8;
  private config: MotionFilterConfig;

  constructor(config: MotionFilterConfig) {
    this.config = config;
  }

  /**
   * 3축 가속도 값을 바탕으로 유효한 신체 동작인지 검증합니다.
   * @param x 가속도 X
   * @param y 가속도 Y
   * @param z 가속도 Z
   * @returns 유효 동작 여부
   */
  public evaluateMotion(x: number, y: number, z: number): { isValid: boolean; reason?: 'too_fast' | 'weak' | 'cheat_shake' } {
    const now = performance.now();
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // 지수 이동 평균으로 기저선(중력 성분) 보정
    this.baselineAccel = this.baselineAccel * 0.9 + magnitude * 0.1;
    const delta = Math.abs(magnitude - this.baselineAccel);

    // 1. 최소 가속도 변화량 미달 (너무 약한 미동)
    if (delta < this.config.threshold) {
      return { isValid: false, reason: 'weak' };
    }

    // 2. 물리적 최소 주기 미달 (생체역학적으로 불가능한 속도)
    if (now - this.lastTriggerTime < this.config.minIntervalMs) {
      return { isValid: false, reason: 'too_fast' };
    }

    // 3. 1초 내 과도한 빈도 검증 (손목만 고속으로 흔드는 치팅 감지)
    const maxFreq = this.config.maxFrequencyPerSec || 4;
    this.actionTimestamps = this.actionTimestamps.filter(t => now - t < 1000);
    if (this.actionTimestamps.length >= maxFreq) {
      return { isValid: false, reason: 'cheat_shake' };
    }

    // 유효한 동작으로 승인
    this.lastTriggerTime = now;
    this.actionTimestamps.push(now);
    return { isValid: true };
  }

  public reset() {
    this.lastTriggerTime = 0;
    this.actionTimestamps = [];
    this.baselineAccel = 9.8;
  }
}
