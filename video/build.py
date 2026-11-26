"""소개 영상 합성: 장면 영상 + 내레이션 + 자막 + 배경음악 → out/intro-16x9.mp4

    python3 video/tts.py                 # 1) 내레이션 음성
    node video/record-app.mjs            # 2) 앱 화면 녹화   → out/rec/*.mp4
    node video/record-art.mjs            # 3) 그림 장면       → out/art/*.mp4, *.png
    python3 video/build.py               # 4) 합성 (본편 + 콘티 + 자막 + 섬네일)
    python3 video/build.py --short       #    세로 짧은 버전도 함께
    python3 video/build.py --only s1,s2  #    일부 장면만 시험 렌더 (out/preview.mp4)

빠진 녹화·그림은 이름이 적힌 빈 화면으로 대신 채워서, 재료가 다 없어도 끝까지 돌아간다.
"""
import json, math, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out'
SHOTS = OUT / 'shots'
spec = json.loads((ROOT / 'scenes.json').read_text())
W, H, FPS = spec['size']['w'], spec['size']['h'], spec['size']['fps']
GAP = spec.get('gapAfterLine', 0.35)


def gap_after(text):
    # 쉼표로 이어지는 말은 짧게, 문장이 끝나면 한 박자 쉬고 다음 말로.
    return 0.3 if text.rstrip().endswith(',') else 0.8
XF = 0.2            # 장면 사이 겹침(크로스페이드) 초
LEAD, TAIL = 0.3, 0.4
BG = '#faf8f2'
PAD_CAP = spec.get('padCap', 0.0)   # 장면 목표 길이를 채우려 늘리는 최대 초(0이면 늘리지 않음)
CW, CH, CX, CY = 1536, 864, 192, 96   # 영상이 들어가는 칸(나머지는 안내·자막 띠)
FONT_DIR = OUT / 'fonts'
args = sys.argv[1:]
only = next((a.split('=', 1)[1] if '=' in a else args[args.index(a) + 1] for a in args if a.startswith('--only')), None)
only = set(only.split(',')) if only else None


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.stderr.write(r.stderr[-3000:])
        raise SystemExit(f'ffmpeg 실패: {cmd[:6]}…')
    return r


def probe(path):
    r = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)])
    return float(r.stdout.strip() or 0)


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


voice = load(OUT / 'voice' / 'durations.json', {})
rec_m = load(OUT / 'rec' / 'manifest.json', {})
art_m = load(OUT / 'art' / 'manifest.json', {})


# ---------- 1. 글꼴: 앱 글꼴(Pretendard 기반 ForestSans 세 조각)을 굵게 합쳐 자막용 TTF로 ----------
def ensure_font():
    ttf = FONT_DIR / 'VidSans-Bold.ttf'
    if ttf.exists():
        return
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.merge import Merger
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    parts = []
    for sub in sorted((ROOT.parent / 'public' / 'fonts').glob('ForestSans-*.woff2')):
        f = instancer.instantiateVariableFont(TTFont(sub), {'wght': 700})
        f.flavor = None
        p = FONT_DIR / f'_{sub.stem}.ttf'
        f.save(p)
        parts.append(str(p))
    m = Merger().merge(parts)
    for rec in m['name'].names:
        if rec.nameID in (1, 16):
            rec.string = 'VidSans'
        elif rec.nameID == 4:
            rec.string = 'VidSans Bold'
        elif rec.nameID == 6:
            rec.string = 'VidSans-Bold'
    m.save(ttf)
    for p in parts:
        Path(p).unlink()


# ---------- 2. 시간표: 내레이션 길이로 컷 길이를 정하고, 장면 목표 길이에 맞춰 여유를 나눈다 ----------
def plan():
    timeline = []
    for scene in spec['scenes']:
        if only and scene['id'] not in only:
            continue
        cuts = []
        carry = 0.0
        for shot in scene['shots']:
            lines = [voice.get(f"{shot['id']}-{i}", {'sec': 2.5, 'text': t}) for i, t in enumerate(shot.get('lines', []))]
            texts = shot.get('lines', [])
            narr = sum(l['sec'] for l in lines) + sum(gap_after(x) for x in texts[:-1])
            tail = (TAIL if not texts or not texts[-1].rstrip().endswith(',') else 0.15)
            need = narr + LEAD + tail if lines else 0
            if carry:   # 앞 컷에서 넘어온 내레이션이 끝날 때까지는 이 컷을 보여 준다
                need = max(need, carry + 0.3)
            base = max(shot.get('min', 3.5 if lines else 3), need)
            carry = 0.0
            if shot.get('max') and base > shot['max']:   # 말은 다음 컷(내레이션 없는 컷)까지 이어진다
                carry = base - shot['max']
                base = shot['max']
            then = shot.get('then')
            cuts.append({**shot, 'scene': scene['id'], 'lineDur': [l['sec'] for l in lines], 'texts': texts, 'dur': base, 'narr': narr})
            if then:
                cuts.append({**then, 'id': shot['id'] + '-then', 'scene': scene['id'], 'lineDur': [], 'texts': [], 'dur': then.get('min', 3), 'narr': 0})
        extra = scene.get('target', 0) - sum(c['dur'] for c in cuts)
        if extra > 0:
            weight = sum(c['dur'] for c in cuts)
            for c in cuts:
                c['dur'] += min(PAD_CAP, extra * c['dur'] / weight)
        timeline += cuts
    t = 0.0
    for c in timeline:
        c['start'] = round(t, 3)
        c['dur'] = round(c['dur'], 3)
        t += c['dur']
    return timeline, t


# ---------- 3. 컷 하나를 영상으로 ----------
def src_rec(name):
    p = OUT / 'rec' / f'{name}.mp4'
    return p if name and p.exists() else None


def src_art(name):
    p = OUT / 'art' / f'{name}.mp4'
    return p if name and p.exists() else None


def placeholder(label, length, w=W, h=H):
    txt = label.replace(':', '\\:').replace("'", '')
    return ['-f', 'lavfi', '-t', f'{length}', '-i', f"color=c=#2b2d30:s={w}x{h}:r={FPS},drawtext=fontfile={FONT_DIR / 'VidSans-Bold.ttf'}:text='{txt}':fontcolor=#f2f1ec:fontsize=56:x=(w-tw)/2:y=(h-th)/2"]


def clip_input(path, length, label, loop, w=W, h=H, start=0.0):
    if not path:
        return placeholder(label, length, w, h)
    if loop:
        return ['-stream_loop', '-1', '-t', f'{length}', '-i', str(path)]
    return ['-ss', f'{start}', '-i', str(path)]


def render_cut(c, length):
    out = SHOTS / f"{c['id']}.mp4"
    kind = c['kind']
    ins, fc = [], []
    hold = f'tpad=stop_mode=clone:stop_duration={length + 1},trim=duration={length},setpts=PTS-STARTPTS,fps={FPS}'
    rs = c.get('recStart', 0.3)
    # 긴 녹화를 빠르게 감기. 밝은 앱 화면(커서로 짚는 녹화)은 기본 1.25배로 조금 빠르게.
    speed = c.get('speed', 1.25 if c.get('kind') == 'app' and re.match(r'(home|start|today|sports|more)-', c.get('rec') or '') else None)
    sp = f"setpts=PTS/{speed}," if speed else ''
    if c.get('skip'):   # 녹화 중간의 빈 화면(불러오는 중 등)을 잘라 낸다. 시각은 recStart 기준.
        k0, k1 = c['skip']
        sp = f"select='not(between(t\\,{k0}\\,{k1}))',setpts=N/{FPS}/TB," + sp
    if kind == 'art':
        ins += clip_input(src_art(c['art']), length, f"그림: {c['art']}", True)
        fc.append(f'[0:v]scale={W}:{H},{hold},format=yuv420p[v]')
    elif kind == 'app' and c.get('frame') == 'phone':
        frame = OUT / 'art' / 'phone-frame.png'
        scr = art_m.get('phone-frame', {}).get('screen', {'x': 780, 'y': 90, 'w': 360, 'h': 780})
        ins += ['-f', 'lavfi', '-t', f'{length}', '-i', f'color=c={BG}:s={W}x{H}:r={FPS}']
        ins += clip_input(src_rec(c['rec']), length, f"녹화: {c['rec']}", False, 540, 1170, rs)
        zr = c.get('zoomRect')   # 폰 화면의 핵심 부분(녹화 좌표)을 오른쪽에 크게 한 번 더 보여 준다
        if zr:
            fc.append(f"[1:v]{sp}split[p0][z0]")
            fc.append(f"[p0]scale={scr['w']}:{scr['h']},{hold}[p]")
            zw = 820
            zh = round(zw * zr['h'] / zr['w'] / 2) * 2
            fc.append(f"[z0]scale=498:1080,crop={zr['w']}:{zr['h']}:{zr['x']}:{zr['y']},scale={zw}:{zh},{hold},pad={zw + 8}:{zh + 8}:4:4:color=0xd8d6cc[z]")
        else:
            fc.append(f"[1:v]{sp}scale={scr['w']}:{scr['h']},{hold}[p]")
        fc.append(f"[0:v][p]overlay={scr['x']}:{scr['y']}[b]")
        last = '[b]'
        if frame.exists():
            ins += ['-loop', '1', '-t', f'{length}', '-i', str(frame)]
            fc.append('[b][2:v]overlay=0:0[bf]')
            last = '[bf]'
        if zr:
            ins += ['-f', 'lavfi', '-t', f'{length}', '-i', f'color=c={BG}:s={W}x{H}:r={FPS}']
            bi = 3 if frame.exists() else 2
            fc.append(f"[{bi}:v]{last}overlay=-420:0[sh];[sh][z]overlay=1000:(H-h)/2,format=yuv420p[v]")
        else:
            fc.append(f"{last}format=yuv420p[v]")
    elif kind == 'app':
        ins += clip_input(src_rec(c['rec']), length, f"녹화: {c['rec']}", False, start=rs)
        # 밝은 화면(홈·수업 시작·오늘 수업)은 1920 폭에서 내용이 가운데 좁게 몰리므로 조금 확대하고 위쪽에 맞춘다.
        # 그리고 아주 천천히 다가가는 움직임을 준다(정지 화면처럼 보이지 않게).
        light = re.match(r'(home|start|today|room|sports|more|solo|teacher|class|journey)-', c['rec'] or '') or c['rec'] in ('journey', 'class-tools', 'solo-demo', 'teacher-login')
        z0 = c.get('zoom', 1.0)
        # 밝은 화면은 앱 내용 열(가운데 1440×810, 위쪽부터)만 잘라 키운다. 'zoom'을 주면 그 값을 쓴다.
        fo = c.get('focus') or ({'x': 240, 'y': 0, 'w': 1440, 'h': 810} if light and 'zoom' not in c else None)
        if fo:
            sp += f"crop={fo['w']}:{fo['h']}:{fo['x']}:{fo['y']},"
            z0 = 1.0
        z = 0.035
        top = '0' if z0 > 1.0 and not fo else '(ih-oh)/2'
        fc.append(f"[0:v]{sp}scale={W}:{H},{hold},scale=w={round(W * z0 / 2) * 2}:h=-2,crop={W}:{H}:(iw-ow)/2:{top},format=yuv420p[v]")
    elif kind == 'mix':
        tv = art_m.get(c['art'], {}).get('tv', {'x': 610, 'y': 120, 'w': 700, 'h': 394})
        ins += clip_input(src_art(c['art']), length, f"그림: {c['art']}", True)
        ins += clip_input(src_rec(c['rec']), length, f"녹화: {c['rec']}", False, 1280, 720, rs)
        fc.append(f'[0:v]scale={W}:{H},{hold}[a]')
        fc.append(f"[1:v]scale={tv['w']}:{tv['h']},{hold}[r]")
        fc.append(f"[a][r]overlay={tv['x']}:{tv['y']},format=yuv420p[v]")
    elif kind == 'split':
        fm = art_m.get('split-frame', {})
        tv = fm.get('tv', {'x': 120, 'y': 190, 'w': 1120, 'h': 630})
        ph = fm.get('phone', {'x': 1380, 'y': 120, 'w': 380, 'h': 820})
        ins += ['-f', 'lavfi', '-t', f'{length}', '-i', f'color=c={BG}:s={W}x{H}:r={FPS}']
        left = src_rec(c['rec']) if c.get('rec2') else src_art(c.get('art'))
        left_label = c['rec'] if c.get('rec2') else c.get('art', '')
        right = src_rec(c['rec2']) if c.get('rec2') else src_rec(c['rec'])
        right_label = c['rec2'] if c.get('rec2') else c['rec']
        ins += clip_input(left, length, left_label, not c.get('rec2'), 1280, 720, 0 if not c.get('rec2') else rs)
        ins += clip_input(right, length, right_label, False, 540, 1170, c.get('rec2Start', rs))
        fc.append(f"[1:v]scale={tv['w']}:{tv['h']},{hold}[l]")
        fc.append(f"[2:v]scale={ph['w']}:{ph['h']},{hold}[r]")
        fc.append(f"[0:v][l]overlay={tv['x']}:{tv['y']}[b1];[b1][r]overlay={ph['x']}:{ph['y']}[b2]")
        frame = OUT / 'art' / 'split-frame.png'
        if frame.exists():
            ins += ['-loop', '1', '-t', f'{length}', '-i', str(frame)]
            fc.append('[b2][3:v]overlay=0:0,format=yuv420p[v]')
        else:
            fc.append('[b2]format=yuv420p[v]')
    else:
        raise SystemExit(f"모르는 kind: {kind}")
    # 화면 틀: 영상은 1536×864로 줄여 가운데 위에 두고, 위 띠(96)에는 안내, 아래 띠(120)에는 자막을 둔다.
    # 자막·안내가 앱 화면의 글씨를 가리지 않게 하려는 것.
    assert fc[-1].endswith('format=yuv420p[v]')
    fc[-1] = fc[-1][:-len('format=yuv420p[v]')] + 'null[vc]' if not fc[-1].endswith(',format=yuv420p[v]') else fc[-1][:-len(',format=yuv420p[v]')] + '[vc]'
    if kind == 'split':      # TV+폰 틀은 화면 그대로(이미 띠 사이에 들어감) → 작아지지 않게
        fc.append('[vc]format=yuv420p[v]')
    elif kind == 'app' and c.get('frame') == 'phone':   # 폰은 띠 사이를 꽉 채우게(폰 화면 높이 약 840)
        fc.append(f'[vc]scale=1772:996,pad={W}:{H}:74:30:color=0xfaf8f2,format=yuv420p[v]')
    else:
        fc.append(f'[vc]scale={CW}:{CH},pad={W}:{H}:{CX}:{CY}:color=0xfaf8f2,format=yuv420p[v]')
    run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', '[v]', '-t', f'{length}',
         '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', str(out)])
    return out


# ---------- 4. 자막(ASS) ----------
def ass_time(t):
    t = max(0, t)
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f'{h}:{m:02d}:{t % 60:05.2f}'


def wrap(text, limit=28):
    if '|' in text:                       # 대본에 직접 적은 줄바꿈
        return '\\N'.join(p.strip() for p in text.split('|'))
    if len(text) <= limit:
        return text
    mid = len(text) // 2
    commas = [i for i, ch in enumerate(text) if ch in ',.!?' and 8 <= i <= len(text) - 6]
    commas += [i for i in range(8, len(text) - 6) if text[i] == ' ' and text[i - 1] in '면고서는은' and not commas]
    spaces = [i for i, ch in enumerate(text) if ch == ' ']
    cut = min(commas or spaces or [mid], key=lambda i: abs(i - mid))
    return text[:cut + 1].strip() + '\\N' + text[cut + 1:].strip()


def subtitles(timeline):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narr,VidSans,44,&H00353D30,&H00353D30,&H00F2F8FA,&H00000000,1,0,0,0,100,100,0,0,1,0,0,2,200,200,10,1
Style: Cap,VidSans,38,&H00FFFFFF,&H00FFFFFF,&H004D6D56,&H00000000,1,0,0,0,100,100,0,0,3,12,0,7,200,200,26,1
Style: Badge,VidSans,36,&H00FFFFFF,&H00FFFFFF,&H00353D30,&H00000000,1,0,0,0,100,100,0,0,3,12,0,9,200,200,26,1
Style: Step,VidSans,38,&H00191817,&H00191817,&H000B9EF5,&H00000000,1,0,0,0,100,100,0,0,3,12,0,7,200,200,26,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev, srt, n = [], [], 0
    labels, label_ev = {}, []
    for c in timeline:
        s, e = c['start'], c['start'] + c['dur']
        for key, style, a0, a1 in (('caption', 'Cap', 0.3, 0.2), ('badge', 'Badge', 0.6, 0.2), ('step', 'Step', 0.2, 0.1)):
            if not c.get(key):
                continue
            prev = labels.get(style)
            if prev and prev[2] == c[key] and s - prev[1] < 1.0:   # 이어지는 컷의 같은 안내는 끊지 않고 이어서 보여 준다
                prev[1] = e - a1
            else:
                labels[style] = [s + a0, e - a1, c[key], style]
                label_ev.append(labels[style])
        t = s + LEAD
        for text, d in zip(c['texts'], c['lineDur']):
            if c.get('noSub'):          # 끝 화면처럼 자막을 띄우지 않는 컷(목소리는 그대로)
                t += d + gap_after(text)
                continue
            wt = wrap(text, 34)
            mv = 14 if '\\N' in wt else 36     # 한 줄이면 띠 가운데쯤, 두 줄이면 아래로
            ev.append(f"Dialogue: 1,{ass_time(t)},{ass_time(t + d + 0.15)},Narr,,0,0,{mv},,{wt}")
            n += 1
            st = lambda x: f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
            srt.append(f"{n}\n{st(t)} --> {st(t + d + 0.15)}\n{text.replace('|', '')}\n")
            t += d + gap_after(text)
    ev = [f"Dialogue: 0,{ass_time(a)},{ass_time(z)},{st_},,0,0,0,,{txt}" for a, z, txt, st_ in label_ev] + ev
    (OUT / 'intro.ass').write_text(head + '\n'.join(ev) + '\n')
    (OUT / 'intro-ko.srt').write_text('\n'.join(srt))


# ---------- 5. 소리: 내레이션 + 배경음악(목소리 나올 때 낮춤) + 빗소리 ----------
def audio(timeline, total):
    ins, parts, k = [], [], 0
    for c in timeline:
        t = c['start'] + LEAD
        for i, d in enumerate(c['lineDur']):
            wav = OUT / 'voice' / f"{c['id']}-{i}.wav"
            if wav.exists():
                ins += ['-i', str(wav)]
                parts.append(f'[{k}:a]adelay={int(t * 1000)}:all=1,apad=whole_dur={total}[n{k}]')
                k += 1
            t += d + gap_after(c['texts'][i])
    fc = list(parts)
    if k:
        fc.append(''.join(f'[n{i}]' for i in range(k)) + f'amix=inputs={k}:normalize=0,atrim=0:{total}[voice]')
    else:
        fc.append(f'anullsrc=r=48000:cl=mono,atrim=0:{total}[voice]')
    m = spec['music']
    music_src = (ROOT / m['src']).resolve()
    ms = next((c['start'] for c in timeline if c.get('musicStart')), 0.0)
    me = next((c['start'] + c['dur'] for c in timeline if c.get('musicEnd')), total)
    mlen = max(1.0, me - ms)
    trim, xf = m.get('trimEnd'), m.get('crossfade', 2.0)
    one = 90.0 if not trim else trim
    copies = max(1, math.ceil(mlen / (one - xf)) + 1)
    for _ in range(copies):
        ins += ['-i', str(music_src)]
    mi = k
    fc.append(''.join(f"[{mi + j}:a]atrim=0:{one},asetpts=PTS-STARTPTS[mc{j}];" for j in range(copies)).rstrip(';'))
    chain = '[mc0]'
    for j in range(1, copies):
        fc.append(f"{chain}[mc{j}]acrossfade=d={xf}:c1=tri:c2=tri[ml{j}]")
        chain = f'[ml{j}]'
    fc.append(f"{chain}anull[mloop]")
    fc.append(f"[mloop]atrim=0:{mlen},asetpts=PTS-STARTPTS,aresample=48000,volume={m['bedDb']}dB,afade=t=in:d={m['fadeIn']},afade=t=out:st={max(0, mlen - m['fadeOut'])}:d={m['fadeOut']},adelay={int(ms * 1000)}:all=1,apad=whole_dur={total}[mus]")
    fc.append('[voice]asplit=2[v1][v2]')
    fc.append('[mus][v2]sidechaincompress=threshold=0.02:ratio=10:attack=30:release=600[duck]')
    rain = [c for c in timeline if c.get('sfx') == 'rain']
    if rain:
        rs = rain[0]['start']
        ms_ = next((c['start'] for c in timeline if c.get('musicStart')), rs)
        re_ = max(rs + rain[0]['dur'], ms_ + spec['music']['fadeIn']) + 2.5
        fc.append(f"anoisesrc=color=pink:amplitude=0.3:r=48000:d={re_ - rs},lowpass=f=2500,highpass=f=200,afade=t=in:d=1,afade=t=out:st={re_ - rs - 2.5}:d=2.5,adelay={int(rs * 1000)}:all=1,apad=whole_dur={total}[rain]")
    # 목소리(문장마다 -20 LUFS)와 음악을 고정 이득으로 키우고(동적 음량 맞춤은 조용한 빗소리를 키워 버림),
    # 빗소리는 그 뒤에 작게 섞는다.
    sfx = []
    for c in timeline:
        if c.get('sfx') == 'whistle':   # 호루라기: 짧게 두 번
            sfx.append(f"sine=f=2650:d=0.32:r=48000,tremolo=f=28:d=0.7,afade=t=in:d=0.02,afade=t=out:st=0.24:d=0.08,volume=-16dB,apad=pad_dur=0.12[wa{len(sfx)}];"
                       f"sine=f=2650:d=0.5:r=48000,tremolo=f=28:d=0.7,afade=t=in:d=0.02,afade=t=out:st=0.36:d=0.14,volume=-16dB[wb{len(sfx)}];"
                       f"[wa{len(sfx)}][wb{len(sfx)}]concat=n=2:v=0:a=1,adelay={int((c['start'] + 0.15) * 1000)}:all=1,apad=whole_dur={total}[fx{len(sfx)}]")
        elif c.get('sfx') == 'chime':   # 축하 소리: 도-미-솔
            parts_ = ''.join(f"sine=f={f}:d=0.22:r=48000,afade=t=out:st=0.05:d=0.17,volume=-14dB[c{len(sfx)}{i}];" for i, f in enumerate((784, 988, 1175)))
            sfx.append(parts_ + f"[c{len(sfx)}0][c{len(sfx)}1][c{len(sfx)}2]concat=n=3:v=0:a=1,adelay={int((c['start'] + 0.1) * 1000)}:all=1,apad=whole_dur={total}[fx{len(sfx)}]")
    for s_ in sfx:
        fc.append(s_)
    if sfx:
        fc.append('[v1]' + ''.join(f'[fx{i}]' for i in range(len(sfx))) + f'amix=inputs={len(sfx) + 1}:normalize=0[v1x]')
    fc.append(('[v1x]' if sfx else '[v1]') + '[duck]amix=inputs=2:normalize=0,volume=6dB,alimiter=limit=0.89:level=false,atrim=0:' + f'{total}[mx]')
    if rain:
        fc.append(f'[mx][rain]amix=inputs=2:normalize=0,atrim=0:{total}[a]')
    else:
        fc.append('[mx]anull[a]')
    wav = OUT / 'mix.wav'
    run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', '[a]', '-ac', '2', '-ar', '48000', str(wav)])
    return wav


# ---------- 6. 이어 붙이기 ----------
def assemble(timeline, total, mix, out):
    ins, fc = [], []
    for c in timeline:
        ins += ['-i', str(SHOTS / f"{c['id']}.mp4")]
    prev = '[0:v]'
    for i in range(1, len(timeline)):
        lab = f'[x{i}]'
        fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={timeline[i]['start']}{lab}")
        prev = lab
    sub = str(OUT / 'intro.ass').replace(':', '\\:')
    fc.append(f"{prev}subtitles='{sub}':fontsdir='{FONT_DIR}',format=yuv420p[v]")
    ins += ['-i', str(mix)]
    run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', f'{len(timeline)}:a',
         '-t', f'{total}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
         '-movflags', '+faststart', str(out)])


# ---------- 7. 콘티(컷마다 한 장) + 섬네일 ----------
def storyboard(timeline, video):
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.truetype(str(FONT_DIR / 'VidSans-Bold.ttf'), 22)
    small = ImageFont.truetype(str(FONT_DIR / 'VidSans-Bold.ttf'), 18)
    tw, th, cols = 480, 270, 4
    rows = math.ceil(len(timeline) / cols)
    sheet = Image.new('RGB', (cols * (tw + 24) + 24, rows * (th + 96) + 24), BG)
    d = ImageDraw.Draw(sheet)
    tmp = OUT / 'sb'
    tmp.mkdir(exist_ok=True)
    for i, c in enumerate(timeline):
        t = c['start'] + c['dur'] * 0.6
        jpg = tmp / f"{c['id']}.jpg"
        run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t}', '-i', str(video), '-frames:v', '1', '-vf', f'scale={tw}:{th}', str(jpg)])
        x, y = 24 + (i % cols) * (tw + 24), 24 + (i // cols) * (th + 96)
        sheet.paste(Image.open(jpg), (x, y))
        mm = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'
        d.text((x, y + th + 8), f"{c['id']}  {mm(c['start'])}–{mm(c['start'] + c['dur'])}", fill='#303d35', font=font)
        line = (c['texts'][0] if c['texts'] else c.get('caption') or c.get('art') or c.get('rec') or '').replace('|', ' ')
        d.text((x, y + th + 40), line[:30] + ('…' if len(line) > 30 else ''), fill='#5d675f', font=small)
    sheet.save(OUT / 'storyboard.png')
    # 섬네일: 대표 게임 장면 위에 제목
    art, rec = OUT / 'art' / 'classroom-cheer.mp4', OUT / 'rec' / 'boss-main.mp4'
    tv = art_m.get('classroom-cheer', {}).get('tv')
    if art.exists() and rec.exists() and tv:   # 교실 그림 속 TV에 실제 보스전 화면을 넣는다
        run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '2.2', '-i', str(art), '-ss', '8', '-i', str(rec), '-filter_complex',
             f"[1:v]scale={tv['w']}:{tv['h']}[r];[0:v][r]overlay={tv['x']}:{tv['y']},scale=1280:720", '-frames:v', '1', str(OUT / 'thumb-base.jpg')])
    else:
        pick = next((c for c in timeline if c['id'] == 's4d2'), timeline[len(timeline) // 2])
        run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f"{pick['dur'] / 2}", '-i', str(SHOTS / f"{pick['id']}.mp4"), '-frames:v', '1', '-vf', f'crop={CW}:{CH}:{CX}:{CY},scale=1280:720', str(OUT / 'thumb-base.jpg')])
    img = Image.open(OUT / 'thumb-base.jpg').convert('RGB')
    dd = ImageDraw.Draw(img, 'RGBA')
    dd.rectangle((0, 540, 1280, 720), fill=(23, 24, 25, 215))
    big = ImageFont.truetype(str(FONT_DIR / 'VidSans-Bold.ttf'), 76)
    dd.text((56, 552), '땀방울 원정대', fill='#f2f1ec', font=big)
    tag = ImageFont.truetype(str(FONT_DIR / 'VidSans-Bold.ttf'), 30)
    dd.rounded_rectangle((1000, 40, 1240, 96), 28, fill=(86, 109, 77, 240))
    dd.text((1028, 50), '무료 · 설치 없이', fill='#ffffff', font=tag)
    dd.text((60, 650), 'TV 한 대면 반 전체가 땀 흘리는 체육 시간', fill='#f59e0b', font=ImageFont.truetype(str(FONT_DIR / 'VidSans-Bold.ttf'), 40))
    img.save(OUT / 'thumbnail.png')


# ---------- 8. 세로 짧은 버전 ----------
def short(timeline, video):
    sv = spec['short']
    sw, sh = sv['size']['w'], sv['size']['h']
    by_id = {c['id']: c for c in timeline}
    segs = []
    for s in sv['shots']:
        ids = s['from'] if isinstance(s['from'], list) else [s['from']]
        each = s['dur'] / len(ids)
        for cid in ids:
            c = by_id.get(cid)
            if c:
                segs.append((c['start'] + 0.3, min(each, c['dur'] - 0.4), s['text']))
    ins, fc, labs = [], [], []
    sub = []
    t = 0.0
    for i, (st, d, text) in enumerate(segs):
        ins += ['-ss', f'{st}', '-t', f'{d}', '-i', str(video)]
        fc.append(f'[{i}:v]split[a{i}][b{i}];[a{i}]scale=-2:{sh},crop={sw}:{sh},boxblur=24:2,eq=brightness=-0.15[bg{i}];[b{i}]scale={sw}:-2[fg{i}];[bg{i}][fg{i}]overlay=0:(H-h)/2,setsar=1,fps={FPS}[s{i}]')
        labs.append(f'[s{i}]')
        if not sub or sub[-1][2] != text:
            sub.append([t, t + d, text])
        else:
            sub[-1][1] = t + d
        t += d
    fc.append(''.join(labs) + f'concat=n={len(segs)}:v=1:a=0[cv]')
    ass = OUT / 'short.ass'
    ass.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {sw}
PlayResY: {sh}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Top,VidSans,72,&H00FFFFFF,&H00FFFFFF,&H004D6D56,&H00000000,1,0,0,0,100,100,0,0,3,22,0,8,60,60,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Top,,0,0,0,,{wrap(x, 12)}" for a, b, x in sub) + '\n')
    fc.append(f"[cv]subtitles='{str(ass).replace(':', chr(92) + ':')}':fontsdir='{FONT_DIR}',format=yuv420p[v]")
    m = spec['music']
    ins += ['-stream_loop', '-1', '-i', str((ROOT / m['src']).resolve())]
    fc.append(f"[{len(segs)}:a]atrim=0:{t},volume=-8dB,afade=t=in:d=0.8,afade=t=out:st={t - 2}:d=2,loudnorm=I=-14:TP=-1.5[a]")
    run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]', '-t', f'{t}',
         '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(OUT / 'intro-short-9x16.mp4')])


def main():
    ensure_font()
    timeline, total = plan()
    SHOTS.mkdir(parents=True, exist_ok=True)
    for i, c in enumerate(timeline):
        length = c['dur'] + (XF if i < len(timeline) - 1 else 0)
        render_cut(c, round(length, 3))
        print(f"  {c['id']:<8} {c['start']:6.1f}s +{c['dur']:.1f}s  {c['kind']}")
    subtitles(timeline)
    mix = audio(timeline, total)
    out = OUT / ('preview.mp4' if only else 'intro-16x9.mp4')
    assemble(timeline, total, mix, out)
    (OUT / 'timeline.json').write_text(json.dumps([{k: c[k] for k in ('id', 'scene', 'kind', 'start', 'dur')} for c in timeline], ensure_ascii=False, indent=1))
    if not only:
        storyboard(timeline, out)
        if '--short' in args:
            short(timeline, out)
    print(f'완성: {out}  ({probe(out):.1f}s)')


if __name__ == '__main__':
    main()
