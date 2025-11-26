import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import UserChip from '@/components/profile-users/UserChip';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  type UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  excludeUserId?: string;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({
  visible,
  onClose,
  excludeUserId
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const performSearch = useCallback(
    async (query: string) => {
      try {
        setIsSearching(true);
        const results = await UserService.searchUsers(query, 10, excludeUserId);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        Logger.error('Error searching users:', error);
        Notifier.shoot({
          type: 'error',
          title: 'Search Error',
          message: 'Failed to search users'
        });
      } finally {
        setIsSearching(false);
      }
    },
    [excludeUserId]
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        await performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleUserPress = useCallback(
    (userId: string) => {
      onClose();
      router.push({
        pathname: '/users/[id]',
        params: { id: userId }
      });
    },
    [onClose, router]
  );

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    onClose();
  };

  return (
    <SwipeModal
      title="Find a user"
      modalVisible={visible}
      setVisible={onClose}
      onClose={handleClose}
    >
      <View className="flex-1 gap-4 px-4 pb-4">
        {/* Search Input */}
        <InputCustom
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users by name..."
          leftIconName="search"
          rightIconName={isSearching ? 'loader' : undefined}
          variant="default"
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <View className="flex-row flex-wrap gap-2 p-2">
            {searchResults.map((user) => (
              <UserChip
                key={user.uid}
                user={{
                  uid: user.uid,
                  displayName: user.displayName,
                  photoURL: user.photoURL
                }}
                onPress={() => handleUserPress(user.uid)}
                disabled={false}
              />
            ))}
          </View>
        )}

        {/* No Results */}
        {showResults &&
          searchResults.length === 0 &&
          searchQuery.trim().length >= 2 && (
            <View className="items-center rounded-md border border-border bg-bg-secondary p-2">
              <MaterialIcons
                name="person-off"
                size={32}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                className="mt-2"
                color={themeColors[theme]['text-secondary']}
              >
                {!isSearching ? 'No users found' : 'Searching...'}
              </TextCustom>
            </View>
          )}
      </View>
    </SwipeModal>
  );
};

export default UserSearchModal;
