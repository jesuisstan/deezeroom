import { FC, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useRouter } from 'expo-router';

import UserChip from '@/components/profile-users/UserChip';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { listAcceptedConnectionsFor } from '@/utils/firebase/firebase-service-connections';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';

type FriendSummary = {
  uid: string;
  displayName?: string;
  photoURL?: string;
};

interface FriendsListProps {
  uid?: string;
  friendIds?: string[];
  title?: string;
  emptyText?: string;
}

const FriendsList: FC<FriendsListProps> = ({
  uid,
  friendIds,
  title = 'Friends',
  emptyText = 'No friends yet'
}) => {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const normalizedFriendIds = useMemo(() => {
    if (!friendIds) return undefined;
    const sanitized = friendIds.filter(Boolean);
    if (sanitized.length === 0) return [];
    return Array.from(new Set(sanitized));
  }, [friendIds]);

  useEffect(() => {
    let active = true;

    const loadFriends = async () => {
      if (normalizedFriendIds !== undefined) {
        if (normalizedFriendIds.length === 0) {
          if (active) {
            setFriends([]);
            setLoading(false);
          }
          return;
        }

        try {
          if (active) setLoading(true);
          const docs = await Promise.all(
            normalizedFriendIds.map((friendId) => getPublicProfileDoc(friendId))
          );

          if (!active) return;

          const items = normalizedFriendIds.map((friendId, index) => ({
            uid: friendId,
            displayName: docs[index]?.displayName || 'User',
            photoURL: docs[index]?.photoURL
          }));

          setFriends(items);
        } catch {
          if (active) {
            setFriends([]);
          }
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      if (!uid) {
        if (active) {
          setFriends([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (active) setLoading(true);

        const connections = await listAcceptedConnectionsFor(uid);
        const otherUids = connections.map((c) =>
          c.userA === uid ? c.userB : c.userA
        );
        const unique = Array.from(new Set(otherUids));
        const docs = await Promise.all(
          unique.map((friendId) => getPublicProfileDoc(friendId))
        );

        if (!active) return;

        const items = unique.map((friendId, index) => ({
          uid: friendId,
          displayName: docs[index]?.displayName || 'User',
          photoURL: docs[index]?.photoURL
        }));

        setFriends(items);
      } catch {
        if (active) {
          setFriends([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadFriends();

    return () => {
      active = false;
    };
  }, [uid, normalizedFriendIds]);

  const friendCount = friends.length;

  return (
    <View className="">
      <View className="flex-row items-baseline gap-2">
        <TextCustom type="semibold" size="xl">
          {title}
        </TextCustom>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          {friendCount > 0 ? `(${friendCount})` : '(0)'}
        </TextCustom>
      </View>
      {loading ? (
        <View className="mt-4 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : friends.length === 0 ? (
        <TextCustom className="text-accent/60 mt-2">{emptyText}</TextCustom>
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {friends.map((friend) => (
            <UserChip
              key={friend.uid}
              user={friend}
              onPress={() =>
                router.push({
                  pathname: '/users/[id]',
                  params: { id: friend.uid }
                })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default FriendsList;
