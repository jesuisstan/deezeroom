import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

interface UserInviteComponentProps {
  onUsersSelected: (users: UserProfile[]) => void;
  selectedUsers: UserProfile[];
  excludeUserId?: string;
  placeholder?: string;
  maxUsers?: number;
}

interface UserSearchResult extends UserProfile {
  isSelected: boolean;
}

const UserInviteComponent: React.FC<UserInviteComponentProps> = ({
  onUsersSelected,
  selectedUsers,
  excludeUserId,
  placeholder = 'Search users by email or name...',
  maxUsers = 10
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const performSearch = useCallback(
    async (query: string) => {
      try {
        setIsSearching(true);
        const results = await UserService.searchUsers(query, 10, excludeUserId);

        // Mark which users are already selected
        const searchResultsWithSelection = results.map((user) => ({
          ...user,
          isSelected: selectedUsers.some(
            (selected) => selected.uid === user.uid
          )
        }));

        setSearchResults(searchResultsWithSelection);
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
    [excludeUserId, selectedUsers]
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

  const handleUserSelect = useCallback(
    (user: UserProfile) => {
      const isAlreadySelected = selectedUsers.some(
        (selected) => selected.uid === user.uid
      );

      if (isAlreadySelected) {
        // Remove user
        const updatedUsers = selectedUsers.filter(
          (selected) => selected.uid !== user.uid
        );
        onUsersSelected(updatedUsers);
      } else {
        // Add user (check max limit)
        if (selectedUsers.length >= maxUsers) {
          Notifier.shoot({
            type: 'warn',
            title: 'Limit Reached',
            message: `You can only invite up to ${maxUsers} users`
          });
          return;
        }

        const updatedUsers = [...selectedUsers, user];
        onUsersSelected(updatedUsers);
      }

      // Update search results to reflect selection
      setSearchResults((prev) =>
        prev.map((result) =>
          result.uid === user.uid
            ? { ...result, isSelected: !isAlreadySelected }
            : result
        )
      );
    },
    [selectedUsers, onUsersSelected, maxUsers]
  );

  const handleRemoveSelectedUser = useCallback(
    (userToRemove: UserProfile) => {
      const updatedUsers = selectedUsers.filter(
        (user) => user.uid !== userToRemove.uid
      );
      onUsersSelected(updatedUsers);

      // Update search results if this user is in the current search
      setSearchResults((prev) =>
        prev.map((result) =>
          result.uid === userToRemove.uid
            ? { ...result, isSelected: false }
            : result
        )
      );
    },
    [selectedUsers, onUsersSelected]
  );

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <Pressable
      onPress={() => handleUserSelect(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderBottomWidth: 1,
        borderBottomColor: themeColors[theme]['border']
      }}
    >
      {/* Avatar */}
      <View style={{ marginRight: 12 }}>
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20
            }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: themeColors[theme]['bg-main'],
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={themeColors[theme]['text-secondary']}
            />
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={{ flex: 1 }}>
        <TextCustom type="subtitle" numberOfLines={1}>
          {item.displayName || 'Unknown User'}
        </TextCustom>
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          numberOfLines={1}
        >
          {item.email}
        </TextCustom>
      </View>

      {/* Selection Indicator */}
      <MaterialCommunityIcons
        name={item.isSelected ? 'check-circle' : 'circle-outline'}
        size={24}
        color={
          item.isSelected
            ? themeColors[theme]['intent-success']
            : themeColors[theme]['text-secondary']
        }
      />
    </Pressable>
  );

  const renderSelectedUser = ({ item }: { item: UserProfile }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors[theme]['primary'] + '20',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6
      }}
    >
      {/* Avatar */}
      {item.photoURL ? (
        <Image
          source={{ uri: item.photoURL }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            marginRight: 6
          }}
        />
      ) : (
        <MaterialCommunityIcons
          name="account"
          size={16}
          color={themeColors[theme]['primary']}
          style={{ marginRight: 6 }}
        />
      )}

      {/* Name */}
      <TextCustom
        size="s"
        color={themeColors[theme]['primary']}
        numberOfLines={1}
      >
        {item.displayName || 'Unknown User'}
      </TextCustom>

      {/* Remove Button */}
      <Pressable
        onPress={() => handleRemoveSelectedUser(item)}
        style={{ marginLeft: 6 }}
      >
        <MaterialCommunityIcons
          name="close-circle"
          size={16}
          color={themeColors[theme]['primary']}
        />
      </Pressable>
    </View>
  );

  return (
    <View>
      {/* Search Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors[theme]['border'],
          paddingHorizontal: 12,
          paddingVertical: 8
        }}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={themeColors[theme]['text-secondary']}
          style={{ marginRight: 8 }}
        />

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          placeholderTextColor={themeColors[theme]['text-secondary']}
          style={{
            flex: 1,
            color: themeColors[theme]['text-main'],
            fontSize: 16
          }}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />

        {isSearching && (
          <MaterialCommunityIcons
            name="loading"
            size={20}
            color={themeColors[theme]['text-secondary']}
          />
        )}
      </View>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <TextCustom type="subtitle" className="mb-2">
            Selected Users ({selectedUsers.length}/{maxUsers})
          </TextCustom>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selectedUsers.map((user) => (
              <View key={user.uid}>{renderSelectedUser({ item: user })}</View>
            ))}
          </View>
        </View>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <View
          style={{
            marginTop: 8,
            backgroundColor: themeColors[theme]['bg-secondary'],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors[theme]['border'],
            maxHeight: 200
          }}
        >
          {searchResults.map((user) => (
            <View key={user.uid}>{renderSearchResult({ item: user })}</View>
          ))}
        </View>
      )}

      {/* No Results */}
      {showResults &&
        searchResults.length === 0 &&
        !isSearching &&
        searchQuery.trim().length >= 2 && (
          <View
            style={{
              marginTop: 8,
              padding: 16,
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderRadius: 8,
              borderWidth: 1,
              borderColor: themeColors[theme]['border'],
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons
              name="account-search"
              size={32}
              color={themeColors[theme]['text-secondary']}
            />
            <TextCustom
              className="mt-2"
              color={themeColors[theme]['text-secondary']}
            >
              No users found
            </TextCustom>
          </View>
        )}
    </View>
  );
};

export default UserInviteComponent;
