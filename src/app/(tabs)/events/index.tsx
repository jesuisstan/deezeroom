import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import CreateEventButton from '@/components/events/CreateEventButton';
import CreateEventModal from '@/components/events/CreateEventModal';
import EventCard from '@/components/events/EventCard';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { Event, EventService } from '@/utils/firebase/firebase-service-events';

const EventsScreen = () => {
  const { theme } = useTheme();
  const { user, profile } = useUser();
  const { currentTrack } = usePlaybackState();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'participating' | 'public'>(
    'my'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0;
  }, [currentTrack]);

  const loadEvents = useCallback(
    async (tab: 'my' | 'participating' | 'public') => {
      if (!user) return;

      try {
        let eventsData: Event[] = [];

        switch (tab) {
          case 'my':
            eventsData = await EventService.getUserEvents(user.uid);
            break;
          case 'participating':
            eventsData = await EventService.getUserParticipatingEvents(
              user.uid
            );
            break;
          case 'public':
            eventsData = await EventService.getPublicEvents();
            break;
        }

        setEvents(eventsData);
      } catch (error) {
        Logger.error('Error loading events:', error);
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to load events'
        });
      }
    },
    [user]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEvents(activeTab);
    setIsRefreshing(false);
  };

  const handleTabChange = async (tab: 'my' | 'participating' | 'public') => {
    setActiveTab(tab);
    setIsLoading(true);
    await loadEvents(tab);
    setIsLoading(false);
  };

  const handleEventCreated = (eventId: string) => {
    loadEvents(activeTab);
  };

  useEffect(() => {
    if (!user) return;

    loadEvents(activeTab).finally(() => setIsLoading(false));

    let unsubscribe: (() => void) | undefined;

    switch (activeTab) {
      case 'my':
        unsubscribe = EventService.subscribeToUserEvents(
          user.uid,
          (updated) => {
            setEvents(updated);
          }
        );
        break;
      case 'participating':
        unsubscribe = EventService.subscribeToUserParticipatingEvents(
          user.uid,
          (updated) => {
            setEvents(updated);
          }
        );
        break;
      case 'public':
        unsubscribe = EventService.subscribeToPublicEvents((updated) => {
          setEvents(updated);
        });
        break;
    }

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [user, activeTab, loadEvents]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return events;
    }
    const query = searchQuery.trim().toLowerCase();
    return events.filter((event) => event.name.toLowerCase().includes(query));
  }, [events, searchQuery]);

  const renderEmptyState = () => {
    return (
      <View className="items-center justify-center py-12">
        <MaterialCommunityIcons
          name="calendar-blank"
          size={42}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom
          className="mt-4"
          color={themeColors[theme]['text-secondary']}
        >
          {activeTab === 'public'
            ? 'No public events available'
            : activeTab === 'my'
              ? 'You have not created any events yet'
              : 'No events you participate in yet'}
        </TextCustom>
        {activeTab === 'my' ? (
          <RippleButton
            title="Create first event"
            size="md"
            onPress={() => setShowCreateModal(true)}
            className="mt-4"
          />
        ) : null}
      </View>
    );
  };

  const renderTabButton = (tab: 'my' | 'participating' | 'public') => {
    const isActive = activeTab === tab;
    const titles: Record<typeof tab, string> = {
      my: 'My',
      participating: 'Invited',
      public: 'Public'
    } as const;

    return (
      <View key={tab} className="flex-1">
        <RippleButton
          title={titles[tab]}
          size="sm"
          onPress={() => handleTabChange(tab)}
          variant={isActive ? 'primary' : 'outline'}
          width="full"
        />
      </View>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
    >
      <View className="gap-2 border-b border-border bg-bg-tertiary px-4 py-2 shadow-sm">
        <View className="flex-row items-center gap-2">
          {(['my', 'participating', 'public'] as const).map(renderTabButton)}
        </View>

        <InputCustom
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIconName="search"
        />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
        contentContainerStyle={{
          paddingBottom: bottomPadding + 24,
          paddingTop: 16,
          paddingHorizontal: 16
        }}
        showsVerticalScrollIndicator={true}
      >
        <View
          style={
            containerWidthStyle
              ? [containerWidthStyle, { width: '100%', alignSelf: 'center' }]
              : { width: '100%' }
          }
        >
          <CreateEventButton onPress={() => setShowCreateModal(true)} />

          {isLoading ? (
            <View className="items-center justify-center py-12">
              <MaterialCommunityIcons
                name="progress-clock"
                size={42}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                className="mt-4"
                color={themeColors[theme]['text-secondary']}
              >
                Loading events...
              </TextCustom>
            </View>
          ) : filteredEvents.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}

          <Divider />
        </View>
      </ScrollView>

      {user && profile ? (
        <CreateEventModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onEventCreated={handleEventCreated}
          userData={profile}
        />
      ) : null}
    </View>
  );
};

export default EventsScreen;
