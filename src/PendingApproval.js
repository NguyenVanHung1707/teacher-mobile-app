import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, getThemeColors} from './Utility';

export default function PendingApproval({navigation}) {
  const [status, setStatus] = useState('PENDING'); // PENDING or REJECTED
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const config = {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      };

      const response = await axios.get(`${API_URL}/teacher/profile`, config);
      const data = response.data;

      if (data) {
        setStatus(data.accountStatus || 'PENDING');
        setRejectionReason(data.rejectionReason || '');

        if (data.accountStatus === 'APPROVED') {
          Alert.alert(
            'Thành công',
            'Tài khoản của bạn đã được phê duyệt! Đang chuyển hướng...',
          );
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Error re-checking teacher status:', error);
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ để kiểm tra trạng thái.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of status when screen loads
    checkStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      navigation.replace('Login');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const isRejected = status === 'REJECTED';

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.logoZone}>
        <Text style={styles.logoText}>Trạng thái</Text>
        <Text
          style={[styles.subLogoText, {color: isDark ? '#F472B6' : '#8A4C7D'}]}>
          Tài khoản
        </Text>

        <View
          style={[
            styles.statusBanner,
            isRejected ? styles.rejectedBanner : styles.pendingBanner,
          ]}>
          <Text style={styles.statusBannerText}>
            {isRejected ? 'BỊ TỪ CHỐI PHÊ DUYỆT' : 'ĐANG CHỜ PHÊ DUYỆT'}
          </Text>
        </View>

        <Text style={styles.description}>
          {isRejected
            ? 'Yêu cầu đăng ký tài khoản giảng viên của bạn đã bị từ chối bởi Quản trị viên hệ thống.'
            : 'Tài khoản của bạn đang được quản trị viên xem xét và phê duyệt. Vui lòng quay lại sau.'}
        </Text>

        {isRejected && rejectionReason ? (
          <View
            style={[
              styles.reasonContainer,
              isDark && {
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderColor: '#D14343',
              },
            ]}>
            <Text style={styles.reasonTitle}>Lý do từ chối:</Text>
            <Text style={styles.reasonText}>{rejectionReason}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomZone}>
        <TouchableOpacity
          style={[styles.refreshButton, isLoading && styles.disabledButton]}
          onPress={checkStatus}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#8A4C7D" />
          ) : (
            <Text style={styles.refreshButtonText}>
              KIỂM TRA LẠI TRẠNG THÁI
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text
            style={[
              styles.logoutButtonText,
              {color: isDark ? '#F472B6' : '#8A4C7D'},
            ]}>
            Đăng xuất
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEABAE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flex: 6,
    justifyContent: 'center',
    width: '80%',
    paddingLeft: 10,
    marginTop: 50,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
  },
  subLogoText: {
    color: '#8A4C7D',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
    marginTop: -5,
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  pendingBanner: {
    backgroundColor: '#FFB020',
  },
  rejectedBanner: {
    backgroundColor: '#D14343',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 20,
    lineHeight: 22,
    fontWeight: '500',
  },
  reasonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 15,
    borderRadius: 15,
    marginTop: 25,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#D14343',
  },
  reasonTitle: {
    color: '#D14343',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  reasonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  bottomZone: {
    flex: 4,
    justifyContent: 'center',
    width: '80%',
  },
  refreshButton: {
    width: '100%',
    height: 55,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.8,
  },
  refreshButtonText: {
    color: '#8A4C7D',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoutButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#8A4C7D',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
