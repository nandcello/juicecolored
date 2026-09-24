"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@personal/convex";
import { hasConvexUrl } from "#/lib/convex-provider";
import { formatListeningAge } from "#/lib/listening";

import type { FunctionReturnType } from "convex/server";
import type { RecentFoodItem } from "../recently-eaten";

export type PortfolioStatusProps = {
  initialListeningStatus: FunctionReturnType<typeof api.listening.get>;
  initialRecentFood: RecentFoodItem[] | null;
};

export function SmallPleasures(props: PortfolioStatusProps) {
  return hasConvexUrl ? <LiveSmallPleasures {...props} /> : <PleasuresContent {...props} />;
}

function LiveSmallPleasures(props: PortfolioStatusProps) {
  const food = useQuery(api.food.recent);
  const listening = useQuery(api.listening.get);
  return (
    <PleasuresContent
      initialRecentFood={food === undefined ? props.initialRecentFood : food}
      initialListeningStatus={listening === undefined ? props.initialListeningStatus : listening}
    />
  );
}

function PleasuresContent({
  initialRecentFood,
  initialListeningStatus: status,
}: PortfolioStatusProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activePhoto, setActivePhoto] = useState<RecentFoodItem | null>(null);
  const [now, setNow] = useState<number>();
  const needsClock = Boolean(status && !status.isPlaying);
  useEffect(() => {
    if (!needsClock) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [needsClock]);

  const items = initialRecentFood?.slice(0, 5) ?? [];
  const track = (
    <>
      {status?.trackName} <span aria-hidden="true">↗</span>
    </>
  );

  return (
    <>
      <div className="spread-label">
        <span>05 — IN BETWEEN BUILDS</span>
        <span>A FEW PERSONAL NOTES</span>
      </div>
      <div className="pleasures-layout">
        <div>
          <h2>
            Good food.
            <br />
            <em>Good mood.</em>
          </h2>
          <p>{items.length ? "I've been munching on…" : "A little room for the next good meal."}</p>
          {status ? (
            <div className="music-note">
              <span className="eyebrow">
                {status.isPlaying ? "LISTENING NOW" : "ON THE PLAYLIST"}
              </span>
              {status.spotifyUrl ? (
                <a href={status.spotifyUrl} target="_blank" rel="noopener noreferrer">
                  {track}
                </a>
              ) : (
                <p className="track-name">{status.trackName}</p>
              )}
              <span className="snapshot-note">
                {status.isPlaying ? (
                  <>
                    On repeat{" "}
                    <span className="listening-disc" aria-hidden="true">
                      📀
                    </span>
                  </>
                ) : now ? (
                  `Last played ${formatListeningAge(status.playedAt, now)}.`
                ) : (
                  "Recently played."
                )}
              </span>
            </div>
          ) : null}
        </div>
        <div className="food-gallery">
          {items.map((item, index) => (
            <button
              key={item._id}
              className={`food food-${index + 1}`}
              aria-label={`Enlarge meal photo ${index + 1}`}
              onClick={() => {
                setActivePhoto(item);
                dialogRef.current?.showModal();
              }}
            >
              <img
                src={item.imageUrl}
                width={700}
                height={700}
                alt={`Recent meal ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="folio">
        <span>SMALL PLEASURES, COLLECTED</span>
        <span>10 / 11</span>
      </div>
      <dialog
        ref={dialogRef}
        id="photo-dialog"
        aria-label="Meal photo"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <form method="dialog">
          <button aria-label="Close photo">Close ×</button>
        </form>
        {activePhoto ? <img src={activePhoto.imageUrl} alt="Enlarged recent meal" /> : null}
      </dialog>
    </>
  );
}
