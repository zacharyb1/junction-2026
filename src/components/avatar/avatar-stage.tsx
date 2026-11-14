"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { nextClip } from "@/lib/avatar/scheduler";
import type { Activity, Clip, Manifest } from "@/lib/avatar/types";

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

/** Keep the outgoing frame visible until the incoming video has decoded a frame. */
export function AvatarStage({ manifest, activity, paused }: { manifest: Manifest; activity: Activity; paused: boolean }) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const desired = useRef(activity);
  const refresh = useRef<(() => void) | null>(null);
  const [snapshot, setSnapshot] = useState({ clip: "poster", pose: manifest.restPose });
  const [failure, setFailure] = useState("");
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);

  useEffect(() => {
    desired.current = activity;
    refresh.current?.();
  }, [activity]);

  useEffect(() => {
    const videos = [first.current!, second.current!];
    if (paused || reduced) return;
    let disposed = false;
    let failed = false;
    let active = -1;
    let current: Clip | null = null;
    let prepared: Clip | null = null;
    let serial = 0;
    let count = 0;
    let swapping = false;
    let pendingVideo: HTMLVideoElement | null = null;
    let frameId: number | undefined;
    let frameVideo: HTMLVideoElement | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const fail = () => {
      if (disposed) return;
      failed = true;
      videos.forEach((video) => video.pause());
      setFailure("This clip could not play. The conversation still works. Reload to retry.");
    };
    const prepare = () => {
      if (disposed || failed || swapping) return;
      const clip = nextClip(manifest, current?.to ?? manifest.restPose, desired.current, count);
      if (!clip) { fail(); return; }
      if (prepared?.id === clip.id) return;
      prepared = clip;
      serial++;
      const video = videos[active === 0 ? 1 : 0];
      video.src = clip.file;
      video.load();
    };
    const swap = async () => {
      if (disposed || failed || swapping || document.hidden) return;
      prepare();
      if (!prepared) return;
      const incoming = videos[active === 0 ? 1 : 0];
      if (incoming.readyState < 3) {
        clearTimeout(watchdog);
        watchdog = setTimeout(fail, 15_000);
        return;
      }
      clearTimeout(watchdog);
      swapping = true;
      pendingVideo = incoming;
      const token = serial;
      const clip = prepared;
      const reveal = () => {
        if (disposed || token !== serial || failed) return;
        if (active >= 0) {
          videos[active].pause();
          videos[active].classList.remove("avatar-visible");
        }
        incoming.classList.add("avatar-visible");
        active = videos.indexOf(incoming);
        current = clip;
        prepared = null;
        count++;
        swapping = false;
        pendingVideo = null;
        setFailure("");
        setSnapshot({ clip: clip.id, pose: clip.from });
        prepare();
      };
      try {
        incoming.currentTime = 0;
        if ("requestVideoFrameCallback" in incoming) {
          frameVideo = incoming;
          frameId = incoming.requestVideoFrameCallback(reveal);
        }
        await incoming.play();
        if (disposed) { incoming.pause(); return; }
        if (!("requestVideoFrameCallback" in incoming)) reveal();
      } catch (error) {
        // A hidden tab pauses both videos, which can reject a pending play().
        // Keep its decoded-frame callback: visibility resumes the same incoming clip.
        if (error instanceof DOMException && error.name === "AbortError" && document.hidden) return;
        if (!disposed) fail();
      }
    };
    const ready = () => { if (active < 0 || videos[active].ended) void swap(); };
    const visibility = () => {
      if (document.hidden) videos.forEach((video) => video.pause());
      else if (pendingVideo) void pendingVideo.play().catch(fail);
      else if (active < 0 || videos[active].ended) void swap();
      else void videos[active].play().catch(fail);
    };
    videos.forEach((video) => {
      video.addEventListener("canplay", ready);
      video.addEventListener("ended", swap);
      video.addEventListener("error", fail);
    });
    document.addEventListener("visibilitychange", visibility);
    refresh.current = prepare;
    prepare();
    watchdog = setTimeout(() => { if (active < 0) fail(); }, 15_000);
    return () => {
      disposed = true;
      serial++;
      refresh.current = null;
      clearTimeout(watchdog);
      if (frameId !== undefined) frameVideo?.cancelVideoFrameCallback(frameId);
      document.removeEventListener("visibilitychange", visibility);
      videos.forEach((video) => {
        video.removeEventListener("canplay", ready);
        video.removeEventListener("ended", swap);
        video.removeEventListener("error", fail);
        video.pause();
        video.classList.remove("avatar-visible");
        video.removeAttribute("src");
        video.load();
      });
    };
  }, [manifest, paused, reduced]);

  return (
    <div>
      <div className="avatar-stage" data-clip={paused || reduced ? "poster" : snapshot.clip} data-pose={snapshot.pose} data-activity={activity}>
        {/* Local profile artwork; its dimensions are supplied by the manifest. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={manifest.poster} alt={manifest.placeholder ? "Test scene for checking avatar transitions" : manifest.label} width={manifest.width} height={manifest.height} />
        <video ref={first} muted playsInline preload="auto" aria-hidden="true" />
        <video ref={second} muted playsInline preload="auto" aria-hidden="true" />
      </div>
      {reduced && <p className="avatar-caption">Motion is off because of your device preference.</p>}
      {failure && <p role="alert" className="avatar-caption">{failure}</p>}
    </div>
  );
}
