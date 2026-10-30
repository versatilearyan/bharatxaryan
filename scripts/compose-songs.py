"""
Generates the room music library in public/audio/songs/: short ORIGINAL
instrumentals in different raags, synthesised from scratch (no samples or
recordings), so there are no rights issues.

Run:  python3 scripts/compose-songs.py   (needs numpy, scipy and ffmpeg)
"""
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "audio" / "songs"

# id, raag notes (semitones from Sa), Sa in Hz, bpm, taal, lead voice, seed
SONGS = [
    ("chai-ki-chuski", [0, 2, 4, 6, 7, 9, 11], 146.83, 96, "keherwa", "flute", 11),  # Yaman
    ("gaon-ki-shaam", [0, 2, 5, 7, 10, 11], 130.81, 74, "dadra", "santoor", 23),  # Des
    ("mela-masti", [0, 2, 4, 5, 7, 9, 10], 155.56, 116, "keherwa", "shehnai", 37),  # Khamaj
    ("barish-ki-boondein", [0, 2, 5, 7, 10], 138.59, 68, "dadra", "sitar", 51),  # Megh
]


def compose(name, scale, sa, bpm, taal, voice, seed, cycles=14):
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    beats_per_cycle = 8 if taal == "keherwa" else 6
    dur = cycles * beats_per_cycle * beat
    n = int((dur + 4) * SR)
    L = np.zeros(n)
    R = np.zeros(n)

    def add(buf, start, sig, gain=1.0):
        i = int(start * SR)
        j = min(n, i + len(sig))
        if i < n:
            buf[i:j] += sig[: j - i] * gain

    def hz(semi, octave=0):
        return sa * 2 ** ((semi + 12 * octave) / 12)

    # Tanpura drone
    def pluck_drone(f, length=5.0):
        t = np.arange(int(length * SR)) / SR
        s = np.zeros_like(t)
        for h in range(1, 14):
            bloom = (1 - np.exp(-t * (1.5 + h * 0.15))) * np.exp(-t * (0.4 + h * 0.07))
            s += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6)) * bloom / h ** 0.9
        return s * np.exp(-t * 0.25) / 6

    fifth = 7 if 7 in scale else 5
    t0 = 0.0
    while t0 < dur + 2:
        for k, f in enumerate([hz(fifth, -1), hz(0), hz(0), hz(0, -1)]):
            s = pluck_drone(f)
            add(L, t0 + k * beat, s, 0.32)
            add(R, t0 + k * beat, s, 0.24)
        t0 += 4 * beat

    # Melody: phrases that wander the raag and come home to Sa
    degrees = scale + [s + 12 for s in scale] + [24]
    phrases = []
    for p in range(cycles - 2):
        idx = rng.integers(2, len(degrees) - 4)
        notes = []
        length = 0.0
        while length < beats_per_cycle - 1:
            idx = int(np.clip(idx + rng.choice([-2, -1, -1, 1, 1, 2, 0]), 0, len(degrees) - 1))
            d = rng.choice([0.5, 0.5, 1, 1, 1, 1.5, 2]) if voice != "santoor" else rng.choice([0.5, 0.5, 1])
            notes.append((degrees[idx], d))
            length += d
        home = 0 if p % 2 else 12
        notes.append((home, beats_per_cycle - length))
        phrases.append(notes)
    melody = [(None, 2 * beats_per_cycle)] + [n_ for ph in phrases for n_ in ph]

    t = 0.0
    lead = np.zeros(n)
    for semi, beats in melody:
        d = beats * beat
        if d < 0.05:
            continue
        if semi is not None:
            f = hz(semi, 1 if voice in ("flute", "shehnai") else 0)
            tt = np.arange(int(d * SR)) / SR
            if voice in ("santoor", "sitar"):
                # plucked/struck strings: bright attack, fast decay; sitar slides into the note
                length = np.arange(int(min(2.5, d + 1.2) * SR)) / SR
                ff = f * (1 + (0.03 * np.exp(-length * 25) if voice == "sitar" else 0))
                ph = 2 * np.pi * np.cumsum(np.full_like(length, 1.0) * ff) / SR
                sig = sum(np.sin(m * ph) / m ** (1.0 if voice == "sitar" else 1.6) for m in range(1, 9))
                sig *= np.exp(-length * (2.2 if voice == "sitar" else 3.5))
                if voice == "santoor":
                    add(lead, t + 0.11, sig, 0.25)  # the hammered echo
                add(lead, t, sig, 0.5)
            else:
                vib = 1 + 0.007 * np.sin(2 * np.pi * 5.5 * tt) * np.clip((tt - 0.2) / 0.4, 0, 1)
                ph = 2 * np.pi * np.cumsum(f * vib) / SR
                env = np.minimum(1, tt / 0.05) * np.clip((d - tt) / 0.08, 0, 1)
                if voice == "shehnai":
                    sig = sum(np.sin(m * ph) * (0.9 ** m) for m in range(1, 10))
                    sig = np.tanh(sig * 1.4) * 0.6
                else:
                    sig = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
                    sos = butter(2, [1500, 5000], btype="band", fs=SR, output="sos")
                    sig = sig + sosfilt(sos, rng.normal(0, 1, len(tt))) * 0.05
                add(lead, t, sig * env, 0.5)
        t += d
    lead = np.convolve(lead, np.ones(24) / 24, mode="same")
    add(L, 0, lead, 0.5)
    add(R, 0, lead, 0.45)
    mel_end = t

    # Tabla
    def bayan(length=0.6, depth=1.0):
        tt = np.arange(int(length * SR)) / SR
        f = 70 + 45 * np.exp(-tt * 9)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5.5) * depth

    def dayan(length=0.5, open_=True):
        tt = np.arange(int(length * SR)) / SR
        f = hz(0, 1) * 2
        s = sum(np.sin(2 * np.pi * f * m * tt) / m ** 1.2 for m in (1, 2, 3, 4.1, 5.2))
        s *= np.exp(-tt * (6 if open_ else 22))
        return (s + rng.normal(0, 1, len(tt)) * np.exp(-tt * 180) * 0.4) * 0.5

    def ti(length=0.12):
        tt = np.arange(int(length * SR)) / SR
        sos = butter(2, 2500, btype="high", fs=SR, output="sos")
        return sosfilt(sos, rng.normal(0, 1, len(tt))) * np.exp(-tt * 60) * 0.35

    bols = ["dha", "ge", "na", "ti", "na", "ke", "dhi", "na"] if taal == "keherwa" else ["dha", "dhi", "na", "dha", "ti", "na"]
    tab = np.zeros(n)
    for c in range(2, cycles):
        for b, bol in enumerate(bols):
            st = (c * beats_per_cycle + b) * beat
            if st >= mel_end - 2 * beat:
                break
            hum = rng.normal(0, 0.01)
            if bol in ("dha", "dhi"):
                add(tab, st + hum, bayan(), 0.55)
                add(tab, st + hum, dayan(open_=bol == "dha"), 0.8)
            elif bol == "ge":
                add(tab, st + hum, bayan(depth=0.8), 0.5)
            elif bol == "na":
                add(tab, st + hum, dayan(), 0.6)
            else:
                add(tab, st + hum, ti(), 0.9)
    add(L, 0, tab, 0.42)
    add(R, 0, tab, 0.42)

    # Reverb, master, fades
    ir_t = np.arange(int(1.4 * SR)) / SR
    ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 3.4)
    ir /= np.sqrt(np.sum(ir**2))
    L = L * 0.8 + fftconvolve(L, ir)[:n] * 0.3
    R = R * 0.8 + fftconvolve(R, ir)[:n] * 0.3
    hp = butter(2, 55, btype="high", fs=SR, output="sos")
    L, R = sosfilt(hp, L), sosfilt(hp, R)
    end = int(min(n, (mel_end + 2.5) * SR))
    L, R = L[:end], R[:end]
    fade = np.ones(end)
    fade[: int(1.2 * SR)] = np.linspace(0, 1, int(1.2 * SR))
    fade[-int(3 * SR) :] = np.linspace(1, 0, int(3 * SR))
    L, R = L * fade, R * fade
    peak = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / peak * 0.85, R / peak * 0.85

    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f"{name}.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.stack([L, R], 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "96k", str(OUT / f"{name}.mp3")], check=True)
    wav.unlink()
    print(name, round(end / SR, 1), "s")


for song in SONGS:
    compose(*song)
