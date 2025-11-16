import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import CreateEventButton from '@/components/events/CreateEventButton';
import CreateEventModal from '@/components/events/CreateEventModal';
import EventCard from '@/components/events/EventCard';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import TabButton from '@/components/ui/buttons/TabButton';
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
  const [activeTab, setActiveTab] = useState<
    'my' | 'participating' | 'public' | 'passed'
  >('my');
  const [searchQuery, setSearchQuery] = useState('');

  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0;
  }, [currentTrack]);

  const loadEvents = useCallback(
    async (tab: 'my' | 'participating' | 'public' | 'passed') => {
      if (!user) return;

      try {
        let eventsData: Event[] = [];

        switch (tab) {
          case 'my':
            eventsData = await EventService.getUserEvents(user.uid);
            eventsData = eventsData.filter((event) =>
              EventService.isEventActive(event)
            );
            break;
          case 'participating':
            eventsData = await EventService.getUserParticipatingEvents(
              user.uid
            );
            eventsData = eventsData.filter((event) =>
              EventService.isEventActive(event)
            );
            break;
          case 'public':
            eventsData = await EventService.getPublicEvents();
            eventsData = eventsData.filter((event) =>
              EventService.isEventActive(event)
            );
            break;
          case 'passed':
            eventsData = await EventService.getPassedEvents(user.uid);
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

  const handleTabChange = async (
    tab: 'my' | 'participating' | 'public' | 'passed'
  ) => {
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
            setEvents(
              updated.filter((event) => EventService.isEventActive(event))
            );
          }
        );
        break;
      case 'participating':
        unsubscribe = EventService.subscribeToUserParticipatingEvents(
          user.uid,
          (updated) => {
            setEvents(
              updated.filter((event) => EventService.isEventActive(event))
            );
          }
        );
        break;
      case 'public':
        unsubscribe = EventService.subscribeToPublicEvents((updated) => {
          setEvents(
            updated.filter((event) => EventService.isEventActive(event))
          );
        });
        break;
      case 'passed':
        // No real-time subscription for passed events
        unsubscribe = undefined;
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
              : activeTab === 'participating'
                ? 'No events you participate in yet'
                : 'No past events to display'}
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

  const renderTabButton = (
    tab: 'my' | 'participating' | 'public' | 'passed'
  ) => {
    const isActive = activeTab === tab;
    const titles: Record<typeof tab, string> = {
      my: 'My',
      participating: 'Invited',
      public: 'Public',
      passed: 'Passed'
    } as const;

    return (
      <TabButton
        key={tab}
        title={titles[tab]}
        isActive={isActive}
        onPress={() => handleTabChange(tab)}
      />
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
    >
      <View
        className="gap-2 px-4 py-2 shadow-sm"
        style={{ backgroundColor: themeColors[theme]['primary'] + '20' }}
      >
        <View className="flex-row items-center gap-2">
          {(['my', 'participating', 'public', 'passed'] as const).map(
            renderTabButton
          )}
        </View>

        <View
          style={
            Platform.OS === 'web'
              ? {
                  maxWidth: '60%',
                  width: '100%',
                  alignSelf: 'center'
                }
              : undefined
          }
        >
          <InputCustom
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIconName="search"
          />
        </View>
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
                className="mt-4 animate-pulse"
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
