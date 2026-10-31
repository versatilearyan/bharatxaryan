"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Button } from "@/components/ui/kit";
import { GAMES } from "@/lib/app/data";
import { NAME_FONTS, nameFace } from "@/lib/app/fonts";
import { useApp } from "@/lib/app/store";
import { useMe } from "@/lib/app/me-store";
import { shrinkForUpload } from "@/lib/app/shrink-image";
import { ApiError } from "@/lib/api/client";
import { API_GENDERS, MEDIA_MAX_MB, mediaFileError, type MediaKind, BIO_MAX, FAVORITE_GAMES_MAX, GENDER_LABELS, genderFromApi, validateProfileUpdate, type ApiGender, type UpdateProfileRequest } from "@/lib/api/users";
import { MIN_AGE, ageOn } from "@/components/auth/AuthFlow";
import type { GameId, Profile } from "@/lib/app/types";

const BGS = ["#3a2f55", "#7a2f45", "#2f4a63", "#2f5a49", "#7a5a2a", "#5a2f63"];
const OUTFITS = ["#f4515b", "#e7bc72", "#ff687c", "#8fa8ff", "#6fe0a6", "#fff1d5"];
const SKINS = ["#e8b597", "#d39a7c", "#b07a5e", "#9c6a52", "#8d5a44"];
const HAIR_STYLES = [0, 1, 2, 3] as const;

/** Read an image file and center-crop it to w×h on a canvas, returned as a JPEG data URL. */
export function cropImage(file: File, w: number, h: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale;
      const sh = h / scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

/** Same crop as cropImage, as a JPEG Blob for IndexedDB. */
export function cropImageBlob(file: File, w: number, h: number, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale;
      const sh = h / scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode image"))), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameList = (a: readonly string[] = [], b: readonly string[] = []) => a.length === b.length && a.every((x, i) => x === b[i]);
const handleFor = (name: string) => `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "you"}`;

export function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, updateProfile, toast } = useApp();
  const me = useMe();
  const [draft, setDraft] = useState<Profile>(profile);
  // The backend's four genders; the app's own profile only knows male/female (for the ♂/♀ icon)
  const savedGender: ApiGender | undefined = me.profile.data?.gender ?? (profile.gender === "male" ? "MALE" : profile.gender === "female" ? "FEMALE" : undefined);
  const [gender, setGender] = useState<ApiGender | undefined>(savedGender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** Picture and banner picked in this sheet, uploaded on Save. */
  const [pending, setPending] = useState<{ photo?: File; banner?: File }>({});
  /** Which saved image is waiting for "Remove?" confirmation, and which one is being removed. */
  const [confirmRemove, setConfirmRemove] = useState<"photo" | "banner" | null>(null);
  const [removing, setRemoving] = useState<"photo" | "banner" | null>(null);
  const [savingStep, setSavingStep] = useState("");
  const previews = useRef<string[]>([]);
  const dropPreviews = () => {
    for (const u of previews.current) URL.revokeObjectURL(u);
    previews.current = [];
  };

  // Start from the saved profile each time the sheet opens (not while you're typing or saving)
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(profile);
      setGender(savedGender);
      setPending({});
      setConfirmRemove(null);
      setError("");
      setFieldErrors({});
    }
    if (!open && wasOpen.current) dropPreviews();
    wasOpen.current = open;
  }, [open, profile, savedGender]);
  useEffect(() => dropPreviews, []);

  const look = (patch: Partial<Profile["look"]>) => setDraft((d) => ({ ...d, look: { ...d.look, ...patch } }));
  const toggleGame = (id: GameId) =>
    setDraft((d) => ({ ...d, favoriteGames: d.favoriteGames.includes(id) ? d.favoriteGames.filter((g) => g !== id) : [...d.favoriteGames, id].slice(-FAVORITE_GAMES_MAX) }));

  const latestDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return iso(d);
  })();
  const dob = draft.dob ?? "";
  const dobError = !dob ? "" : !/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(ageOn(dob)) || dob < "1920-01-01" ? "Check the date" : dob > iso(new Date()) ? "That date is in the future" : ageOn(dob) < MIN_AGE ? `You need to be ${MIN_AGE} or older` : "";
  const valid = draft.name.trim().length >= 2 && draft.bio.length <= BIO_MAX && !dobError;

  /**
   * Save: the picture and banner go to this device (IndexedDB, per user), and
   * the profile fields the backend supports go to PATCH /users/me, only the
   * ones that changed. Images are never sent to the backend.
   */
  const save = async () => {
    if (saving || !valid) return;
    const name = draft.name.trim();
    const bio = draft.bio.trim();
    const server = me.profile.data;
    const patch: UpdateProfileRequest = {};
    if (name !== (server?.fullName ?? profile.name)) patch.fullName = name;
    if (bio !== (server?.bio ?? profile.bio)) patch.bio = bio;
    if (gender && gender !== savedGender) patch.gender = gender;
    if (draft.dob && draft.dob !== profile.dob) patch.dateOfBirth = draft.dob;
    if ((draft.nameFont ?? "default") !== (profile.nameFont ?? "default")) patch.nameFont = draft.nameFont ?? "default";
    if (!sameList(draft.favoriteGames, profile.favoriteGames)) patch.favoriteGames = draft.favoriteGames.slice(0, FAVORITE_GAMES_MAX);
    if (draft.look.bg !== profile.look.bg) patch.avatarBackground = draft.look.bg;
    if (draft.look.skin !== profile.look.skin) patch.avatarSkinTone = draft.look.skin;
    if (draft.look.outfit !== profile.look.outfit) patch.avatarOutfit = draft.look.outfit;
    if (draft.look.hairStyle !== profile.look.hairStyle) patch.avatarHair = String(draft.look.hairStyle);
    // Same rules as the backend's UpdateProfileRequest, checked before anything is sent
    const invalid = validateProfileUpdate(patch);
    if (Object.keys(invalid).length) {
      setFieldErrors(invalid);
      setError(Object.values(invalid)[0]);
      return;
    }
    const imagesChanged = pending.photo !== undefined || pending.banner !== undefined;

    setSaving(true);
    setError("");
    setFieldErrors({});
    // Everything else in the form (and the handle) stays local, as before; images go to their own endpoints
    const { photo: _p, banner: _b, ...local } = draft;
    void _p;
    void _b;
    // 1. Upload the new picture and banner (POST /users/me/avatar, /users/me/banner).
    // Each one is shown only once the backend has saved it; a failed one stays picked so Save can retry it.
    // Picture and banner upload at the same time
    const jobs = ([["photo", "avatar", "Profile picture"], ["banner", "banner", "Banner"]] as const).filter(([kind]) => pending[kind]);
    if (jobs.length) setSavingStep(jobs.length === 2 ? "Uploading pictures…" : `Uploading ${jobs[0][2].toLowerCase()}…`);
    const results = await Promise.allSettled(jobs.map(([kind, media]) => me.uploadImage(media, pending[kind] as File)));
    const uploaded: string[] = [];
    const failed: string[] = [];
    results.forEach((r, i) => {
      const [kind, , label] = jobs[i];
      if (r.status === "fulfilled") {
        uploaded.push(label);
        setPending((p) => ({ ...p, [kind]: undefined }));
      } else failed.push(`${label} wasn't uploaded: ${r.reason instanceof Error && r.reason.message ? r.reason.message : "Try again."}`);
    });
    if (failed.length) {
      setSaving(false);
      setSavingStep("");
      setError(failed.join(" ") + (uploaded.length ? ` (${uploaded.join(" and ")} saved.)` : ""));
      return;
    }
    setSavingStep("");
    const imagesDone = uploaded.length ? `${uploaded.join(" and ").replace(" and Banner", " and banner")} updated` : "";
    if (Object.keys(patch).length === 0) {
      updateProfile({ ...local, name, bio, handle: handleFor(name) });
      toast(imagesDone || "No changes to save");
      setSaving(false);
      onClose();
      return;
    }
    try {
      // Fields the backend owns are only applied from its answer (me.save); the rest is local
      const { name: _n, bio: _bio, gender: _g, dob: _d, nameFont: _f, favoriteGames: _fg, look: _l, ...localOnly } = local;
      void [_n, _bio, _g, _d, _f, _fg, _l];
      updateProfile(localOnly);
      const saved = await me.save(patch);
      updateProfile({ handle: handleFor(saved.fullName ?? name) });
      toast(imagesDone ? `Profile saved · ${imagesDone}` : "Profile saved");
      setSaving(false);
      onClose();
    } catch (e) {
      setSaving(false);
      if (e instanceof ApiError) setFieldErrors(e.fields);
      const why = e instanceof Error && e.message ? e.message : "Couldn't save your profile. Try again.";
      setError(imagesDone ? `${imagesDone}, but the other changes weren't saved: ${why}` : why);
    }
  };
  const photoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const mediaOf = (kind: "photo" | "banner"): MediaKind => (kind === "photo" ? "avatar" : "banner");
  const savedUrl = (kind: "photo" | "banner") => (kind === "photo" ? me.profile.data?.avatarUrl : me.profile.data?.bannerUrl);

  /** Check the file, make it small (lib/app/shrink-image.ts) and show it as a preview; it's uploaded on Save. */
  const pickImage = async (picked: File | undefined, kind: "photo" | "banner") => {
    if (!picked) return;
    const bad = mediaFileError(picked, mediaOf(kind));
    if (bad) {
      toast(bad, "error");
      return;
    }
    let file: File;
    try {
      file = await shrinkForUpload(picked, mediaOf(kind));
    } catch {
      toast("Couldn't read that image. Try another JPG, PNG or WebP.", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    previews.current.push(url);
    setConfirmRemove(null);
    setDraft((d) => ({ ...d, [kind]: url }));
    setPending((p) => ({ ...p, [kind]: file }));
  };

  /** An unsaved pick is just dropped; a saved image needs confirmation, then DELETE. */
  const askRemove = (kind: "photo" | "banner") => {
    if (pending[kind]) {
      setPending((p) => ({ ...p, [kind]: undefined }));
      setDraft((d) => ({ ...d, [kind]: savedUrl(kind) }));
      return;
    }
    setConfirmRemove(kind);
  };
  const removeSaved = async (kind: "photo" | "banner") => {
    if (removing) return;
    setRemoving(kind);
    setError("");
    try {
      await me.removeImage(mediaOf(kind));
      setDraft((d) => ({ ...d, [kind]: undefined }));
      toast(kind === "photo" ? "Profile picture removed" : "Banner removed");
      setConfirmRemove(null);
    } catch (e) {
      setError(`${kind === "photo" ? "Profile picture" : "Banner"} wasn't removed: ${e instanceof Error && e.message ? e.message : "Try again."}`);
    }
    setRemoving(null);
  };
  const busy = saving || removing !== null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile" tall>
      <div className="space-y-5 px-5 pb-6">
        {/* Banner + profile picture */}
        <div>
          <div className="relative">
            <button type="button" disabled={busy} onClick={() => bannerInput.current?.click()} className="group relative block aspect-[3/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-wine to-surface-2 ring-1 ring-line" aria-label={draft.banner ? "Change banner" : "Add banner"}>
              {draft.banner ? <img src={draft.banner} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden /> {draft.banner ? "Change banner" : "Add banner"}
              </span>
            </button>
            <button type="button" disabled={busy} onClick={() => photoInput.current?.click()} className="absolute -bottom-10 left-4 rounded-full ring-4 ring-ink-2" aria-label={draft.photo ? "Change profile picture" : "Add profile picture"}>
              <PersonAvatar person={{ id: "me", look: draft.look, frame: draft.frame, photo: draft.photo }} size={84} />
              <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-coral text-white ring-2 ring-ink-2">
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
          </div>
          <div className="mt-2 flex min-h-8 justify-end gap-2 pl-28">
            {draft.photo ? (
              <button type="button" disabled={busy} onClick={() => askRemove("photo")} className="flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] font-semibold text-cream/80 disabled:opacity-50">
                <Trash2 className="h-3 w-3" aria-hidden /> {pending.photo ? "Undo new photo" : "Remove photo"}
              </button>
            ) : null}
            {draft.banner ? (
              <button type="button" disabled={busy} onClick={() => askRemove("banner")} className="flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] font-semibold text-cream/80 disabled:opacity-50">
                <Trash2 className="h-3 w-3" aria-hidden /> {pending.banner ? "Undo new banner" : "Remove banner"}
              </button>
            ) : null}
          </div>
          {confirmRemove ? (
            <div role="alertdialog" aria-label={confirmRemove === "photo" ? "Remove profile picture?" : "Remove banner?"} className="mt-2 rounded-2xl bg-[#3a1418] p-3 ring-1 ring-[#ff8a8f]/30">
              <p className="text-[12.5px] text-cream">{confirmRemove === "photo" ? "Remove your profile picture? Your cartoon avatar shows instead." : "Remove your banner? The default banner shows instead."}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="danger" disabled={removing !== null} onClick={() => void removeSaved(confirmRemove)}>
                  {removing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Removing…
                    </>
                  ) : (
                    "Remove"
                  )}
                </Button>
                <Button size="sm" variant="soft" disabled={removing !== null} onClick={() => setConfirmRemove(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
          <p className="mt-2 text-[11px] text-muted">Tap the picture or banner to choose an image. JPG, PNG or WebP: picture up to {MEDIA_MAX_MB.avatar} MB, banner up to {MEDIA_MAX_MB.banner} MB. They upload when you tap Save.</p>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload profile picture" data-testid="photo-input" onChange={(e) => { void pickImage(e.target.files?.[0], "photo"); e.target.value = ""; }} />
          <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload banner" data-testid="banner-input" onChange={(e) => { void pickImage(e.target.files?.[0], "banner"); e.target.value = ""; }} />
        </div>

        <p className="!mt-6 text-[12px] font-bold text-cream">
          Cartoon avatar <span className="font-normal text-muted">{draft.photo ? "(shown if you remove your photo)" : "(used when you have no photo)"}</span>
        </p>
        <Swatches label="Background" colors={BGS} value={draft.look.bg} onPick={(c) => look({ bg: c })} />
        <Swatches label="Skin tone" colors={SKINS} value={draft.look.skin} onPick={(c) => look({ skin: c })} />
        <Swatches label="Outfit" colors={OUTFITS} value={draft.look.outfit} onPick={(c) => look({ outfit: c })} />
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Hair</p>
          <div className="flex gap-2">
            {HAIR_STYLES.map((h) => (
              <button key={h} type="button" aria-pressed={draft.look.hairStyle === h} onClick={() => look({ hairStyle: h })} className={`rounded-full p-0.5 ring-2 ${draft.look.hairStyle === h ? "ring-coral" : "ring-transparent"}`} aria-label={`Hair style ${h + 1}`}>
                <PersonAvatar person={{ id: `hair${h}`, look: { ...draft.look, hairStyle: h }, frame: "none" }} size={46} />
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Display name</span>
          <input
            value={draft.name}
            maxLength={20}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream focus:border-gold/50 focus:outline-none"
          />
          {fieldErrors.fullName ? <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-[#ff8a8f]">{fieldErrors.fullName}</span> : null}
        </label>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Gender</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
            {API_GENDERS.map((id) => {
              const on = gender === id;
              return (
                <button key={id} type="button" role="radio" aria-checked={on} onClick={() => { setGender(id); setDraft((d) => ({ ...d, gender: genderFromApi(id) })); }} className={`h-11 rounded-2xl text-[14px] font-semibold ring-1 ${on ? "bg-gold/15 text-cream ring-gold/60" : "bg-surface text-cream/75 ring-line"}`}>
                  {GENDER_LABELS[id]}
                </button>
              );
            })}
          </div>
          {fieldErrors.gender ? <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-[#ff8a8f]">{fieldErrors.gender}</span> : null}
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Date of birth</span>
          <input
            type="date"
            value={dob}
            min="1920-01-01"
            max={latestDob}
            onChange={(e) => setDraft((d) => ({ ...d, dob: e.target.value || undefined }))}
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream [color-scheme:dark] focus:border-gold/50 focus:outline-none"
          />
          {dobError || fieldErrors.dateOfBirth ? <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-[#ff8a8f]">{dobError || fieldErrors.dateOfBirth}</span> : null}
        </label>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Name font</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Name font">
            {NAME_FONTS.map((f) => {
              const on = (draft.nameFont ?? "default") === f.id;
              return (
                <button key={f.id} type="button" role="radio" aria-checked={on} aria-label={f.label} onClick={() => setDraft((d) => ({ ...d, nameFont: f.id }))} className={`flex h-14 flex-col items-center justify-center rounded-2xl px-2 ring-1 ${on ? "bg-gold/15 ring-gold/60" : "bg-surface ring-line"}`}>
                  <span className="max-w-full truncate font-display text-[17px] font-bold text-cream" style={nameFace(f.id)}>
                    {draft.name.trim() || "Your name"}
                  </span>
                  <span className="text-[10px] text-muted">{f.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">From VIP 6 your name also shines gold in this font.</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Bio</span>
          <textarea
            value={draft.bio}
            maxLength={BIO_MAX}
            rows={3}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
            className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-cream focus:border-gold/50 focus:outline-none"
          />
          <span className="mt-1 flex justify-between gap-2 text-[11px]">
            <span role={fieldErrors.bio ? "alert" : undefined} className="font-semibold text-[#ff8a8f]">{fieldErrors.bio}</span>
            <span className="text-muted">{draft.bio.length}/{BIO_MAX}</span>
          </span>
        </label>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Favorite games (up to 4)</p>
          {fieldErrors.favoriteGames ? <p role="alert" className="-mt-1 mb-2 text-[11.5px] font-semibold text-[#ff8a8f]">{fieldErrors.favoriteGames}</p> : null}
          <div className="flex flex-wrap gap-2">
            {GAMES.map((g) => {
              const on = draft.favoriteGames.includes(g.id);
              return (
                <button key={g.id} type="button" aria-pressed={on} onClick={() => toggleGame(g.id)} className={`flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold ${on ? "bg-cream text-ink" : "bg-surface text-cream/75"}`}>
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-center text-[12.5px] font-semibold text-[#ff8a8f]">
            {error}
          </p>
        ) : null}
        <Button size="lg" className="w-full" disabled={!valid || busy} aria-busy={saving || undefined} onClick={() => void save()}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {savingStep || "Saving…"}
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="flex gap-2.5">
        {colors.map((c) => (
          <button key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onPick(c)} className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-ink-2 ${value === c ? "ring-cream" : "ring-transparent"}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
