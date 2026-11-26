import {useClassProgress} from '../../application/classProgressStore';
import {downloadBackup} from '../../application/classBackupStore';
import {snoozeBackupNudge,totalPlaysAllClasses,useBackupMark} from '../../application/backupMarkStore';
import {playsSinceBackup,shouldNudge} from '../../domain/backupNudge';
import './ClassSwitcher.css';

const when=(at:number)=>new Date(at).toLocaleDateString('ko-KR');

/** 보관한 뒤 판이 꽤 쌓였을 때만 보이는 한 줄 알림. '나중에'를 누르면 다시 그만큼 쌓일 때까지 조용하다. */
export function BackupNudge(){
 useClassProgress(); // 판이 기록되면 다시 센다
 const mark=useBackupMark(),total=totalPlaysAllClasses();
 if(!shouldNudge(mark,total))return null;
 return <div className="class-switcher-confirm backup-nudge" role="status" data-backup-nudge>
  <p>{mark.at?`마지막 보관(${when(mark.at)}) 뒤 ${playsSinceBackup(mark,total)}판이 쌓였어요.`:`기록이 ${total}판 쌓였는데 아직 보관한 적이 없어요.`} 이 기록은 이 기기에만 있어요. 파일로 받아 둘까요?</p>
  <button type="button" className="primary" onClick={()=>downloadBackup()} data-backup-nudge-save>⬇ 기록 파일로 보관</button>
  <button type="button" onClick={snoozeBackupNudge} data-backup-nudge-later>나중에</button>
 </div>;
}
/** 기록이 어디에 있는지 한 줄(계정에 올린 적이 있으면 그때도 함께). */
export function StorageNote(){
 const mark=useBackupMark();
 return <span data-storage-note>{mark.cloudAt?`기록은 이 기기에 저장돼요. 선생님 계정에도 ${when(mark.cloudAt)}에 올린 한 벌이 있어요.`:'기록은 이 기기에만 저장돼요.'}</span>;
}
