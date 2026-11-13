/** A festival's look, exactly as the server sends it (the published version) or as the admin panel's draft sends it to the preview. */
export type FestivalConfig = {
  theme: { primary: string; accent: string; background: string; surface: string; text: string; buttonStyle: "pill" | "rounded" | "square"; mode: "dark" | "light" };
  assets: { bannerUrl: string | null; logoUrl: string | null; backgroundUrl: string | null; popupImageUrl: string | null };
  decorations: { enabled: boolean; fireworks: boolean; diyas: boolean; lights: boolean; confetti: boolean; intensity: number };
  banner: { title: string; subtitle: string; buttonText: string };
  popup: { title: string; body: string; buttonText: string; showOnce: boolean };
  sections: { banner: boolean; popup: boolean; decorations: boolean; logo: boolean; background: boolean; giftsHighlight: boolean };
};

export type ActiveFestival = { active: boolean; id?: number; name?: string; version?: number; endsAt?: string | null; config?: FestivalConfig };

export const DEFAULT_FESTIVAL: FestivalConfig = {
  theme: { primary: "#e7bc72", accent: "#ff687c", background: "#050507", surface: "#15131a", text: "#fff1d5", buttonStyle: "pill", mode: "dark" },
  assets: { bannerUrl: null, logoUrl: null, backgroundUrl: null, popupImageUrl: null },
  decorations: { enabled: false, fireworks: false, diyas: false, lights: false, confetti: false, intensity: 50 },
  banner: { title: "Happy Festival", subtitle: "Celebrate with your Panchayat", buttonText: "Celebrate" },
  popup: { title: "Festival offer", body: "Send a festival gift to someone you love.", buttonText: "Open gifts", showOnce: true },
  sections: { banner: true, popup: false, decorations: true, logo: true, background: true, giftsHighlight: true },
};
