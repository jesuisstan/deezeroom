import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import UserChip from '@/components/profile-users/UserChip';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MAX_USERS_INVITE } from '@/constants/deezer';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlaylistParticipant } from '@/utils/firebase/firebase-service-playlists';
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

interface UserInviteComponentProps {
  // Modal props (optional)
  visible?: boolean;
  onClose?: () => void;
  onInvite?: (users: UserProfile[]) => Promise<void>;
  isLoading?: boolean;

  // Component props
  onUsersSelected?: (users: UserProfile[]) => void;
  selectedUsers?: UserProfile[];
  existingUsers?: PlaylistParticipant[]; // Users already in the playlist
  excludeUserId?: string;
  placeholder?: string;
  maxUsers?: number;

  // Modal customization
  title?: string;
  description?: string;
}

interface UserSearchResult extends UserProfile {
  isSelected: boolean;
}

const UserInviteComponent: React.FC<UserInviteComponentProps> = ({
  // Modal props
  visible,
  onClose,
  onInvite,
  isLoading = false,

  // Component props
  onUsersSelected,
  selectedUsers: externalSelectedUsers,
  existingUsers = [],
  excludeUserId,
  placeholder = 'Search users by email or name...',
  maxUsers = MAX_USERS_INVITE,

  // Modal customization
  title = 'Invite Users',
  description
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Internal state for modal mode
  const [internalSelectedUsers, setInternalSelectedUsers] = useState<
    UserProfile[]
  >([]);
  const [isInviting, setIsInviting] = useState(false);

  // Determine if we're in modal mode
  const isModalMode = visible !== undefined;
  const selectedUsers = useMemo(
    () => (isModalMode ? internalSelectedUsers : externalSelectedUsers || []),
    [isModalMode, internalSelectedUsers, externalSelectedUsers]
  );
  const handleUsersSelected = useMemo(
    () =>
      isModalMode ? setInternalSelectedUsers : onUsersSelected || (() => {}),
    [isModalMode, onUsersSelected]
  );

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
        //// Close keyboard only if there are results for better UX
        //if (searchResultsWithSelection.length > 0) {
        //  Keyboard.dismiss();
        //}
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
        handleUsersSelected(updatedUsers);
      } else {
        // Add user (check max limit including existing users)
        const totalUsers = existingUsers.length + selectedUsers.length;
        if (totalUsers >= maxUsers) {
          Notifier.shoot({
            type: 'warn',
            title: 'Limit Reached',
            message: `You can only have up to ${maxUsers} users total (${existingUsers.length} existing + ${selectedUsers.length} selected)`
          });
          return;
        }

        const updatedUsers = [...selectedUsers, user];
        handleUsersSelected(updatedUsers);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedUsers, handleUsersSelected, maxUsers]
  );

  const handleRemoveSelectedUser = useCallback(
    (userToRemove: UserProfile) => {
      const updatedUsers = selectedUsers.filter(
        (user) => user.uid !== userToRemove.uid
      );
      handleUsersSelected(updatedUsers);

      // Update search results if this user is in the current search
      setSearchResults((prev) =>
        prev.map((result) =>
          result.uid === userToRemove.uid
            ? { ...result, isSelected: false }
            : result
        )
      );
    },
    [selectedUsers, handleUsersSelected]
  );

  // Modal mode functions
  const handleInvite = async () => {
    if (selectedUsers.length === 0 || !onInvite) return;

    setIsInviting(true);
    try {
      await onInvite(selectedUsers);
      handleClose();
    } catch (error) {
      Logger.error('Error in UserInviteComponent modal:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    if (isModalMode) {
      setInternalSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
    }
    onClose?.();
  };

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <Pressable
      onPress={() => handleUserSelect(item)}
      className="flex-row items-center rounded-md border border-border bg-bg-secondary px-3 py-1"
    >
      {/* Avatar */}
      <View className="mr-3">
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-bg-main">
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={themeColors[theme]['text-secondary']}
            />
          </View>
        )}
      </View>

      {/* User Info */}
      <View className="flex-1">
        <TextCustom type="subtitle" numberOfLines={1} size="l">
          {item.displayName || 'Unknown User'}
        </TextCustom>
      </View>

      {/* Selection Indicator */}
      <IconButton
        accessibilityLabel={
          item.isSelected ? 'Remove from selection' : 'Add to selection'
        }
        onPress={() => handleUserSelect(item)}
        className="h-10 w-10"
      >
        <MaterialCommunityIcons
          name={item.isSelected ? 'check-circle' : 'circle-outline'}
          size={20}
          color={
            item.isSelected
              ? themeColors[theme]['intent-success']
              : themeColors[theme]['text-secondary']
          }
        />
      </IconButton>
    </Pressable>
  );

  const renderSelectedUser = ({ item }: { item: UserProfile }) => (
    <UserChip
      key={item.uid}
      user={{
        uid: item.uid,
        displayName: item.displayName,
        photoURL: item.photoURL
      }}
      disabled={true}
      rightAccessory={
        <IconButton
          accessibilityLabel="Remove user from selection"
          onPress={() => handleRemoveSelectedUser(item)}
          className="ml-1 h-6 w-6"
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color={themeColors[theme]['primary']}
          />
        </IconButton>
      }
    />
  );

  const renderContent = () => (
    <View className="gap-4">
      {/* Existing Users */}
      {existingUsers.length > 0 && (
        <View>
          <TextCustom type="semibold" className="mb-2">
            Current Members ({existingUsers.length} of {maxUsers} max)
          </TextCustom>
          <View className="flex-row flex-wrap gap-2">
            {existingUsers.map((user) => (
              <UserChip
                key={user.userId}
                user={{
                  uid: user.userId,
                  displayName: user.displayName,
                  photoURL: user.photoURL
                }}
                disabled={true}
              />
            ))}
          </View>
        </View>
      )}

      {/* Search Input */}
      <InputCustom
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={placeholder}
        leftIconName="search"
        rightIconName={isSearching ? 'loader' : undefined}
        variant="default"
        onFocus={() => {
          if (searchResults.length > 0) {
            setShowResults(true);
            //// Close keyboard only if there are results
            //Keyboard.dismiss();
          }
        }}
      />

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <View>
          <TextCustom type="semibold" className="mb-2">
            Search Results
          </TextCustom>
          <View>
            {searchResults.map((user) => (
              <View key={user.uid}>{renderSearchResult({ item: user })}</View>
            ))}
          </View>
        </View>
      )}

      {/* No Results */}
      {showResults &&
        searchResults.length === 0 &&
        searchQuery.trim().length >= 2 && (
          <View className="items-center rounded-md border border-border bg-bg-secondary p-2">
            <MaterialCommunityIcons
              name="account-search"
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
  );

  // If in modal mode, wrap content in SwipeModal
  if (isModalMode) {
    return (
      <SwipeModal
        title={title}
        modalVisible={visible!}
        setVisible={onClose!}
        onClose={handleClose}
      >
        <View className="flex-1 gap-4 px-4 pb-4">
          {description && (
            <TextCustom type="semibold" className="text-center" size="l">
              {description}
            </TextCustom>
          )}

          {renderContent()}

          {/* Selected Users */}
          <View>
            <TextCustom type="semibold" className="mb-2">
              Inviting ({selectedUsers.length} of{' '}
              {maxUsers - existingUsers.length} left max)
            </TextCustom>
            <View className="flex-row flex-wrap gap-2">
              {selectedUsers.length > 0 ? (
                selectedUsers.map((user) => (
                  <View key={user.uid}>
                    {renderSelectedUser({ item: user })}
                  </View>
                ))
              ) : (
                <TextCustom className="my-1">No users selected</TextCustom>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-col gap-2">
            <RippleButton
              title="Send Invitations"
              onPress={handleInvite}
              loading={isInviting || isLoading}
              width="full"
              disabled={selectedUsers.length === 0 || isInviting || isLoading}
            />
            <RippleButton
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              width="full"
              disabled={isInviting || isLoading}
            />
          </View>
        </View>
      </SwipeModal>
    );
  }

  // Return just the content for non-modal mode
  return renderContent();
};

export default UserInviteComponent;
