/* eslint-disable react-hooks/immutability, react-hooks/refs --
   Aturan React Compiler ini tidak cocok untuk objek pemutar native: API resmi expo-video memang dikendalikan dengan
   menetapkan properti (player.muted, player.currentTime, player.scrubbingModeOptions) di effect dan handler gestur.
   Ref di SeekBar hanya dibaca di dalam handler PanResponder (saat sentuhan), tidak saat render. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';

// Pemutar video bergaya TikTok yang dipakai feed Home dan pemutar di halaman produk.
// Ketuk = jeda/putar; bilah di tepi bawah = ketuk untuk lompat, geser untuk maju/mundur.
// Video tegak (sekitar 9:16) memenuhi layar; video persegi/landscape tampil utuh dengan ruang hitam.
// Hanya komponen ini yang memasang pemutar, dan induknya hanya merender satu untuk slide aktif.
export function FeedVideo({
  uri, width, height, muted, onReady, paused = false,
}: { uri: string; width: number; height: number; muted: boolean; onReady?: () => void; paused?: boolean }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack ?? null });
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  // `paused` dari induk (mis. layar Home tidak lagi tampil): jeda; saat kembali, lanjut kecuali pengguna
  // memang menjedanya sendiri.
  useEffect(() => {
    if (paused) player.pause();
    else if (!userPausedRef.current) player.play();
  }, [paused, player]);

  const size = videoTrack?.size;
  const aspect = size && size.height > 0 ? size.width / size.height : null;
  const fit = aspect !== null && aspect > 0.65 ? 'contain' : 'cover';

  const toggle = () => {
    if (player.playing) {
      player.pause();
      userPausedRef.current = true;
      setUserPaused(true);
    } else {
      player.play();
      userPausedRef.current = false;
      setUserPaused(false);
    }
  };

  if (status === 'error') return null;
  return (
    <>
      <VideoView
        player={player}
        style={[styles.fill, { width, height }]}
        contentFit={fit}
        nativeControls={false}
        onFirstFrameRender={onReady}
      />
      <Pressable style={[styles.fill, { width, height }]} onPress={toggle} accessibilityLabel="Putar atau jeda video" />
      {userPaused && (
        <View style={styles.pauseIcon}>
          <Feather name="play" size={64} color="rgba(255,255,255,0.85)" />
        </View>
      )}
      {status === 'loading' && <ActivityIndicator style={styles.spinner} color="#fff" />}
      <SeekBar player={player} />
    </>
  );
}

const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

// Saat digeser, video dijeda dan kembali berputar bila sebelumnya sedang diputar.
function SeekBar({ player }: { player: VideoPlayer }) {
  const [ratio, setRatio] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [label, setLabel] = useState('');
  const widthRef = useRef(1);
  const startRatio = useRef(0);
  const scrubbingRef = useRef(false);
  const resume = useRef(false);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (scrubbingRef.current || !(player.duration > 0)) return;
    setRatio(Math.min(1, currentTime / player.duration));
  });

  const seek = useCallback(
    (r: number) => {
      const clamped = Math.min(1, Math.max(0, r));
      setRatio(clamped);
      if (player.duration > 0) {
        player.currentTime = clamped * player.duration;
        setLabel(`${fmtTime(clamped * player.duration)} / ${fmtTime(player.duration)}`);
      }
    },
    [player]
  );

  const pan = useMemo(() => {
    const end = () => {
      scrubbingRef.current = false;
      setScrubbing(false);
      player.scrubbingModeOptions = { scrubbingModeEnabled: false };
      if (resume.current) player.play();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // jangan biarkan daftar video merebut sentuhan saat menggeser
      onPanResponderGrant: e => {
        scrubbingRef.current = true;
        setScrubbing(true);
        resume.current = player.playing;
        player.pause();
        player.scrubbingModeOptions = { scrubbingModeEnabled: true };
        startRatio.current = e.nativeEvent.locationX / widthRef.current;
        seek(startRatio.current);
      },
      onPanResponderMove: (_e, g) => seek(startRatio.current + g.dx / widthRef.current),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, [player, seek]);

  return (
    <>
      {scrubbing && (
        <View style={styles.scrubLabelWrap}>
          <Text style={styles.scrubLabel}>{label}</Text>
        </View>
      )}
      <View
        style={styles.seekZone}
        onLayout={e => {
          widthRef.current = e.nativeEvent.layout.width || 1;
        }}
        {...pan.panHandlers}
      >
        <View style={[styles.seekTrack, scrubbing && styles.seekTrackActive]}>
          <View style={[styles.seekFill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0 },
  pauseIcon: { position: 'absolute', top: '42%', alignSelf: 'center', pointerEvents: 'none' },
  spinner: { position: 'absolute', top: '45%', alignSelf: 'center' },
  seekZone: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, justifyContent: 'flex-end' },
  seekTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', pointerEvents: 'none' },
  seekTrackActive: { height: 7 },
  seekFill: { height: '100%', backgroundColor: '#fff', pointerEvents: 'none' },
  scrubLabelWrap: { position: 'absolute', bottom: 56, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, pointerEvents: 'none' },
  scrubLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
