import { FC, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { UserService, UserProfile } from '@/utils/firebaseService';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/Colors';

const UserProfileScreen: FC = () => {
  const { user, signOut } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    phone: '',
    birthDate: '',
    favoriteGenres: '',
    favoriteArtists: ''
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await UserService.getUserProfile(user.uid);
      setProfile(userProfile);

      if (userProfile) {
        setFormData({
          displayName: userProfile.displayName || '',
          bio: userProfile.publicInfo?.bio || '',
          location: userProfile.publicInfo?.location || '',
          phone: userProfile.privateInfo?.phone || '',
          birthDate: userProfile.privateInfo?.birthDate || '',
          favoriteGenres:
            userProfile.musicPreferences?.favoriteGenres?.join(', ') || '',
          favoriteArtists:
            userProfile.musicPreferences?.favoriteArtists?.join(', ') || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const updateData: Partial<UserProfile> = {
        displayName: formData.displayName,
        publicInfo: {
          bio: formData.bio,
          location: formData.location
        },
        privateInfo: {
          phone: formData.phone,
          birthDate: formData.birthDate
        },
        musicPreferences: {
          favoriteGenres: formData.favoriteGenres
            .split(',')
            .map((g) => g.trim())
            .filter((g) => g),
          favoriteArtists: formData.favoriteArtists
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a)
        }
      };

      await UserService.updateUserProfile(user.uid, updateData);
      await loadUserProfile(); // Перезагружаем профиль
      setEditing(false);
      Alert.alert('Успешно', 'Профиль обновлен');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText type="title">Загрузка профиля...</ThemedText>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <ThemedText type="title">Пользователь не авторизован</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: user.photoURL || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <ThemedText type="title">
            {user.displayName || 'Пользователь'}
          </ThemedText>
          <ThemedText type="subtitle">{user.email}</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Основная информация</ThemedText>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={styles.editButton}
          >
            <ThemedText>{editing ? 'Отмена' : 'Редактировать'}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <ThemedText>Имя</ThemedText>
          <TextInput
            style={[styles.input, !editing && styles.disabledInput]}
            value={formData.displayName}
            onChangeText={(text) =>
              setFormData({ ...formData, displayName: text })
            }
            editable={editing}
            placeholder="Введите ваше имя"
          />
        </View>

        <View style={styles.field}>
          <ThemedText>О себе</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              !editing && styles.disabledInput
            ]}
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            editable={editing}
            placeholder="Расскажите о себе"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <ThemedText>Местоположение</ThemedText>
          <TextInput
            style={[styles.input, !editing && styles.disabledInput]}
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            editable={editing}
            placeholder="Город, страна"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Личная информация</ThemedText>

        <View style={styles.field}>
          <ThemedText>Телефон</ThemedText>
          <TextInput
            style={[styles.input, !editing && styles.disabledInput]}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            editable={editing}
            placeholder="+7 (999) 123-45-67"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <ThemedText>Дата рождения</ThemedText>
          <TextInput
            style={[styles.input, !editing && styles.disabledInput]}
            value={formData.birthDate}
            onChangeText={(text) =>
              setFormData({ ...formData, birthDate: text })
            }
            editable={editing}
            placeholder="01.01.1990"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Музыкальные предпочтения</ThemedText>

        <View style={styles.field}>
          <ThemedText>Любимые жанры</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              !editing && styles.disabledInput
            ]}
            value={formData.favoriteGenres}
            onChangeText={(text) =>
              setFormData({ ...formData, favoriteGenres: text })
            }
            editable={editing}
            placeholder="Рок, Поп, Джаз (через запятую)"
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.field}>
          <ThemedText>Любимые исполнители</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              !editing && styles.disabledInput
            ]}
            value={formData.favoriteArtists}
            onChangeText={(text) =>
              setFormData({ ...formData, favoriteArtists: text })
            }
            editable={editing}
            placeholder="Queen, The Beatles, Pink Floyd (через запятую)"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {editing && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <ThemedText style={styles.saveButtonText}>Сохранить</ThemedText>
        </TouchableOpacity>
      )}

      {/* Кнопка выхода */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.accentMain
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16
  },
  headerInfo: {
    flex: 1
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  editButton: {
    padding: 8,
    backgroundColor: Colors.light.accentMain,
    borderRadius: 8
  },
  field: {
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.accentMain,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    backgroundColor: Colors.light.background,
    color: Colors.light.text
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  disabledInput: {
    backgroundColor: Colors.light.accentMain,
    color: Colors.light.accentMain
  },
  saveButton: {
    backgroundColor: Colors.light.accentMain,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  saveButtonText: {
    color: Colors.light.background,
    fontWeight: 'bold'
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  signOutButtonText: {
    color: Colors.light.background,
    fontWeight: 'bold'
  }
});

export default UserProfileScreen;
