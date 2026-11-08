import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { notify } from '../src/lib/dialog';
import { RequireRole } from '../src/components/RequireRole';
import { useAuth } from '../src/context/AuthContext';
import { registerUmkm } from '../src/services/umkm';
import { uploadImage } from '../src/services/storage';

interface Logo {
  uri: string;
  base64: string;
  mimeType: string | null | undefined;
}

export default function RegisterUmkmScreen() {
  return (
    <RequireRole allow={['user']}>
      <RegisterContent />
    </RequireRole>
  );
}

function RegisterContent() {
  const router = useRouter();
  const { session, umkm, refresh } = useAuth();
  const userId = session?.user.id ?? '';

  const [ownerName, setOwnerName] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [legalId, setLegalId] = useState('');
  const [logo, setLogo] = useState<Logo | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sudah pernah mendaftar: tampilkan status, bukan formulir.
  if (umkm) {
    const rejected = umkm.status === 'rejected';
    return (
      <View style={styles.statusWrap}>
        <Feather name={rejected ? 'x-circle' : 'clock'} size={48} color={rejected ? '#EF4444' : '#FBBF24'} />
        <Text style={styles.statusTitle}>{rejected ? 'Pendaftaran ditolak' : 'Menunggu verifikasi'}</Text>
        <Text style={styles.statusDesc}>
          {rejected
            ? `Pendaftaran ${umkm.name} tidak disetujui admin. Hubungi admin untuk informasi lebih lanjut.`
            : `${umkm.name} sedang ditinjau admin. Anda akan bisa mengelola produk dan video setelah disetujui.`}
        </Text>
        <TouchableOpacity style={styles.submit} onPress={() => router.back()}>
          <Text style={styles.submitText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    if (!a.base64) return setError('Gambar tidak bisa dibaca. Coba pilih gambar lain.');
    setLogo({ uri: a.uri, base64: a.base64, mimeType: a.mimeType });
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        notify('Izin lokasi ditolak', 'Tidak masalah, isi koordinat secara manual di bawah.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch {
      notify('Lokasi tidak tersedia', 'Aktifkan GPS atau isi koordinat secara manual.');
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    setError(null);
    const latN = Number(lat.replace(',', '.'));
    const lngN = Number(lng.replace(',', '.'));
    if (!ownerName.trim() || !name.trim() || !contact.trim() || !address.trim()) {
      return setError('Nama pemilik, nama UMKM, kontak, dan alamat wajib diisi.');
    }
    if (!lat.trim() || !lng.trim() || Number.isNaN(latN) || Number.isNaN(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
      return setError('Koordinat tidak valid. Gunakan tombol lokasi atau isi manual (contoh: -6.9175 dan 107.6191).');
    }
    if (!logo) return setError('Logo UMKM wajib diunggah.');

    setBusy(true);
    const up = await uploadImage(userId, logo.base64, logo.mimeType, 'logo');
    if (!up.url) {
      setBusy(false);
      return setError(up.error ?? 'Gagal mengunggah logo.');
    }
    const res = await registerUmkm(userId, {
      owner_name: ownerName.trim(),
      name: name.trim(),
      contact: contact.trim(),
      address: address.trim(),
      city: city.trim(),
      lat: latN,
      lng: lngN,
      logo_url: up.url,
      legal_id: legalId.trim() || null,
    });
    setBusy(false);
    if (res.error) return setError(res.error);

    await refresh();
    notify('Pendaftaran terkirim', 'Admin akan meninjau UMKM Anda. Statusnya bisa dilihat di Profil.');
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Daftar sebagai UMKM</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
            {logo ? (
              <Image source={{ uri: logo.uri }} style={styles.logoImg} />
            ) : (
              <>
                <Feather name="image" size={28} color="#9CA3AF" />
                <Text style={styles.logoHint}>Unggah logo *</Text>
              </>
            )}
          </TouchableOpacity>

          <Field label="Nama pemilik *" value={ownerName} onChangeText={setOwnerName} />
          <Field label="Nama UMKM *" value={name} onChangeText={setName} />
          <Field label="Email / nomor HP *" value={contact} onChangeText={setContact} />
          <Field label="Alamat *" value={address} onChangeText={setAddress} multiline />
          <Field label="Kota" value={city} onChangeText={setCity} />

          <Text style={styles.label}>Lokasi (GPS) *</Text>
          <TouchableOpacity style={styles.gpsBtn} onPress={useMyLocation} disabled={locating}>
            {locating ? <ActivityIndicator color="#FF6B35" /> : <Feather name="crosshair" size={16} color="#FF6B35" />}
            <Text style={styles.gpsText}>Gunakan lokasi saya</Text>
          </TouchableOpacity>
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Latitude"
              placeholderTextColor="#6B7280"
              value={lat}
              onChangeText={setLat}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Longitude"
              placeholderTextColor="#6B7280"
              value={lng}
              onChangeText={setLng}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <Field label="Nomor legalitas (NIB/PIRT, opsional)" value={legalId} onChangeText={setLegalId} />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Kirim pendaftaran</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, multiline, ...rest }: { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        placeholderTextColor="#6B7280"
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A', paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  logoPicker: { alignSelf: 'center', width: 110, height: 110, borderRadius: 55, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2A2A2A', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 110, height: 110 },
  logoHint: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1E1E1E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B35', backgroundColor: '#FF6B3522' },
  gpsText: { color: '#FF6B35', fontWeight: '700' },
  coordRow: { flexDirection: 'row', gap: 10 },
  error: { color: '#EF4444', fontSize: 13 },
  submit: { backgroundColor: '#FF6B35', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statusWrap: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  statusTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statusDesc: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
