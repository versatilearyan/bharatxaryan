/**
 * How a villager can look: a topi/pagdi on the head, a kurta colour, and a little extra on the face.
 * Everything is drawn in code (no pictures to download), and the numbers are what the server remembers.
 */
export const HATS = ["Pagdi", "Gandhi topi", "Cap", "Taaj", "Cowboy", "Chef topi", "Cone", "Patka", "Helmet", "Phool", "Party", "Kuch nahi"] as const;
export const SUITS = ["Mera rang", "Safed", "Kaala", "Laal", "Neela", "Hara", "Peela", "Gulabi", "Narangi", "Jamuni", "Sunehri", "Dhaari"] as const;
export const ACCS = ["Kuch nahi", "Chashma", "Moonchh", "Gamcha", "Tilak", "Daadhi", "Mask", "Bindi"] as const;

export const SUIT_COLORS: (string | null)[] = [null, "#f5f1e8", "#2b2b33", "#d83a3a", "#2f6fd6", "#2e9a4f", "#f2c230", "#ef6fa8", "#f2873a", "#7a4fd0", "#d9a441", "#c0392b"];

export type Look = { hat: number; suit: number; acc: number };
export const DEFAULT_LOOK: Look = { hat: 0, suit: 0, acc: 0 };

const KEY = "gaddar.look.v1";
export function savedLook(): Look {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Look> | null;
    if (o) return { hat: Number(o.hat) || 0, suit: Number(o.suit) || 0, acc: Number(o.acc) || 0 };
  } catch {
    /* none saved */
  }
  return { ...DEFAULT_LOOK };
}
export function saveLook(l: Look) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

/** The hat, drawn with the head's centre at (0, -19). */
export function drawHat(ctx: CanvasRenderingContext2D, hat: number, color: string) {
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "rgba(20,8,30,0.85)";
  ctx.lineJoin = "round";
  const stroke = () => {
    ctx.fill();
    ctx.stroke();
  };
  switch (hat) {
    case 0: // pagdi (turban)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -31, 13.5, 7, 0, Math.PI, 0);
      stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(-12, -32, 24, 3);
      break;
    case 1: // Gandhi topi
      ctx.fillStyle = "#f4f1e6";
      ctx.beginPath();
      ctx.moveTo(-13, -28);
      ctx.lineTo(-10, -38);
      ctx.lineTo(10, -38);
      ctx.lineTo(13, -28);
      ctx.closePath();
      stroke();
      break;
    case 2: // cap with a peak
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -30, 13, 8, 0, Math.PI, 0);
      stroke();
      ctx.beginPath();
      ctx.ellipse(8, -29, 11, 3.5, 0, 0, Math.PI * 2);
      stroke();
      break;
    case 3: // taaj (crown)
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.moveTo(-11, -29);
      ctx.lineTo(-12, -41);
      ctx.lineTo(-5, -35);
      ctx.lineTo(0, -43);
      ctx.lineTo(5, -35);
      ctx.lineTo(12, -41);
      ctx.lineTo(11, -29);
      ctx.closePath();
      stroke();
      ctx.fillStyle = "#e5484d";
      ctx.beginPath();
      ctx.arc(0, -34, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 4: // cowboy
      ctx.fillStyle = "#8a5a2b";
      ctx.beginPath();
      ctx.ellipse(0, -29, 19, 5, 0, 0, Math.PI * 2);
      stroke();
      ctx.beginPath();
      ctx.roundRect(-9, -42, 18, 15, 5);
      stroke();
      break;
    case 5: // chef topi
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-6, -37, 6, 0, Math.PI * 2);
      ctx.arc(6, -37, 6, 0, Math.PI * 2);
      ctx.arc(0, -41, 7, 0, Math.PI * 2);
      stroke();
      ctx.fillRect(-9, -36, 18, 9);
      ctx.strokeRect(-9, -36, 18, 9);
      break;
    case 6: // party cone
      ctx.fillStyle = "#ff5fa2";
      ctx.beginPath();
      ctx.moveTo(-9, -29);
      ctx.lineTo(0, -47);
      ctx.lineTo(9, -29);
      ctx.closePath();
      stroke();
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.arc(0, -47, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 7: // patka (a plain cloth knot)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -35, 6, 0, Math.PI * 2);
      stroke();
      ctx.beginPath();
      ctx.ellipse(0, -30, 13.5, 5.5, 0, Math.PI, 0);
      stroke();
      break;
    case 8: // helmet
      ctx.fillStyle = "#e0a93a";
      ctx.beginPath();
      ctx.ellipse(0, -30, 14, 10, 0, Math.PI, 0);
      stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(-2, -40, 4, 10);
      break;
    case 9: // phool (a flower)
      ctx.fillStyle = "#ff7ab8";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(6 + Math.cos(a) * 4, -33 + Math.sin(a) * 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.arc(6, -33, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -30, 13, 5, 0, Math.PI, 0);
      ctx.fill();
      break;
    case 10: // party cap with a pom-pom
      ctx.fillStyle = "#6c5ce7";
      ctx.beginPath();
      ctx.ellipse(0, -30, 13, 8, 0, Math.PI, 0);
      stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, -40, 4, 0, Math.PI * 2);
      stroke();
      break;
    default: // no hat
      break;
  }
}

/** The little extra on the face. */
export function drawAcc(ctx: CanvasRenderingContext2D, acc: number) {
  ctx.lineJoin = "round";
  switch (acc) {
    case 1: // glasses
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(120,200,255,0.45)";
      for (const x of [-6, 6]) {
        ctx.beginPath();
        ctx.arc(x, -20, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-1.4, -20);
      ctx.lineTo(1.4, -20);
      ctx.stroke();
      break;
    case 2: // moonchh
      ctx.fillStyle = "#2a1a12";
      ctx.beginPath();
      ctx.moveTo(-8, -13);
      ctx.quadraticCurveTo(-4, -17, 0, -14);
      ctx.quadraticCurveTo(4, -17, 8, -13);
      ctx.quadraticCurveTo(4, -11, 0, -12.5);
      ctx.quadraticCurveTo(-4, -11, -8, -13);
      ctx.fill();
      break;
    case 3: // gamcha round the neck
      ctx.fillStyle = "#d83a3a";
      ctx.fillRect(-12, -8, 24, 6);
      ctx.fillStyle = "#fff";
      for (let x = -10; x < 10; x += 6) ctx.fillRect(x, -8, 2, 6);
      break;
    case 4: // tilak
      ctx.fillStyle = "#e5484d";
      ctx.fillRect(-1.5, -30, 3, 8);
      break;
    case 5: // daadhi
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.moveTo(-11, -17);
      ctx.quadraticCurveTo(0, 4, 11, -17);
      ctx.quadraticCurveTo(0, -10, -11, -17);
      ctx.fill();
      break;
    case 6: // mask
      ctx.fillStyle = "#e7f0ff";
      ctx.beginPath();
      ctx.roundRect(-10, -17, 20, 9, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,8,30,0.6)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      break;
    case 7: // bindi
      ctx.fillStyle = "#e5484d";
      ctx.beginPath();
      ctx.arc(0, -27, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
}
