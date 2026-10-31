# Panchayat — web app

**Panchayat** (PLAY • CHAT • CONNECT) is a social gaming and voice-chat app. Opening the site shows the
app itself: a mobile-width interface centered in desktop browsers, and full screen on phones.
The original marketing page now lives at `/about`.

Sign-in uses the real Panchayat backend (see **Backend** at the end). Everything else is still frontend only: rooms, coins, gifts and chats are local demo data, with no database or payments.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion and Lucide icons.
Fonts are bundled locally via Fontsource.

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

Every route is prerendered, so it deploys as a static site (Vercel, Netlify or any Node host).

## The app (`/`)

| Area | What works |
| --- | --- |
| Bottom nav | Home, Rooms, Chat, Discover, Profile, switching without page reloads |
| Home | Logo, demo coin wallet, notifications, Ranking / Tasks / Friends sheets, game modes, featured VIP room, popular rooms, Watch Together, trending rooms, people to follow |
| Rooms | Search (name, host, topic, room ID), Voice / YouTube / Kharidari / VIP filters, Join by room ID, Create Room |
| Voice room | Host + seat grid, take/leave a seat, animated speaking rings, mute, speaker, raise hand, chat, emoji reactions, gifts, invite, Online / Members / Contribution panel (Daily, Weekly, Total), room level, room menu, leave, Watch YouTube |
| Background rooms | Minimise a room (chevron) and it keeps running: chatter, speaking and YouTube audio continue while a mini player above the nav lets you browse the app, mute, reopen or leave |
| YouTube Watch Together | The "video" option is YouTube only (no video calls). YouTube URL modal with validation and preview, official YouTube embed, friendly errors for private / removed / age-restricted / non-embeddable videos, voice seats, chat |
| VIP | Growth points: 1 coin spent = 100 points, VIP 1 to VIP 10 (10K to 50M points). VIP rooms need VIP 1. Benefits screen shows your progress, the ladder and perks, and a **Buy VIP 1** / **Get VIP N** button that spends the demo coins for the next level. VIP is a 30-day subscription (`VIP_DAYS` in `lib/app/store.tsx`): growth points only count while it runs, and when it ends (or you tap **End VIP now (demo)**) your level and points go back to 0 and every VIP reward disappears. Everyone (including Aryan's test account) starts as a non-VIP |
| Gifts | Bottom-sheet store with seven animated gifts (Cupid Heart, Sunset Romance, Dragon, Princess Flower, God of Wealth, Crystal Palace, Storm Guardian), recipient picker, quantity, demo coin balance; full-screen SVGA animation with sound and a sender → recipient banner |
| Chat | Conversation list with unread badges, search, new message, conversation view with emoji picker and simulated replies |
| Discover | Search people and rooms, community categories, special events with reminders, trending rooms, popular hosts, featured games, recommended people |
| Profile | Same simple layout for you and everyone else: banner, avatar, name, level, VIP, charm icon, ID, bio, a Charm / Guard / Gifts / BFF strip, your level bar, then Guard, BFF, Gifts received and Rooms cards. Below your own: coins, VIP, favorite games, settings, reset demo data |

Profile edits, demo coins, VIP and room points, permanent rooms and claimed tasks are saved in `localStorage` on that browser only.
Voice and synced playback need a realtime service and are clearly labelled as demos.

### Rooms, IDs and levels

- **Owner and admins**: the owner's seat is fixed at the top and never changes, in Kharidari too (the owner can't sit on the auction seat). Only the owner appoints and removes admins and can kick admins, and only people who have joined and followed the room can be made admins (leaving either removes the admin role). Admins can change the mode, all room settings (including the password), start and end Kharidari, mute people, take them off the mic, invite to seats, close seats and kick members. In the demo you are an admin in "Sunday chai adda" and the owner of rooms you create.
- **Seats**: laid out like the reference at the same proportions (85pt owner and partner seats with a heartbeat link, then 62pt seats in linked pairs), scaled to the screen width. Rooms have 10 seats by default.
- **Room profile and Settings**: tap the room name for the room profile (cover, tag, level, ID, room exp, owner and admins, Online / Members, Fans, announcement, share). The owner's gear opens Settings: Title, Cover (scene or uploaded picture), Announcement, Mode, Tag, Background, Partner Seat, High Quality Mode, Ban Text Chatting, No Images, Ban Red Packet, Password and Manage event. Admins can view Settings but not change them. "Carrom champions" is a sample password room (2580).
- **Join and Follow**: Join a room to become a member, Follow it to be a fan. Both show in Rooms under "Joined & following". Tap the room name for room info (Online, Members, Fans, announcement, permissions).
- **Kharidari (auction mode, WePlay style)**: someone sits on the auction seat. The person on the auction seat sets the **tag declaration**: the tag they want (Bro and sis, Besties, Bro, Confidant, Apprentice, Sibling) and a short line for bidders. The owner or an admin opens Settings and picks **Ordinary bidding** (the winner gets what's on offer, like a song) or **BFF**, plus a **starting price gift**. Seats are numbered 1–8 in a compact layout so the stage, seats, chat and bid bar all fit. Bids are gifts: every gift sent to the person on the auction seat adds to the sender's gift volume (gifts aren't refunded). The biggest gift volume when the 45 second timer ends wins (late bids add time). Try "Kharidari Bazaar" (ID 777001), or switch your own room to Kharidari from the room menu.
- **Charm (popularity)**: charm only comes from gifts you receive: every 5 coins of gifts = 1 charm point (every 2.5 coins on Double Charm Days, which are Saturdays and Sundays). Crossing 1K, 4K and 12K points gives Star 1–3; 30K, 80K and 160K give Diamond 4–6; 300K, 500K, 1M, 2M, 3.5M and 6M give Crown 7–12. The charm level badge sits next to the Lv pill. On profiles the badge shows the charm count where its level number is; everywhere else it's just the badge. All 12 levels have badge art in `public/charm/`, listed in `CHARM_BADGE_ART` in `lib/app/progress.ts`. Each `N-blank.png` is the badge with its number painted out: the app writes the level number there (or the count on profiles; from 1,000,000 it's shortened, e.g. 1.35M). The supplied art for levels 2–12 carried other numbers (10, 30, 40, 50, 5, 60, 70, 100, 130, 160, 200), which is why the number is written by the app. The charm icon shows on your profile, profile cards and room cards (for the host). Gifts on the auction seat count too.
- **Active Level (EXP)**: EXP to the next level is 200 + 12 × level². Sources, each with a daily cap: game wins (20 EXP per win via "Quick match" on a game, 400/day), voice rooms (on mic 4 EXP/min, listening 1 EXP/min, halving after 10 minutes and quartering after 30, 120/day), daily tasks (50 EXP per claim, 250/day), adding friends (10 EXP each, 50/day) and coin packs (packs of 10,000+ coins give 5,000–10,000 EXP instantly). Open "How to earn EXP today" on Profile to see today's progress per source.
- **Video gifts: Cupid Heart, Sunset Romance, Dragon, Princess Flower, God of Wealth and Crystal Palace**: legendary gifts (1,314, 5,200, 8,888, 9,999, 18,888 and 1,00,000 coins; Dragon plays in a smaller centred window with soft edges, set with `framed: true` on the gift) that play a full-screen video with sound inside the app frame when sent. Tap Skip to close early. The videos live in `public/gifts/` (H.264 MP4). Princess Flower's video came silent, so it has a made-up sound effect (music-box waltz, harp and sparkles, timed to its scenes), muxed into the MP4. Sunset Romance plays over the room with no dark backdrop (`floating: true`: full width at its own shape, soft top and bottom edges); its video was cropped to remove the black bands. It came silent too: its sound is beach waves and a soft guitar arpeggio, a shimmer into the cut at 2.7 s, then a warm chord and a short melody. Crystal Palace (from a silent HEVC .mov, re-encoded to H.264) also floats over the room; its sound is wind and wingbeats through the clouds, a whoosh into the white-out, a rising shimmer, then a crystal chord and choir when the palace appears at 5 s.
- **Storm Guardian**: the other old gifts (Rose, Heart Pop, Love Bear, Lucky Red Packet, Fireworks, Golden Crown, Magic Rocket, Royal Car, Panchayat Royal Entry and the Panchayat Hamper package gift) were removed. They're kept in `RETIRED_GIFTS` in `lib/app/data.ts` only so old chat lines and saves still show a name; they can't be sent, bots don't send them, and new accounts get no package gifts. Storm Guardian costs 132,900 coins and is an SVGA gift. Sending it plays `public/gifts/storm-guardian/gift.svga` once over the whole app (510×1104, 20 fps, 110 frames, 5.5 s) with its sound, then closes; Skip closes it early. The file is downloaded as soon as the gift is picked in a gift panel. With reduced motion it shows the gift's picture instead. The supplied file had its sound inside, which the `svga` web player can't decode (it fails with "The source image could not be decoded"), so the sound was split out into `gift.mp3` and `gift.svga` is the same animation without it.
- **Storm Guardian rewards**: sending the gift unlocks a set for the sender and puts every piece on: an animated frame (`frame.svga`, 260×260), a chat bubble (`bubble.svga`, 198×144), a room entry banner (`entry.svga`, 660×132) and a profile effect (`page.svga`, 510×1104: the guardian stands in the top-right and the rest is clear, drawn as wide as the screen over the top of your profile). They stay in Bag → Decorations (Permanent) to wear or take off. How each is fitted is in `GIFT_SETS` in `lib/app/effects.ts`. The receiver gets the gift's charm (132,900 ÷ 5 = 26,580) and, in rooms, coins, like any gift.
- **Gifting switch**: `GIFTS_LIVE` in `lib/app/data.ts` is on. Set it to `false` to show every gift as "Coming soon" and stop sending everywhere.
- **Gift cards and gift returns**: every gift in a room posts a gift card in chat: who sent what to whom ×count, a one-line description for video gifts, and what the receiver got back: **Charm** (5 coins = 1 point, doubled on weekends) and **Coins** (30% of the gift's value, set by `GIFT_EARN_SHARE` in `lib/app/progress.ts`). Gifts sent to you add those coins to your wallet. The sender never gets coins back.
- **Tags and the intimate space**: winning a BFF round makes the winner and the person on the auction seat a tag, with a token unlocked by the winning gift volume (Bicycle, Scooter 1,000+, Cottage 5,000+). Every coin of gifts between a tagged pair adds 1 intimacy, and intimacy levels the tag from Lv 1 to Lv 10 (520, 1,314, 3,344, 5,200 … 99,999). When tagged people sit beside each other, their tag token shows between their seats. Perks: tag badge and seat link (Lv 1), tag title like "Kabir's Bestie" on profile cards (Lv 3), glowing seats (Lv 5), an arrival announcement (Lv 7) and a spinning legend token (Lv 10). Open **My BFF** from the BFF card on any profile: your BFF cards (tap one for intimacy, perks, gifts and Remove), empty slots that take you to Kharidari, and a More slots row. Everyone starts with 3 slots and unlocks one more per VIP level, up to 6.
- **Ranking**: Home → Ranking, or the Ranking shortcut on Profile. Tabs for Popularity (charm), VIP (coins spent), Couple (love) and Room (room points), each for Today, Yesterday or This week, with a top-3 podium, the list, and your own row pinned at the bottom.
- **Shop**: Profile → Shop. The tabs are All, then the backend's shop categories, then Red packets (paid in rupees: 10K ₹499, 50K ₹1,999, 80K ₹2,199, which go to your Bag). Products come from the backend (see Backend → Shop); buying them waits for a purchase endpoint. The old built-in bubble and ring lists (`SHOP_BUBBLES`, `RINGS` in `lib/app/market.ts`) are no longer shown in the Shop, but the Bag and proposals still use them.
- **Sign in (real backend)**: the app opens on "Welcome to Panchayat" with Google's own "Continue with Google" button, or email with a 6-digit code. A new account (the backend says `profileCompleted: false`) then sets name, male or female and date of birth (18+); a returning account goes straight in. Profile → Log out signs out. See **Backend** below for setup.
  - Screens: `components/auth/AuthFlow.tsx`, `GoogleButton.tsx`, `OtpInput.tsx`, `parts.tsx`. (`ProviderDialogs.tsx` and `lib/auth/mock-auth.ts` are the old mock Google and Apple sheets, no longer used. Apple is hidden because the backend has no Apple endpoint.)
  - Calls: `lib/auth/auth.ts` (send-otp, verify-otp, google, complete-profile), all through `lib/api/client.ts`.
  - Token: `lib/auth/token.ts`. Session state: `session`, `signIn`, `completeProfile`, `signOut` in `lib/app/store.tsx`.
- **Bag**: Profile → Bag, laid out like an inventory. **Decorations**: rented chat bubbles with time left, the VIP 1 animated frame, chat bubble and entry banner while you're VIP (the VIP badge isn't in the Bag: it's always on), and the Storm Guardian frame, bubble, entry and profile effect once you've sent that gift. **Items**: red packets, rings and package gifts with counts. Tap any tile to see it and Wear / Take off, or use it. An "In Use" tag shows what you're wearing.
- **VIP effects**: each VIP level with its own set unlocks it (**VIP 1** gold horse set in `public/effects/vip1/`, **VIP 2** white horse and emerald set in `public/effects/vip2/`, **VIP 3** blue and gold eagle set in `public/effects/vip3/`, **VIP 4** fiery gold eagle set in `public/effects/vip4/`, **VIP 5** teal and gold leopard set in `public/effects/vip5/`, **VIP 6** blue and gold roaring-leopard set in `public/effects/vip6/`, **VIP 7** green and gold leopard set in `public/effects/vip7/`). Reaching a new level switches you to its set automatically; the lower sets stay in your Bag to wear instead. Buying **VIP 1** unlocks the VIP 1 set: an animated avatar frame, chat bubble, room entry banner and a badge next to your name (files in `public/effects/vip1/`; the badge also has a still `badge.png` for chat lines). Everything is switched on as soon as it unlocks. The frame, bubble and entry can be taken off and worn again in the Bag; the badge always shows while you're a VIP and isn't in the Bag. When the subscription ends, all four are removed automatically. The entry banner slides in from the right and stops on the right just below the last row of seats, showing "<name> entered" (the text shrinks to fit long names). Every VIP name has a light sweeping across it. For VIP 1–5 the name is red outside rooms (`.vip-red`: profiles, cards, lists) and white with a red shine inside a room (`.vip-shine`: seats and room chat); from VIP 6 it is gold everywhere (`.gold-shine`); see `vipName` in `lib/app/levels.ts`. The VIP badge (the animated badge from the VIP set) sits next to the name, and everyone gets an orange "Lv.N" pill with a ♂/♀ icon; levels start at Lv.1 (`components/profile/IdTags.tsx`). How each file is fitted (frame window, bubble text box, where the entry text goes) is set per VIP set in `lib/app/effects.ts`; `components/effects/VipFx.tsx` draws them.
- **CP (couples)**: tap **Find a CP** on your own CP card (or Propose on a ring in your Bag, or in your Love Home) to see everyone who is single, or open anyone's profile and tap Propose on the CP card, pick a ring from your Bag and write a message. In the demo they say yes after a few seconds. You both get a Love Home: days together, couple level (gifts between you add 1 love per coin, rings add their price), the ring box, Send a gift, Add a ring and End relationship. Couples can keep adding rings after they get together: tap **+ Add ring** in the ring box to add one from your Bag or buy one straight into the box (each ring adds its price as love). One CP at a time.
- **Red packets**: buy a 10K Gold (₹499), 50K Royal (₹1,999) or 80K Maharaja (₹2,199) red packet in Shop → Red packets or the wallet. Buying opens the checkout; once paid it goes to your Bag. To send, tap the red packet button in a room (or Send in a room on it in your Bag): pick the amount (one from your Bag is used for free, otherwise it's bought), pick a cover (Classic, Royal, Maharaja, Genda Phool, Mor Pankh) and when the rain starts (10 sec, 30 sec, 1 min or 3 min). Sending one puts an orange banner across the top of the app for everyone, with **Join** to hop into that room (no Join if the room is locked with a password). After a short countdown the packet rains in the room: tap the falling envelopes fast to grab coins until the pot is empty. You can't loot your own packet. In the demo, other people drop red packets around Panchayat every minute or so. Code: `lib/app/redpacket.ts`, `lib/app/redpacket-store.tsx`, `components/redpacket/RedPacket.tsx`.
- **Gift notifications**: when you pick a big animated gift (any of the five) in the gift panel, a box appears to write a message (up to 50 characters). Sending it puts a purple and gold banner across the top of the app for everyone: "X sent [gift] to Y in Voice Room 123456" with your message under it and **Join** (or Here / Locked, like red packets). Banners wait their turn behind red packet banners. In the demo, other people send big gifts with messages every minute or so. Code: `lib/app/gift-news-store.tsx`, `components/gifts/GiftBanner.tsx`.
- **PK battles**: in a voice room, the owner or an admin taps **PK** next to Watch YouTube. Pick **1v1** (the two top seats face off) or **Multiplayer PK** (the owner's seat and the left pairs are red, the partner seat and the right pairs are blue), the rule (**Based on gifts**: 1 charm received = 1 score, or **Based on votes**, "PK support": everyone gets one vote) and 3, 5, 10, 15, 30 or 60 minutes. Initiate PK shows the score bar and PK seat tags; Start begins the clock. Top supporters show on each side, chat gets system messages, and the winner shows when time is up. The power button closes it. Code: `components/rooms/usePk.ts`, `components/rooms/PkParts.tsx`.
- **Room music**: the disc pill beside the top seats opens the room's songs. **Library** has 5 original instrumentals (made by `scripts/compose-music.py` and `scripts/compose-songs.py`, no rights issues); **Order** adds one to the room's list, with play/pause, next, repeat, seek and volume. **Contribute** lets you upload your own song (audio, up to 15 MB): it goes into review and goes live in the Library 2–3 days later ("Demo: finish review now" skips the wait in this preview). Uploaded files stay in this browser (IndexedDB). Code: `lib/app/music.ts`, `lib/app/music-store.tsx`, `components/rooms/RoomMusic.tsx`.
- **Blessings**: anyone can bless someone else's couple from the couple's profile (🙏 Bless on the CP card) or their Love Home. A blessing costs 99 coins and adds 99 love to the couple. The Love Home shows the blessing count and who blessed them, and the CP card shows the count. You can't bless your own CP; in the demo, friends bless yours now and then.
- **No built-in frames**: the old CSS avatar frames (Gold leaf, Coral glow, Marigold, Royal, and the rented Shop frames) were removed. The only avatar frames are the animated VIP frame and the top-3 leaderboard frames. SVGA effects play with the `svga` web player (`components/effects/SvgaAnim.tsx`).
- **VIP 6+ perks and VIP rooms**: from VIP 6 your name turns gold with a shining light sweep everywhere it shows (profile, seats, chat, ranking, entry banner). Your rooms become VIP rooms: their name shines gold too, the owner gets three VIP-only backgrounds (Royal Darbar, Sheesh Mahal, Golden Aurora) and a **Seat access** setting (VIP 1+, 3+, 6+ or 10+). Only VIP members at that level or above can take a seat or be invited to one; everyone else can still listen and chat. The gold-name level is `GOLD_NAME_VIP` in `lib/app/levels.ts`.
- **Visitors**: Profile → Visitors. Opening someone's profile records a visit (who and when, counting repeat visits). "Who visited me" lists people who opened your profile, newest first, with a NEW mark for visits you haven't seen yet; "I visited" lists profiles you opened. New visits show a toast, a "+N new" badge on the Visitors button and a dot on the Profile tab. In the demo, online people drop by now and then, and sometimes visit back after you open their profile. Only you can see your lists.
- **Visitor log**: seeing who visited takes a visitor log, bought with coins: 2 days 60, 7 days 200, 1 month 1,200. Until then the counts show but names and pictures are hidden (and the visit toast says "Someone"). Buying again while it's on adds the days. "I visited" is always free. Saved on this device only. Code: `VISITOR_LOG_PLANS` in `lib/app/market.ts`, `lib/app/market-store.tsx`, `components/profile/VisitorsScreen.tsx`.
- **Checkout (demo payment gateway)**: UPI ID, debit/credit card (number check, expiry, CVV) or net banking, a price summary, a processing step and a receipt with an order ID. **No real payment happens**: no gateway is called, nothing is charged, and card or UPI details are never saved, sent or logged. To go live, the backend has to create the order and verify the payment (e.g. Razorpay or Cashfree) before the packet is granted; swap `pay` in `components/market/CheckoutSheet.tsx`.
- **Name fonts**: Edit profile → Name font, and room Settings → Name font. Pick Classic, Pacifico, Dancing Script, Royal Cinzel, Yatra or Righteous; the font shows wherever the name appears. VIP 6+ names and VIP room names keep their chosen font and just shine gold on top. Fonts are listed in `lib/app/fonts.ts`.
- **Package gifts and gifting yourself**: the gift panel has a **Package** tab with gifts you own (new accounts start with none, now that the old gifts are gone). Package gifts are free to send and still give the receiver full charm and coins. They also show in Bag → Gifts. You can pick **Me** as the receiver to send a gift to yourself.
- **Parivar (family), coming soon**: the Discover card shows "Coming soon" and the profile section and name tags are hidden. Everything below is built; set `PARIVAR_ENABLED = true` in `lib/app/parivar.ts` to switch it on. When on: Discover → Parivar, or the Parivar card on any profile. Browse and search Parivars (by name, tag or ID), see the weekly ranking, and join (open Parivars) or apply (approval Parivars; in the demo the Mukhiya says yes after a few seconds). Create your own for 5,000 coins with a name, a 2–4 letter tag, an emblem, a colour, an announcement and who can join. Roles: **Mukhiya** (leader), **Up-Mukhiya** (deputies) and **Sadasya** (members). The Mukhiya promotes and demotes, hands over Mukhiya, removes members, sets who can join and can disband; Up-Mukhiyas accept requests, remove Sadasyas and edit the announcement. Parivar EXP comes from the daily check-in (+50) and gifts members send (1 EXP per 10 coins); levels 1–7 at 0, 5K, 20K, 60K, 150K, 400K and 1M EXP. Each level holds 5 more members (20 at Lv 1) and adds Up-Mukhiya seats. Members get the Parivar tag next to their name on profiles and in room chat, and there is a Parivar chat. Accounts start in no Parivar. Logic lives in `lib/app/parivar.ts` and `lib/app/parivar-store.tsx`.
- **Profiles for everyone**: tap any person (Ranking, Discover, Friends, or the avatar on a room profile card) to open their profile page, with Follow, Message and Gift at the bottom. A new account starts from zero: level 0, 0 charm, VIP 0, no gifts, no guard and no BFF.
- **Guard (protect each other)**: open Guard on anyone's profile and tap Protect: +30 guard, free, once per person per day, shown as "My Guard". Guard is its own counter and never adds charm. The Guard page lists every guardian by guard given.

- **Permanent room**: costs 1,000 coins, one per user, saved and listed under Your rooms. It levels from Lv.1 to Lv.10: every 1 coin gifted inside it adds 100 room points (levels at 0, 10K, 50K, 150K, 400K, 1M, 2.5M, 5M, 10M, 25M points). Thresholds live in `lib/app/levels.ts`.
- **Temporary room**: free, no level, closes as soon as you leave it.
- **Join by room ID**: Rooms tab, "Join by ID".
- **Add friend by user ID**: Friends sheet "Add by ID", or Chat, new message, "Find someone by user ID". Discover search also matches IDs.

### App code

```
app/page.tsx                 renders <AppShell />
components/layout/AppShell   desktop frame, tab screens, screen stack, sheets, gift overlay, toasts
components/navigation/       BottomNav
components/home|rooms|chat|discover|profile|vip|gifts|sheets/
components/art/              original SVG artwork: SunsetScene (room covers), GameArt, GiftArt
components/ui/               Modal, BottomSheet, EmojiPicker, PersonAvatar, Toasts, kit (buttons, chips…)
lib/app/                     types, sample data, app store (React context), YouTube helpers
```

To add a game, gift or room, edit `lib/app/data.ts`.

## About page (`/about`)

Hero → Features (Voice Rooms, Play Together, Meet Your Community) → Coming Soon → Waitlist → Footer.

## Music

The navbar has a **Play music** button. It plays `public/audio/panchayat-raag.mp3`, an original
instrumental in Raag Bhupali (bansuri-style flute, tanpura drone, tabla in Keherwa taal) that was
synthesised from scratch by `scripts/compose-music.py`, so there are no rights issues.
Music never autoplays (browsers block it, and visitors should choose); it fades in when clicked and loops.

To use a different track, replace the mp3 (keep the name, or change `TRACK` in `components/MusicToggle.tsx`).
Only use music you own or have a licence for.

## Online chess

Home → Game Modes → Chess → **Play online chess** opens a real game against
another player (`components/games/ChessScreen.tsx`). It comes from
[DevChess](https://github.com/DevdharManpuria/devchess) (MIT): the game server
is in `chess-server/`, and the board uses chess.js and DevChess's piece
pictures (`public/chess/`).

- Start the server: `cd chess-server && npm install && PORT=8090 npm run dev`.
- The app connects to `NEXT_PUBLIC_CHESS_WS_URL` (default `ws://localhost:8090`).
  On an https site this must be a `wss://` address.
- Find a match pairs you with the next player who taps it. Moves are checked by
  the server. Leaving mid-game (or losing the connection) loses the game.
- Pawns promote to a queen automatically.
- The chess server has no accounts, so the opponent shows as "Opponent" and wins
  give no EXP.

## Things to set before going public

| What | Where |
| --- | --- |
| Logo | `public/brand/panchayat-logo.png` (official artwork, already in use). Settings in `BRAND` in `lib/site.ts`. |
| Favicon (placeholder crown) | Replace `app/icon.svg`. |
| Open Graph image (generated) | `app/opengraph-image.tsx`, or add a designed `app/opengraph-image.png`. |
| Production domain | `SITE.url` in `lib/site.ts`. |
| Social links / contact email | `SOCIAL_LINKS`, `CONTACT_EMAIL` in `lib/site.ts`. Empty values show as “(soon)”, never dead links. |
| Privacy Policy / Terms | Placeholder pages in `app/privacy` and `app/terms`. |
| Real waitlist | `submitToWaitlist()` in `components/sections/WaitlistForm.tsx`. |

## The waitlist form is a demo

`WaitlistForm` validates the email in the browser and shows a success state. It makes no network
request and stores nothing. To go live, replace the body of `submitToWaitlist()`.

## Structure

```
app/            layout (metadata, fonts), page, globals.css, icon, OG image, placeholder pages
components/
  brand/        Logo (uses the official PNG), Crown
  mock/         Avatar, VoiceRing, GameTile: illustrated mock UI
  sections/     Navbar, HeroSection, FeaturesSection, FeatureCard, ComingSoonSection,
                WaitlistSection, WaitlistForm, Footer, InfoPage
  ui/           Button, Reveal, SectionHeading, FloatingIcon, ComingSoonBadge
  MusicToggle.tsx
lib/            site.ts (config), mock-data.ts (fictional people and games)
public/         brand/ (logo, pattern), audio/ (music)
scripts/        compose-music.py
```
# panchayat-website-

## Backend

The app signs in against the Panchayat Spring Boot backend.

1. `.env.local` holds the settings (`.env.example` shows them all):
   - `BACKEND_URL`: the backend's address (with or without `/api/v1`). The browser calls this app's own `/backend/...` path and the Next.js server forwards it there (`rewrites` in `next.config.ts`), so the browser never talks to ngrok directly and there's no CORS preflight. If it's missing, the default in `lib/config.ts` is used. The ngrok URL changes each time the tunnel restarts; change it in one of those two places. `NEXT_PUBLIC_API_BASE_URL` is ignored unless `NEXT_PUBLIC_USE_API_PROXY=false` (only for hosting with no Next.js server).
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: the Google OAuth **Web** client ID. Without it the Google button says it isn't set up yet.
   - `NEXT_PUBLIC_SEND_NGROK_HEADER`: `true` by default. Every API call sends `ngrok-skip-browser-warning: 1` so ngrok's free-tier warning page never replaces an API answer. Set it to `false` once the backend isn't behind ngrok.
2. Restart `npm run dev` after changing `.env.local` (Next.js reads it at startup).
3. Google Cloud Console → APIs & Services → Credentials → the Web client → **Authorized JavaScript origins**: add `http://localhost:3000` (and any other origin the frontend runs on). The popup button needs no redirect URI. The backend must check the ID token's audience against the same client ID.
4. Backend CORS isn't needed while requests go through the `/backend` proxy. Only with `NEXT_PUBLIC_USE_API_PROXY=false` must it allow the frontend origin, methods `GET, POST, PATCH, OPTIONS`, and headers `Content-Type, Authorization, ngrok-skip-browser-warning`.

Endpoints used: `POST /api/v1/auth/send-otp {email}`, `POST /api/v1/auth/verify-otp {email, otp}`, `POST /api/v1/auth/google {idToken}` (the Google ID token), and `POST /api/v1/auth/complete-profile {fullName, gender: "Male"|"Female", dateOfBirth: "YYYY-MM-DD"}` with `Authorization: Bearer <backend JWT>`.

**Token storage**: the backend returns its JWT in the response body and expects it back as a Bearer header, so it's kept in `localStorage` (`panchayat-auth-token-v1`) to survive reloads. This is not safe against XSS: any script running on the page could read it. If the backend moves to an HttpOnly, Secure, SameSite cookie, drop `lib/auth/token.ts` and send requests with `credentials: "include"`. There's no refresh token: when the JWT's `exp` passes, or a protected call gets 401/403, the app signs out and asks you to sign in again. Sign-in calls never send a token and never trigger a sign-out, so there are no redirect loops.

### Your profile and stats

- `GET /api/v1/users/me` loads when you sign in and each time you open the Profile tab (skipped if it loaded in the last 30 seconds). Name, bio, gender, date of birth, name font, favorite games and the cartoon-avatar look replace the demo profile's values. `avatarUrl`/`bannerUrl` (https only) are your picture and banner. When `profileCompleted` is false, the Profile tab shows a "Complete" prompt.
- `GET /api/v1/users/me/stats` (`level`, `expPoints`, `charmPoints`, `vipPoints`) feeds your Profile tab: the level pill, charm badge and count, the level card, and VIP status. These numbers are display-only. VIP level is read off the app's VIP thresholds, and the EXP bar off the app's level curve, because the backend sends only totals.
- Edit profile → Save sends only changed fields to `PATCH /api/v1/users/me`: `fullName` (1–100), `gender` (`MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`), `dateOfBirth` (past, 18+), `bio` (120 max), `nameFont` (30 max), `favoriteGames` (up to 4, no repeats, `CHESS` `LUDO` `MIC_GRAB` `CARROM` `POOL` `DRAW_AND_GUESS` `ANTAKSHARI` `CARD_NIGHT`), `avatarBackground`/`avatarSkinTone`/`avatarOutfit` (hex colours) and `avatarHair` (`"0"`–`"3"`). The same rules are checked before sending (`validateProfileUpdate`). Never `avatarUrl` or `bannerUrl`.
- Other people's profiles: opening a backend user's profile (someone from a voice room) calls `GET /api/v1/users/{id}/profile` and shows only what it returns (name, bio, picture, banner, font, look). "User not found" on 404, error with Retry otherwise. Code: `components/profile/usePublicProfile.ts`.
- Code: `lib/api/users.ts` (`getMyProfile`, `getPublicProfile`, `updateMyProfile`, `getMyStats`, `validateProfileUpdate`), `lib/app/me-store.tsx` (`useMe`).
- **Profile picture and banner**: Edit profile → tap the picture or banner → pick a JPG, PNG or WebP (picture up to 5 MB, banner up to 8 MB) → preview → Save uploads it with `POST /api/v1/users/me/avatar` or `/banner` (multipart, field `file`, Bearer token). The backend stores it on Cloudinary and returns `avatarUrl`/`bannerUrl`; only that URL is shown, everywhere your picture appears. Remove photo/banner asks for confirmation, then calls `DELETE /api/v1/users/me/avatar` or `/banner`. A picture that fails to load falls back to the cartoon avatar or default banner. Code: `lib/api/users.ts` (`uploadProfileImage`, `deleteProfileImage`), `lib/app/me-store.tsx` (`uploadImage`, `removeImage`). The browser never talks to Cloudinary and has no Cloudinary keys. (`lib/app/local-images.ts`, the old on-device storage, is no longer used.)
- Level, charm and VIP shown elsewhere (rooms, chat, ranking, VIP effects) still use the demo numbers.

### Shop

- `GET /api/v1/shop/categories` makes the tabs (All first, Red packets last). `GET /api/v1/shop/products` fills All, `GET /api/v1/shop/products?categoryId={id}` fills a category, and `GET /api/v1/shop/products/{id}` loads the product sheet you get by tapping a card. All are sent with the Bearer token.
- Items with `active: false` are hidden, and lists are sorted by `displayOrder`. Lists may be a plain array or wrapped in `data`/`content`. Missing fields are simply not shown; a missing price shows "Price not set". There's no fallback catalogue: if a call fails, the Shop shows the error with Retry.
- Pictures (`components/market/ShopProductAsset.tsx`): `IMAGE` and `SVG` show as an image; `SVGA` plays on a canvas with the `svga` package (2.1.1) through `components/effects/SvgaAnim.tsx`. When `assetType` is missing it's taken from the URL's extension (query strings are ignored). An SVGA is only downloaded and played while its card is on or near the screen, each file is downloaded and parsed once per visit, and the player is destroyed when the card scrolls away or the Shop closes. With reduced motion on, an SVGA plays once instead of looping. Anything that can't load shows "No preview".
- The asset host (Cloudinary) must allow cross-origin `GET` for `.svga` files, since the player downloads them with `fetch`. Cloudinary does by default.
- Buying a product shows a "not open yet" message: the backend has no purchase endpoint yet, and coins are never spent on the client for these.
- Code: `lib/api/shop.ts`, `components/market/ShopScreen.tsx`, `components/market/ShopProductAsset.tsx`.

### Voice rooms (backend + LiveKit)

Signed-in users get real rooms from `/api/v1/voice-rooms` (see `lib/api/voice-rooms.ts`):

- **Rooms tab → Live rooms** lists `GET /voice-rooms` with loading, empty and error/Retry states. Closed rooms are hidden. The backend sends no participant count, so cards show "Up to N" (the room's `maxParticipants`) instead.
- **Create Room** sends `POST /voice-rooms` with `name`, `description` (only when filled), `roomType` (`VOICE`/`WATCH`/`KHARIDARI`), `isPrivate` and `maxParticipants` (2–50). Cover, category and seat count are remembered on this device only.
- **Entering a room** calls `POST /voice-rooms/{id}/join`, then connects to the LiveKit URL and token from that answer with `livekit-client`. The browser never makes tokens and never sees the LiveKit secret. The mic is only requested when you tap Unmute (you need a seat first).
- **Leaving** disconnects LiveKit first, then calls `POST /leave` once. Leaving your own temporary room calls `POST /close` instead.
- **Close room** (room ⋯ menu, owner only) calls `POST /close` after a confirmation. This closes the room in the backend; whether people already in the LiveKit call are disconnected is up to the backend.
- **Who's in the room** comes from two sources, merged by user id so nobody shows twice: `GET /voice-rooms/{id}/participants` (names, roles, stored mute flag) and LiveKit (who is connected now, mic and speaking). The list reloads when LiveKit reports a join or leave; there is no polling. Seats show these real people: the owner on seat 0 while present, then everyone else in join order.
- **Header count** is `GET /voice-rooms/{id}/participants/count` (database records). The voice bar's number is people connected to LiveKit right now. They can differ.
- **Moderator mute** (owner/admin, from a person's card) sends `PATCH /voice-rooms/{id}/mute` with `userId`, `trackSid` (their LiveKit mic track) and `muted`. Your own mic button only uses LiveKit.
- The LiveKit identity must be the backend user id (`42` or `user-42`) so the two sources line up. Participant field names accepted are in `PARTICIPANT_FIELDS` in `lib/api/voice-rooms.ts`.
- Chat, gifts and room mode are still local to each device.

If the join answer uses other field names than `serverUrl`/`token`, add them to `JOIN_FIELDS` in `lib/api/voice-rooms.ts`. The LiveKit server must be reachable from the browser (`wss://` on an https site).
