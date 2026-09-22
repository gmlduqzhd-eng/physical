import {
  BreathPacer478,
  PeripheralVision360,
  ShuttleRunBeep,
  MobilityJointCircle,
  FootCenterBalance,
  AgilityDotDrill,
  EccentricIsomPush,
  PostureSpineAlign,
  PulseZoneTarget,
  CrossLateralBrain,
} from './ExerciseGames';

import {
  WindArcheryPro,
  VolleyballApexSet,
  StrikeZoneVision,
  OffsideBreakerPass,
  BadmintonDropClear,
  BasketballFreeThrow,
  CurlingWeightControl,
  TaekwondoCounterKick,
  TabletennisSpinRead,
  BaseballBuntDefense,
} from './SportsGames';

import {
  CprCompression110,
  AedDefibrillatorPad,
  WaterRescueThrow,
  HeatwavePm25Shield,
  RiceTreatmentFirstaid,
  StepMania4Lane,
  ShadowPoseSculpture,
  RibbonWaveStream,
  EmotionFreezeMime,
  PartnerMirrorDuet,
} from './ExpressionSafetyGames';

interface CurriculumGameRouterProps {
  gameType: string;
  groupId: string;
  enqueueAction: (action: any) => void;
  onExit?: () => void;
}

export const CurriculumGameRouter = ({
  gameType,
  groupId,
  enqueueAction,
  onExit,
}: CurriculumGameRouterProps) => {
  const props = { groupId, enqueueAction, onExit };

  switch (gameType) {
    // [1] 운동 영역 (10종)
    case 'breath-pacer-478':
      return <BreathPacer478 {...props} />;
    case 'peripheral-vision-360':
      return <PeripheralVision360 {...props} />;
    case 'shuttle-run-beep':
      return <ShuttleRunBeep {...props} />;
    case 'mobility-joint-circle':
      return <MobilityJointCircle {...props} />;
    case 'foot-center-balance':
      return <FootCenterBalance {...props} />;
    case 'agility-dot-drill':
      return <AgilityDotDrill {...props} />;
    case 'eccentric-isom-push':
      return <EccentricIsomPush {...props} />;
    case 'posture-spine-align':
      return <PostureSpineAlign {...props} />;
    case 'pulse-zone-target':
      return <PulseZoneTarget {...props} />;
    case 'cross-lateral-brain':
      return <CrossLateralBrain {...props} />;

    // [2] 스포츠 영역 (10종)
    case 'wind-archery-pro':
      return <WindArcheryPro {...props} />;
    case 'volleyball-apex-set':
      return <VolleyballApexSet {...props} />;
    case 'strike-zone-vision':
      return <StrikeZoneVision {...props} />;
    case 'offside-breaker-pass':
      return <OffsideBreakerPass {...props} />;
    case 'badminton-drop-clear':
      return <BadmintonDropClear {...props} />;
    case 'basketball-free-throw':
      return <BasketballFreeThrow {...props} />;
    case 'curling-weight-control':
      return <CurlingWeightControl {...props} />;
    case 'taekwondo-counter-kick':
      return <TaekwondoCounterKick {...props} />;
    case 'tabletennis-spin-read':
      return <TabletennisSpinRead {...props} />;
    case 'baseball-bunt-defense':
      return <BaseballBuntDefense {...props} />;

    // [3] 표현 및 안전 영역 (10종)
    case 'cpr-compression-110':
      return <CprCompression110 {...props} />;
    case 'aed-defibrillator-pad':
      return <AedDefibrillatorPad {...props} />;
    case 'water-rescue-throw':
      return <WaterRescueThrow {...props} />;
    case 'heatwave-pm25-shield':
      return <HeatwavePm25Shield {...props} />;
    case 'rice-treatment-firstaid':
      return <RiceTreatmentFirstaid {...props} />;
    case 'step-mania-4lane':
      return <StepMania4Lane {...props} />;
    case 'shadow-pose-sculpture':
      return <ShadowPoseSculpture {...props} />;
    case 'ribbon-wave-stream':
      return <RibbonWaveStream {...props} />;
    case 'emotion-freeze-mime':
      return <EmotionFreezeMime {...props} />;
    case 'partner-mirror-duet':
      return <PartnerMirrorDuet {...props} />;

    default:
      return null;
  }
};
