"use client";

import { useState } from "react";
import { resolveImageSrc } from "@/lib/media/image-src";

/**
 * Shows an image from the shared chat when the reader is allowed to load it, otherwise
 * an honest placeholder that says why. A failed load also falls back to the placeholder.
 */
export function ImageBlock({
  src,
  alt,
  width,
  height,
  hostedElsewhere,
}: {
  src: string | null | undefined;
  alt?: string;
  width?: number | null;
  height?: number | null;
  hostedElsewhere?: string;
}) {
  const resolved = resolveImageSrc(src);
  const [failed, setFailed] = useState(false);
  const label = alt && alt.trim() !== "" ? alt : "Image from the shared chat";

  if (resolved && !failed) {
    return (
      <figure className="my-5 max-w-full">
        {/* Source is validated in src/lib/media/image-src.ts; next/image cannot load data URLs or arbitrary hosts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={label}
          width={width ?? undefined}
          height={height ?? undefined}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-auto max-w-full border-2 border-ink"
        />
      </figure>
    );
  }

  const reason = failed
    ? "This image couldn't be loaded."
    : hostedElsewhere
      ? "This image is hosted outside ChatGPT, so Gpt View doesn't load it."
      : "This image is stored on ChatGPT's servers, so it can't be shown in this reader yet.";

  return (
    <figure
      className="my-5 border-2 border-dashed border-ink p-4 text-sm text-body"
      data-testid="image-placeholder"
    >
      <p className="font-semibold">Image · {label}</p>
      <p className="mt-1">{reason}</p>
      {typeof src === "string" && /^https:\/\//i.test(src) && !resolved ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-block font-semibold underline"
        >
          Open the original link
        </a>
      ) : null}
      {width && height ? (
        <p className="mt-1 text-grey">
          Original size {width} × {height}
        </p>
      ) : null}
    </figure>
  );
}
