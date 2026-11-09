"use client";

import dynamic from "next/dynamic";

/** The gift panel in its own chunk, so entering a room and connecting voice don't wait for it. */
export const GiftPanel = dynamic(() => import("./GiftPanel").then((m) => m.GiftPanel), { ssr: false });
