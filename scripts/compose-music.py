"""
Generates public/audio/panchayat-raag.mp3: an ORIGINAL instrumental in Raag Bhupali
(bansuri-style flute + tanpura drone + tabla in Keherwa taal), synthesised from scratch.
No samples or recordings are used, so there are no rights issues.

Run:  python3 scripts/compose-music.py   (needs numpy, scipy and ffmpeg)
"""
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
BPM = 84
BEAT = 60 / BPM
CYCLES = 12                     # 12 cycles x 8 beats (Keherwa)
DUR = CYCLES * 8 * BEAT
SA = 138.59                     # C#3
rng = np.random.default_rng(7)

N = int(DUR * SR) + SR * 3
L = np.zeros(N)
R = np.zeros(N)


def add(buf, start_s, sig, gain=1.0):
    i = int(start_s * SR)
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def hz(semi, octave=0):
    return SA * 2 ** ((semi + 12 * octave) / 12)


# ---------------- Tanpura: Pa - Sa' - Sa' - Sa, buzzing plucked strings ----------------
def tanpura_pluck(f, length=5.0):
    t = np.arange(int(length * SR)) / SR
    sig = np.zeros_like(t)
    for h in range(1, 18):
        # "jawari" buzz: upper harmonics bloom then fade
        bloom = (1 - np.exp(-t * (1.5 + h * 0.15))) * np.exp(-t * (0.35 + h * 0.06))
        detune = 1 + rng.normal(0, 0.0006)
        sig += np.sin(2 * np.pi * f * h * detune * t + rng.uniform(0, 6)) * bloom / h ** 0.9
    sig *= np.exp(-t * 0.25)
    return sig / 6


cycle_len = 4 * BEAT * 1.0
t0 = 0.0
pattern = [hz(7, -1), hz(0), hz(0), hz(0, -1)]
while t0 < DUR + 2:
    for k, f in enumerate(pattern):
        s = tanpura_pluck(f)
        add(L, t0 + k * BEAT, s, 0.4)
        add(R, t0 + k * BEAT, s, 0.28)
    t0 += cycle_len

# ---------------- Bansuri melody (Bhupali: S R G P D) ----------------
SARGAM = {"S": 0, "R": 2, "G": 4, "P": 7, "D": 9, "d": -3, "p": -5, "S'": 12, "R'": 14, "G'": 16}

# (note, beats). "-" = rest. Slow alap over the first two cycles, then the composition.
ALAP = [("-", 2), ("S", 3), ("d", 1.5), ("S", 1.5), ("R", 3), ("G", 5),
        ("R", 1.5), ("G", 1.5), ("P", 3), ("G", 2), ("R", 1), ("S", 4)]
GAT = [
    ("G", 1), ("G", 1), ("P", 1), ("G", 1), ("R", 1), ("S", 1), ("R", 1), ("G", 1),
    ("P", 1), ("D", 1), ("S'", 2), ("D", 1), ("P", 1), ("G", 1), ("R", 1),
    ("G", 1), ("P", 1), ("D", 1), ("S'", 1), ("R'", 1), ("S'", 1), ("D", 1), ("P", 1),
    ("G", 1), ("P", 1), ("D", 1), ("P", 1), ("G", 1), ("R", 1), ("S", 2),
]
TAAN = [
    ("S", .5), ("R", .5), ("G", .5), ("P", .5), ("D", .5), ("S'", .5), ("D", .5), ("P", .5),
    ("G", .5), ("P", .5), ("D", .5), ("S'", .5), ("R'", .5), ("G'", .5), ("R'", .5), ("S'", .5),
    ("D", 1), ("P", 1), ("G", 1), ("R", 1), ("S", 4),
]
melody = ALAP + GAT + GAT + TAAN + GAT + [("G", 2), ("R", 2), ("S", 6), ("-", 4)]

# frequency + amplitude tracks with meend (glides) and delayed vibrato
freq = np.zeros(N)
amp = np.zeros(N)
t = 0.0
prev_f = hz(0, 2)
for note, beats in melody:
    d = beats * BEAT
    i, j = int(t * SR), int((t + d) * SR)
    if j > N:
        break
    if note != "-":
        f = hz(SARGAM[note], 2)
        n = j - i
        tt = np.arange(n) / SR
        glide = min(0.09, d * 0.3)
        ftrack = f + (prev_f - f) * np.exp(-tt / (glide / 4 + 1e-4))
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - 0.25) / 0.4, 0, 1)
        freq[i:j] = ftrack * vib
        env = np.minimum(1, tt / 0.05) * np.minimum(1, (d - tt) / 0.08)
        amp[i:j] = np.clip(env, 0, 1) * (0.8 + 0.2 * np.minimum(1, d / 2))
        prev_f = f
    else:
        freq[i:j] = prev_f
    t += d
mel_end = t

phase = 2 * np.pi * np.cumsum(freq) / SR
flute = (np.sin(phase) + 0.18 * np.sin(2 * phase) + 0.06 * np.sin(3 * phase)) * amp
# breath
sos = butter(2, [1500, 5000], btype="band", fs=SR, output="sos")
breath = sosfilt(sos, rng.normal(0, 1, N)) * amp * 0.05
flute = flute + breath
# smooth amplitude jumps
flute = np.convolve(flute, np.ones(32) / 32, mode="same")
add(L, 0, flute, 0.42)
add(R, 0, flute, 0.5)

# ---------------- Tabla (Keherwa: dha ge na ti | na ke dhi na) ----------------
def bayan(length=0.6, depth=1.0):
    tt = np.arange(int(length * SR)) / SR
    f = 70 + 45 * np.exp(-tt * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5.5) * depth


def dayan(length=0.5, open_=True):
    tt = np.arange(int(length * SR)) / SR
    f = hz(0, 1) * 2
    decay = 6 if open_ else 22
    s = sum(np.sin(2 * np.pi * f * m * tt) / m ** 1.2 for m in (1, 2, 3, 4.1, 5.2))
    s *= np.exp(-tt * decay)
    click = rng.normal(0, 1, len(tt)) * np.exp(-tt * 180) * 0.4
    return (s + click) * 0.5


def ti(length=0.12):
    tt = np.arange(int(length * SR)) / SR
    sos_hp = butter(2, 2500, btype="high", fs=SR, output="sos")
    return sosfilt(sos_hp, rng.normal(0, 1, len(tt))) * np.exp(-tt * 60) * 0.35


BOLS = ["dha", "ge", "na", "ti", "na", "ke", "dhi", "na"]
TABLA_START = 2 * 8 * BEAT   # enters after the alap
tab = np.zeros(N)
for c in range(2, CYCLES):
    for b, bol in enumerate(BOLS):
        st = c * 8 * BEAT + b * BEAT
        if st >= mel_end - 4 * BEAT:
            break
        hum = rng.normal(0, 0.012)
        if bol in ("dha", "dhi"):
            add(tab, st + hum, bayan(), 0.55)
            add(tab, st + hum, dayan(open_=bol == "dha"), 0.8)
        elif bol == "ge":
            add(tab, st + hum, bayan(depth=0.8), 0.5)
        elif bol == "na":
            add(tab, st + hum, dayan(), 0.6)
        elif bol in ("ti", "ke"):
            add(tab, st + hum, ti(), 0.9)
        # off-beat ghost notes for lilt
        if bol in ("na",) and c % 2:
            add(tab, st + BEAT / 2 + hum, ti(0.08), 0.5)
# manjira on sam
for c in range(2, CYCLES - 1):
    st = c * 8 * BEAT
    tt = np.arange(int(1.2 * SR)) / SR
    m = sum(np.sin(2 * np.pi * f * tt) for f in (3520, 4710, 6200)) * np.exp(-tt * 3.5) * 0.05
    add(L, st, m)
    add(R, st, m * 0.7)
add(L, 0, tab, 0.42)
add(R, 0, tab, 0.42)

# ---------------- Reverb, master, loop-friendly fades ----------------
ir_t = np.arange(int(1.6 * SR)) / SR
ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 3.2)
ir /= np.sqrt(np.sum(ir ** 2))
L = L * 0.8 + fftconvolve(L, ir)[:N] * 0.35
R = R * 0.8 + fftconvolve(R, ir)[:N] * 0.35

hp = butter(2, 55, btype="high", fs=SR, output="sos")
L, R = sosfilt(hp, L), sosfilt(hp, R)

end = int(min(N, (mel_end + 2.5) * SR))
L, R = L[:end], R[:end]
fade = np.ones(end)
fi, fo = int(1.5 * SR), int(3.5 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.85, R / peak * 0.85

out = Path(__file__).resolve().parent.parent / "public" / "audio"
out.mkdir(parents=True, exist_ok=True)
wav = out / "panchayat-raag.wav"
with wave.open(str(wav), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.stack([L, R], 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "112k", str(out / "panchayat-raag.mp3")], check=True)
wav.unlink()
print(f"wrote {out / 'panchayat-raag.mp3'} ({end / SR:.1f}s)")
