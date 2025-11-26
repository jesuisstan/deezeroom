import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import UserChip from '@/components/profile-users/UserChip';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import TabButton from '@/components/ui/buttons/TabButton';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MAX_USERS_INVITE } from '@/constants';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { listAcceptedConnectionsFor } from '@/utils/firebase/firebase-service-connections';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';
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
  existingUsers?: string[]; // User IDs already in the playlist
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

type FriendSummary = {
  uid: string;
  displayName?: string;
  photoURL?: string;
};

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
  placeholder = 'Search users by name...',
  maxUsers = MAX_USERS_INVITE,

  // Modal customization
  title = 'Invite Users',
  description
}) => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'search' | 'friends'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

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

  // Load friends list
  useEffect(() => {
    if (!user?.uid || activeTab !== 'friends') return;

    let active = true;
    const loadFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const connections = await listAcceptedConnectionsFor(user.uid);
        const otherUids = connections.map((c) =>
          c.userA === user.uid ? c.userB : c.userA
        );
        const unique = Array.from(new Set(otherUids));

        // Filter out excluded user and existing users
        const filteredUids = unique.filter(
          (uid) => uid !== excludeUserId && !existingUsers.includes(uid)
        );

        const docs = await Promise.all(
          filteredUids.map((friendId) => getPublicProfileDoc(friendId))
        );

        if (!active) return;

        const friendList: FriendSummary[] = filteredUids.map(
          (friendId, index) => ({
            uid: friendId,
            displayName: docs[index]?.displayName || 'User',
            photoURL: docs[index]?.photoURL
          })
        );

        setFriends(friendList);
      } catch (error) {
        Logger.error('Error loading friends:', error);
        if (active) {
          setFriends([]);
        }
      } finally {
        if (active) {
          setIsLoadingFriends(false);
        }
      }
    };

    void loadFriends();

    return () => {
      active = false;
    };
  }, [user?.uid, activeTab, excludeUserId, existingUsers]);

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        await performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch, activeTab]);

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

  const handleFriendSelect = useCallback(
    (friend: FriendSummary) => {
      // Convert FriendSummary to UserProfile
      const userProfile: UserProfile = {
        uid: friend.uid,
        email: '', // Not available from friend summary
        displayName: friend.displayName || 'Unknown User',
        photoURL: friend.photoURL,
        createdAt: null as any,
        updatedAt: null as any,
        emailVerified: false
      };
      handleUserSelect(userProfile);
    },
    [handleUserSelect]
  );

  const renderSearchTab = () => (
    <View className="gap-4">
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
        <View className="flex-row flex-wrap gap-2 rounded-md border border-border bg-bg-secondary p-2">
          {searchResults.map((user) => (
            <UserChip
              key={user.uid}
              user={{
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL
              }}
              onPress={() => handleUserSelect(user)}
              disabled={false}
              rightAccessory={
                user.isSelected ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={16}
                    color={themeColors[theme]['intent-success']}
                  />
                ) : undefined
              }
            />
          ))}
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

  const renderFriendsTab = () => (
    <View className="gap-4">
      {isLoadingFriends || friends.length === 0 ? (
        <View className="items-center justify-center rounded-md border border-border bg-bg-secondary p-3">
          {isLoadingFriends ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <TextCustom
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="animate-pulse"
              >
                Loading friends...
              </TextCustom>
            </View>
          ) : (
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              No friends available
            </TextCustom>
          )}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 rounded-md border border-border bg-bg-secondary p-2">
          {friends.map((friend) => {
            const isSelected = selectedUsers.some(
              (selected) => selected.uid === friend.uid
            );
            return (
              <UserChip
                key={friend.uid}
                user={friend}
                onPress={() => handleFriendSelect(friend)}
                disabled={false}
                rightAccessory={
                  isSelected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={themeColors[theme]['intent-success']}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );

  const renderContent = () => (
    <View className="gap-4">
      {/* Existing Users Info */}
      {existingUsers.length > 0 && (
        <View
          className="flex-row items-center gap-2 rounded-md px-3 py-2"
          style={{
            backgroundColor: themeColors[theme]['primary'] + '20',
            borderWidth: 1,
            borderColor: themeColors[theme]['primary']
          }}
        >
          <MaterialCommunityIcons
            name="account-group"
            size={18}
            color={themeColors[theme]['text-main']}
          />
          <View className="flex-1 flex-row flex-wrap items-center gap-1">
            <TextCustom size="s" color={themeColors[theme]['text-main']}>
              {existingUsers.length}
            </TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-main']}>
              of
            </TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-main']}>
              {maxUsers}
            </TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-main']}>
              participants
            </TextCustom>
          </View>
        </View>
      )}

      {/* Tabs Header */}
      <View
        className="flex-row gap-2 rounded-md"
        style={{ backgroundColor: themeColors[theme]['primary'] + '10' }}
      >
        <TabButton
          title="Search"
          isActive={activeTab === 'search'}
          onPress={() => setActiveTab('search')}
        />
        <TabButton
          title="Friends"
          isActive={activeTab === 'friends'}
          onPress={() => setActiveTab('friends')}
        />
      </View>

      {/* Tab Content */}
      {activeTab === 'search' ? renderSearchTab() : renderFriendsTab()}
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
              {maxUsers - existingUsers.length} max left)
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
