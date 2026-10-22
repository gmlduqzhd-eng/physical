import {
 Satellite,CloudSun,AudioLines,Pause,KeyRound,Search,Bot,RadioTower,BatteryPlus,Snowflake,
 ArrowLeftRight,Workflow,ShieldCheck,Undo2,Vault,Magnet,Scale,Mail,Compass,Layers,
 Focus,Hand,Fence,FoldHorizontal,Split,Flashlight,LocateFixed,FlipHorizontal2,Clapperboard,Quote,
 Drum,Snail,Grid2X2Plus,Flag,PackageOpen,Music2,MessagesSquare,CirclePause,Shapes,Palette,
 Footprints,Map,TrainFront,Send,Ruler,Signpost,MoveHorizontal,DoorOpen,Navigation,Orbit,
 Route,Construction,Factory,RefreshCw,PiggyBank,BatteryCharging,ClipboardCheck,Cog,Gauge,Combine,
 Sigma,SlidersHorizontal,RotateCcw,HeartHandshake,UsersRound,Network,Settings,Link,LifeBuoy,ListOrdered,
 Puzzle,ChartNoAxesColumnIncreasing,Spline,CircleDashed,Speech,AlarmClock,LockKeyhole,Handshake,GitFork,ListChecks,
 ListFilter,GitMerge,Repeat2,PencilRuler,BetweenHorizontalStart,Calculator,PersonStanding,Stars,Coffee,ScanSearch,
 CloudSunRain,Flower2,Waves,Wind,Heart,Feather,HandHeart,Eye,WavesArrowDown,BookmarkCheck,
} from 'lucide-react';
import {PHONE_PLAY_BY_ID} from '../../domain/phonePlayCatalog';
import './PhonePlayIcon.css';

// Explicit imports keep the icon library tree-shakable. Never load it by an arbitrary name.
const icons={
 Satellite,CloudSun,AudioLines,Pause,KeyRound,Search,Bot,RadioTower,BatteryPlus,Snowflake,
 ArrowLeftRight,Workflow,ShieldCheck,Undo2,Vault,Magnet,Scale,Mail,Compass,Layers,
 Focus,Hand,Fence,FoldHorizontal,Split,Flashlight,LocateFixed,FlipHorizontal2,Clapperboard,Quote,
 Drum,Snail,Grid2X2Plus,Flag,PackageOpen,Music2,MessagesSquare,CirclePause,Shapes,Palette,
 Footprints,Map,TrainFront,Send,Ruler,Signpost,MoveHorizontal,DoorOpen,Navigation,Orbit,
 Route,Construction,Factory,RefreshCw,PiggyBank,BatteryCharging,ClipboardCheck,Cog,Gauge,Combine,
 Sigma,SlidersHorizontal,RotateCcw,HeartHandshake,UsersRound,Network,Settings,Link,LifeBuoy,ListOrdered,
 Puzzle,ChartNoAxesColumnIncreasing,Spline,CircleDashed,Speech,AlarmClock,LockKeyhole,Handshake,GitFork,ListChecks,
 ListFilter,GitMerge,Repeat2,PencilRuler,BetweenHorizontalStart,Calculator,PersonStanding,Stars,Coffee,ScanSearch,
 CloudSunRain,Flower2,Waves,Wind,Heart,Feather,HandHeart,Eye,WavesArrowDown,BookmarkCheck,
};

// Decorative next to the game's visible title; it must not repeat the title to screen readers.
export function PhonePlayIcon({gameType,size=30,dark=false,className=''}:{gameType:string;size?:number;dark?:boolean;className?:string}){
 const play=PHONE_PLAY_BY_ID.get(gameType);
 if(!play)return null;
 const Icon=icons[play.icon];
 return <span className={`phone-play-icon ${className}`} data-phone-icon={gameType} data-icon-name={play.icon} data-category={play.category} data-dark={dark||undefined} aria-hidden="true" style={{width:size,height:size}}><Icon size={size} strokeWidth={2}/></span>;
}
