import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';

import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import type { Artist as GqlArtist } from '@/graphql/schema';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { deezerService } from '@/utils/deezer/deezer-service';
import { DeezerArtist } from '@/utils/deezer/deezer-types';

export interface ArtistsPickerComponentProps {
  selected: DeezerArtist[];
  onChange: (artists: DeezerArtist[]) => void;
  max?: number;
  isVisible?: boolean; // kept for API parity with other pickers
  onDone?: () => void;
}

const DEFAULT_LIMIT = 8;

const mapGqlArtistToDeezer = (a: GqlArtist): DeezerArtist => ({
  id: a.id,
  name: a.name,
  link: a.link,
  picture: a.picture,
  picture_small: a.pictureSmall,
  picture_medium: a.pictureMedium,
  picture_big: a.pictureBig,
  picture_xl: a.pictureXl,
  type: 'artist'
});

const ArtistsPickerComponent: React.FC<ArtistsPickerComponentProps> = ({
  selected,
  onChange,
  max = 20,
  isVisible = true,
  onDone
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GqlArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset internal search state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setQuery('');
      setResults([]);
      setSearching(false);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [isVisible]);

  const handleSearch = (text: string) => {
    setQuery(text);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text || text.trim().length < 2 || selected.length >= max) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await deezerService.searchArtistsViaGraphQL(
          text.trim(),
          DEFAULT_LIMIT,
          0
        );
        setResults(res.artists || []);
      } catch (e) {
        Logger.error('Artist search failed', e, 'ArtistsPicker');
        setError('Failed to search');
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const addArtist = (artist: GqlArtist) => {
    const toAdd = mapGqlArtistToDeezer(artist);
    onChange(
      selected.find((a) => a.id === toAdd.id) || selected.length >= max
        ? selected
        : [...selected, toAdd]
    );
    // clear suggestions after add for quicker multiple picks
    setQuery('');
    setResults([]);
  };

  const removeArtist = (id: string) => {
    onChange(selected.filter((a) => a.id !== id));
  };

  return (
    <View className="flex-1 px-4 pb-6">
      <InputCustom
        label={`Select up to ${max} artists`}
        placeholder={
          selected.length >= max
            ? `Maximum ${max} selected`
            : 'Start typing artist name'
        }
        value={query}
        onChangeText={handleSearch}
        showClearButton
        onClear={() => {
          setQuery('');
          setResults([]);
        }}
        returnKeyType="search"
      />

      {searching && (
        <TextCustom
          size="s"
          className="mt-2"
          color={themeColors[theme]['text-secondary']}
        >
          Searching…
        </TextCustom>
      )}

      {!!error && (
        <TextCustom size="s" className="mt-2">
          {error}
        </TextCustom>
      )}

      {results.length > 0 && (
        <View
          className="mt-2 rounded-xl border border-border bg-bg-secondary"
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <ScrollView
            style={{ maxHeight: 256 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {results.map((a) => (
              <TouchableOpacity
                key={a.id}
                className="flex-row items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                onPress={() => addArtist(a)}
              >
                {a.pictureSmall ? (
                  <Image
                    source={{ uri: a.pictureSmall }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                ) : (
                  <View
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                    className="items-center justify-center bg-bg-main"
                  >
                    <TextCustom size="s">{a.name.charAt(0)}</TextCustom>
                  </View>
                )}
                <TextCustom className="flex-1">{a.name}</TextCustom>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selected chips */}
      <View className="mt-3">
        <View className="mb-2 flex-row items-center justify-between">
          <TextCustom type="semibold" size="l">
            Selected
          </TextCustom>
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            {selected.length}/{max}
          </TextCustom>
        </View>
        {selected.length === 0 ? (
          <TextCustom color={themeColors[theme]['text-secondary']}>
            No artists selected yet
          </TextCustom>
        ) : (
          <View className="flex-row flex-wrap">
            {selected.map((a) => (
              <View
                key={a.id}
                className="mb-2 mr-2 flex-row items-center rounded-full border border-border bg-bg-secondary px-2 py-1"
              >
                {a.picture_small ? (
                  <Image
                    source={{ uri: a.picture_small }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      marginRight: 6
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      marginRight: 6
                    }}
                    className="items-center justify-center bg-bg-main"
                  >
                    <TextCustom size="xs">{a.name.charAt(0)}</TextCustom>
                  </View>
                )}
                <TextCustom size="s">{a.name}</TextCustom>
                <TouchableOpacity
                  onPress={() => removeArtist(a.id)}
                  className="ml-2 rounded-full bg-bg-main px-2 py-1"
                >
                  <TextCustom size="xs">×</TextCustom>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="mt-4">
        <RippleButton title="Done" onPress={onDone} />
      </View>
    </View>
  );
};

export default ArtistsPickerComponent;
