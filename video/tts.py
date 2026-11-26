"""내레이션 음성 만들기: scenes.json의 문장마다 mp3를 만들고 길이를 out/voice/durations.json에 적는다.

    python3 video/tts.py            # 없는 것만 만든다
    python3 video/tts.py --force    # 모두 다시 만든다

gTTS(구글 번역 음성)를 쓰고, ffmpeg atempo로 조금 빠르게(기본 1.12배) 다듬는다.
다른 음성(직접 녹음 등)을 쓰려면 out/voice/<shot>-<n>.wav 를 같은 이름으로 넣고 --keep 으로 돌린다.
"""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out' / 'voice'
spec = json.loads((ROOT / 'scenes.json').read_text())
tempo = spec['voice'].get('tempo', 1.0)
force = '--force' in sys.argv
OUT.mkdir(parents=True, exist_ok=True)


def duration(path: Path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


SAY = spec['voice'].get('say', {})


def spoken(text: str) -> str:
    # 자막은 그대로 두고, 읽을 때만 바꾼다(예: TV → 티브이, QR → 큐알).
    text = ' '.join(text.replace('|', ' ').split())   # 자막 줄바꿈 표시(|)는 읽지 않는다
    for a, b in SAY.items():
        text = text.replace(a, b)
    return text


def synth(text: str, wav: Path) -> None:
    text = spoken(text)
    raw = wav.with_suffix('.raw.mp3')
    v = spec['voice']
    if v.get('engine') == 'openai':
        # OpenAI 음성. 키는 작업 환경의 네트워크 비밀값으로 프록시가 넣어 준다(코드에는 키가 없다).
        body = json.dumps({'model': v.get('model', 'gpt-4o-mini-tts'), 'voice': v.get('voice', 'coral'), 'input': text,
                           'instructions': v.get('instructions', ''), 'response_format': 'mp3'}, ensure_ascii=False)
        r = subprocess.run(['curl', '-s', '-f', '-o', str(raw), 'https://api.openai.com/v1/audio/speech',
                            '-H', 'Authorization: Bearer proxy-injected', '-H', 'Content-Type: application/json', '--data-binary', body],
                           capture_output=True, text=True)
        if r.returncode or not raw.exists():
            raise SystemExit(f'OpenAI 음성 실패({r.returncode}): {text}')
    else:
        from gtts import gTTS
        gTTS(text, lang=v.get('lang', 'ko')).save(str(raw))
    # 앞뒤 무음을 자르고, 속도를 다듬고, 48kHz 모노 wav로 맞춘다.
    # 앞뒤 무음은 부드럽게만 자른다(-55dB, 숨소리·첫소리 60ms 남김) → 아주 짧게 페이드 → 문장마다 같은 크기(-20 LUFS)로.
    trim = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.06"
    filt = f"{trim},areverse,{trim},areverse,atempo={tempo},afade=t=in:d=0.012,areverse,afade=t=in:d=0.03,areverse"
    tmp = wav.with_suffix('.tmp.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', filt, '-ar', '48000', '-ac', '1', str(tmp)], check=True)
    raw.unlink()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'loudnorm=I=-20:TP=-3:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    ln = (f"loudnorm=I=-20:TP=-3:LRA=7:linear=true:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', ln, '-ar', '48000', '-ac', '1', str(wav)], check=True)
    tmp.unlink()


durations = {}
total = 0.0
for scene in spec['scenes']:
    for shot in scene['shots']:
        for i, line in enumerate(shot.get('lines', [])):
            key = f"{shot['id']}-{i}"
            wav = OUT / f'{key}.wav'
            stamp = OUT / f'{key}.txt'
            digest = hashlib.sha1(f"{spoken(line)}|{tempo}|{spec['voice'].get('engine')}|{spec['voice'].get('voice')}|{spec['voice'].get('instructions')}|v2".encode()).hexdigest()
            stale = not wav.exists() or not stamp.exists() or stamp.read_text() != digest
            if force or (stale and '--keep' not in sys.argv):
                synth(line, wav)
                stamp.write_text(digest)
            d = duration(wav)
            durations[key] = {'text': line, 'sec': round(d, 3)}
            total += d
(OUT / 'durations.json').write_text(json.dumps(durations, ensure_ascii=False, indent=1))
print(f'{len(durations)} lines, narration {total:.1f}s')
