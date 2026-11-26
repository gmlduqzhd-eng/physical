"""직접 녹음한 내레이션을 영상용 음성으로 바꾼다.

    python3 video/ingest.py <녹음 폴더>      # 폴더 안의 <shot>-<n>.(m4a|mp3|wav) 를 out/voice/<key>.wav 로
    python3 video/tts.py --keep              # 다시 합성하지 않고 길이만 다시 잰다
    python3 video/build.py

tts.py 와 같은 손질(앞뒤 무음 자르기, 짧은 페이드, 문장마다 -20 LUFS)을 하고,
낮은 웅웅거림(70Hz 아래)만 걸러 낸다. 말 빠르기는 바꾸지 않는다.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out' / 'voice'
spec = json.loads((ROOT / 'scenes.json').read_text())
src = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

keys = [f"{s['id']}-{i}" for sc in spec['scenes'] for s in sc['shots'] for i, _ in enumerate(s.get('lines', []))]
missing = []
for key in keys:
    f = next((p for ext in ('m4a', 'mp3', 'wav', 'aac') if (p := src / f'{key}.{ext}').exists()), None)
    if not f:
        missing.append(key)
        continue
    wav = OUT / f'{key}.wav'
    tmp = OUT / f'{key}.tmp.wav'
    trim = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08"
    filt = f"highpass=f=70,{trim},areverse,{trim},areverse,afade=t=in:d=0.012,areverse,afade=t=in:d=0.04,areverse"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(f), '-af', filt, '-ar', '48000', '-ac', '1', str(tmp)], check=True)
    m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'loudnorm=I=-20:TP=-3:LRA=7:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    st = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    ln = (f"loudnorm=I=-20:TP=-3:LRA=7:linear=true:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', ln, '-ar', '48000', '-ac', '1', str(wav)], check=True)
    tmp.unlink()
    (OUT / f'{key}.txt').write_text('recorded')   # 녹음본 표시(tts.py --force 가 아니면 덮어쓰지 않는다)
print(f'{len(keys) - len(missing)}/{len(keys)} 변환', ('없음: ' + ', '.join(missing)) if missing else '')
