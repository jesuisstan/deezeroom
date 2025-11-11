import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useRouter } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import UserChip from '@/components/users/UserChip';
import { listAcceptedConnectionsFor } from '@/utils/firebase/firebase-service-connections';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';

type FriendSummary = {
  uid: string;
  displayName?: string;
  photoURL?: string;
};

interface FriendsListProps {
  uid?: string;
}

const FriendsList: FC<FriendsListProps> = ({ uid }) => {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFriends = async () => {
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
        const unique = Array.from(new Set(otherUids)).slice(0, 50);
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

    loadFriends();

    return () => {
      active = false;
    };
  }, [uid]);

  return (
    <View className="">
      <TextCustom type="semibold" size="xl">
        Friends
      </TextCustom>
      {loading ? (
        <View className="mt-4 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : friends.length === 0 ? (
        <TextCustom className="text-accent/60 mt-2">No friends yet</TextCustom>
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
