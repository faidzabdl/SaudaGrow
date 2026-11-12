import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { FeatherName } from '../types';

// Gambar jaringan dengan cadangan: URL kosong atau gagal dimuat menampilkan ikon, bukan kotak kosong.
export function RemoteImage({
  uri,
  style,
  icon = 'image',
}: {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  icon?: FeatherName;
}) {
  // Yang dicatat adalah URL yang gagal, bukan boolean: URL baru otomatis dianggap belum gagal (tanpa effect).
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri !== null && failedUri === uri;

  if (!uri || failed) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.fallback]}>
        <Feather name={icon} size={22} color="#4B5563" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} />;
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
});
