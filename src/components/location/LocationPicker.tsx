import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, TouchableOpacity, ScrollView } from 'react-native';

import * as ExpoLocation from 'expo-location';

import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger/LoggerModule';
import InputCustom from '@/components/ui/InputCustom';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { themeColors } from '@/style/color-theme';
import { useTheme } from '@/providers/ThemeProvider';

type LatLng = { lat: number; lng: number };

export type LocationValue = {
  placeId?: string;
  formattedAddress?: string;
  coords?: LatLng | null;
  description?: string;
  addressComponents?: { longName: string; shortName: string; types: string[] }[];
  locality?: string;
  adminArea?: string;
  country?: string;
  countryCode?: string;
} | null;

type Prediction = {
  description: string;
  place_id: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

type Props = {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  placeholder?: string;
  allowCurrentLocation?: boolean;
};

// Guarded web loader for Google Maps JS SDK with Places library
const loadGoogleMaps = (key?: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const w = window as any;
    if (w.google?.maps?.places) return resolve();
    const scriptId = 'gmaps-sdk-places';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && w.google?.maps) return resolve();
    if (!key) return reject(new Error('Missing Google Maps key'));
    const s = document.createElement('script');
    s.id = scriptId;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;
    s.async = true;
    s.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
    s.onload = () => resolve();
    document.head.appendChild(s);
  });

const GOOGLE_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY || '';

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const debounce = (fn: (...args: any[]) => void, ms = 300) => {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const LocationPicker: FC<Props> = ({ value, onChange, placeholder, allowCurrentLocation = true }) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [detLoading, setDetLoading] = useState(false);
  const { theme } = useTheme();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize query from value
  useEffect(() => {
    if (value?.formattedAddress) setQuery(value.formattedAddress);
    else if (value?.description) setQuery(value.description);
    else if (!value) setQuery('');
  }, [value?.formattedAddress, value?.description]);

  // Fetch predictions
  const fetchPredictionsNative = useCallback(
    async (text: string) => {
      if (!GOOGLE_KEY || !text.trim()) {
        setPredictions([]);
        return;
      }
      try {
        setLoading(true);
        const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(text)}&key=${GOOGLE_KEY}`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json?.status === 'OK' && Array.isArray(json.predictions)) {
          setPredictions(json.predictions as Prediction[]);
        } else {
          setPredictions([]);
        }
      } catch (e) {
        Logger.warn('Autocomplete native failed', e, 'LocationPicker');
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPredictionsWeb = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setPredictions([]);
        return;
      }
      try {
        await loadGoogleMaps(GOOGLE_KEY);
        const svc = new (window as any).google.maps.places.AutocompleteService();
        svc.getPlacePredictions({ input: text }, (res: any, status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && res) {
            setPredictions(res as Prediction[]);
          } else {
            setPredictions([]);
          }
        });
      } catch (e) {
        Logger.warn('Autocomplete web failed', e, 'LocationPicker');
        setPredictions([]);
      }
    },
    []
  );

  const debouncedFetch = useMemo(
    () =>
      debounce((text: string) => {
        if (Platform.OS === 'web') fetchPredictionsWeb(text);
        else fetchPredictionsNative(text);
      }, 250),
    [fetchPredictionsNative, fetchPredictionsWeb]
  );

  const onChangeText = (text: string) => {
    setQuery(text);
    debouncedFetch(text);
  };

  const pickFromPredictionNative = useCallback(async (pred: Prediction) => {
    if (!GOOGLE_KEY) return Alert.alert('Error', 'Missing Google API key');
    try {
      setLoading(true);
      const fields = 'place_id,formatted_address,geometry,address_components,name';
      const url = `${DETAILS_URL}?place_id=${encodeURIComponent(pred.place_id)}&fields=${encodeURIComponent(fields)}&key=${GOOGLE_KEY}`;
      const resp = await fetch(url);
      const json = await resp.json();
      const r = json?.result;
      if (!r) throw new Error('No details');
      const coords: LatLng | null = r.geometry?.location
        ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng }
        : null;
      const addressComponents = Array.isArray(r.address_components)
        ? r.address_components.map((c: any) => ({
            longName: c.long_name,
            shortName: c.short_name,
            types: c.types || []
          }))
        : [];
      const get = (type: string) => addressComponents.find((c: any) => c.types.includes(type));
      const locality = get('locality')?.longName || get('postal_town')?.longName || '';
      const adminArea = get('administrative_area_level_1')?.longName || '';
      const country = get('country')?.longName || '';
      const countryCode = get('country')?.shortName || '';
      onChange({
        placeId: r.place_id,
        formattedAddress: r.formatted_address,
        description: pred.description,
        coords,
        addressComponents,
        locality,
        adminArea,
        country,
        countryCode
      });
      setPredictions([]);
      setQuery(r.formatted_address || pred.description || '');
    } catch (e) {
      Logger.error('Place details native failed', e, 'LocationPicker');
      Alert.alert('Error', 'Failed to load place details');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const pickFromPredictionWeb = useCallback(async (pred: Prediction) => {
    try {
      await loadGoogleMaps(GOOGLE_KEY);
      const dummy = document.createElement('div');
      const svc = new (window as any).google.maps.places.PlacesService(dummy);
      svc.getDetails(
        { placeId: pred.place_id, fields: ['place_id', 'formatted_address', 'geometry', 'address_components', 'name'] },
        (r: any, status: any) => {
          if (status !== (window as any).google.maps.places.PlacesServiceStatus.OK || !r) {
            Alert.alert('Error', 'Failed to load place details');
            return;
          }
          const addressComponents = Array.isArray(r.address_components)
            ? r.address_components.map((c: any) => ({
                longName: c.long_name,
                shortName: c.short_name,
                types: c.types || []
              }))
            : [];
          const get = (type: string) => addressComponents.find((c: any) => c.types.includes(type));
          const locality = get('locality')?.longName || get('postal_town')?.longName || '';
          const adminArea = get('administrative_area_level_1')?.longName || '';
          const country = get('country')?.longName || '';
          const countryCode = get('country')?.shortName || '';
          onChange({
            placeId: r.place_id,
            formattedAddress: r.formatted_address,
            description: pred.description,
            coords: r.geometry?.location
              ? { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() }
              : null,
            addressComponents,
            locality,
            adminArea,
            country,
            countryCode
          });
          setPredictions([]);
          setQuery(r.formatted_address || pred.description || '');
        }
      );
    } catch (e) {
      Logger.error('Place details web failed', e, 'LocationPicker');
      Alert.alert('Error', 'Failed to load place details');
    }
  }, [onChange]);

  const onPickPrediction = (pred: Prediction) => {
    if (Platform.OS === 'web') pickFromPredictionWeb(pred);
    else pickFromPredictionNative(pred);
  };

  const useMyLocation = async () => {
    try {
      setDetLoading(true);
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed.');
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      // Reverse geocode: Prefer Google Geocoding if key
      if (GOOGLE_KEY) {
        try {
          const url = `${GEOCODE_URL}?latlng=${lat},${lng}&key=${GOOGLE_KEY}`;
          const resp = await fetch(url);
          const json = await resp.json();
          if (json?.status === 'OK' && json.results?.[0]) {
            const res = json.results[0];
            const components = Array.isArray(res.address_components)
              ? res.address_components.map((c: any) => ({
                  longName: c.long_name,
                  shortName: c.short_name,
                  types: c.types || []
                }))
              : [];
            const get = (type: string) => components.find((c: any) => c.types.includes(type));
            const locality = get('locality')?.longName || get('postal_town')?.longName || '';
            const adminArea = get('administrative_area_level_1')?.longName || '';
            const country = get('country')?.longName || '';
            const countryCode = get('country')?.shortName || '';
            onChange({
              placeId: res.place_id,
              formattedAddress: res.formatted_address,
              description: res.formatted_address,
              coords: { lat, lng },
              addressComponents: components,
              locality,
              adminArea,
              country,
              countryCode
            });
            setQuery(res.formatted_address);
            setPredictions([]);
            return;
          }
        } catch (e) {
          Logger.warn('Reverse geocode (Google) failed', e, 'LocationPicker');
        }
      }

      // Fallback: Expo reverseGeocodeAsync
      try {
        const res = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const item = res?.[0];
        const formatted = [item?.city || item?.district, item?.region || item?.subregion, item?.country]
          .filter(Boolean)
          .join(', ');
        onChange({
          placeId: undefined,
          formattedAddress: formatted || undefined,
          description: formatted || undefined,
          coords: { lat, lng }
        });
        setQuery(formatted);
      } catch (e) {
        Logger.warn('Expo reverse geocode failed', e, 'LocationPicker');
      }
    } catch (e) {
      Logger.error('Get current location failed', e, 'LocationPicker');
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setDetLoading(false);
    }
  };

  const clearSelection = () => {
    onChange(null);
    setQuery('');
    setPredictions([]);
  };

  return (
    <View className="w-full gap-3">
      <InputCustom
        placeholder={placeholder || 'Search location'}
        value={query}
        onChangeText={onChangeText}
      />
      {allowCurrentLocation && (
        <View className="flex-row gap-3">
          <RippleButton title={detLoading ? 'Detecting…' : 'Use my location'} onPress={useMyLocation} loading={detLoading} />
          {value ? (
            <RippleButton title="Clear" variant="outline" onPress={clearSelection} />
          ) : null}
        </View>
      )}
      {loading ? (
        <TextCustom color={themeColors[theme]['text-secondary']}>Searching…</TextCustom>
      ) : null}
      {predictions.length > 0 && (
        <View
          className="rounded-md border border-border bg-bg-main"
          style={{ maxHeight: 260 }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {predictions.map((p, idx) => (
              <View key={p.place_id}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => onPickPrediction(p)}>
                  <View className="px-3 py-2">
                    <TextCustom>{p.structured_formatting?.main_text || p.description}</TextCustom>
                    {p.structured_formatting?.secondary_text ? (
                      <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                        {p.structured_formatting.secondary_text}
                      </TextCustom>
                    ) : null}
                  </View>
                </TouchableOpacity>
                {idx < predictions.length - 1 ? <Divider inset /> : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      {value?.formattedAddress ? (
        <View className="mt-2">
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            Selected
          </TextCustom>
          <TextCustom>{value.formattedAddress}</TextCustom>
        </View>
      ) : null}
    </View>
  );
};

export default LocationPicker;
