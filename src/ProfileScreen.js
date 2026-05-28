import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_BASE_URL} from './config';
import {formatToDate} from './Utility';

const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          setError('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại!');
          setIsLoading(false);
          return;
        }

        const config = {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        };
        const response = await axios.get(
          `${API_BASE_URL}/teacher/profile`,
          config,
        );
        setProfile(response.data);
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
        setError(err.message || 'Lỗi khi tải thông tin giảng viên.');
        Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8A4C7D" />
        <Text style={styles.loadingText}>Đang tải thông tin hồ sơ...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Đã có lỗi xảy ra!'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{uri: 'https://www.bootdey.com/image/900x400/8A4C7D/ffffff'}}
        style={styles.coverImage}
      />
      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {profile.name?.charAt(0)?.toUpperCase() || 'GV'}
          </Text>
        </View>
        <Text style={[styles.name, styles.textWithShadow]}>
          {profile.name}
        </Text>
        <Text style={styles.codeSubtitle}>
          Mã số GV: {profile.teacherCode}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Địa chỉ Email:</Text>
            <Text style={styles.infoValue}>{profile.email || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Trạng thái tài khoản:</Text>
            <Text style={[
              styles.infoValue, 
              styles.statusText,
              profile.accountStatus === 'APPROVED' ? styles.statusActive : styles.statusPending
            ]}>
              {profile.accountStatus === 'APPROVED' ? 'Đã kích hoạt' : profile.accountStatus}
            </Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Ngày đăng ký tài khoản:</Text>
            <Text style={styles.infoValue}>
              {profile.createdAt ? formatToDate(profile.createdAt) : 'Không có dữ liệu'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#8A4C7D',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  coverImage: {
    height: 180,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#8A4C7D',
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#1e293b',
    textAlign: 'center',
  },
  codeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  content: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#10b981',
  },
  statusPending: {
    color: '#f59e0b',
  },
});

export default ProfileScreen;

