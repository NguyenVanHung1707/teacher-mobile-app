import React, {useState} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import {storeData, getData, getThemeColors} from './Utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  API_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_TOKEN_ENDPOINT,
} from './config';

const base64Decode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = str.replace(/-/g, '+').replace(/_/g, '/');
  while (buffer.length % 4) {
    buffer += '=';
  }
  
  let result = '';
  for (let i = 0; i < buffer.length; i += 4) {
    const w = chars.indexOf(buffer[i] || '');
    const x = chars.indexOf(buffer[i + 1] || '');
    const y = chars.indexOf(buffer[i + 2] || '');
    const z = chars.indexOf(buffer[i + 3] || '');
    
    const a = (w << 2) | (x >> 4);
    const b = ((x & 15) << 4) | (y >> 2);
    const c = ((y & 3) << 6) | z;
    
    result += String.fromCharCode(a);
    if (y !== 64 && buffer[i + 2] !== '=') result += String.fromCharCode(b);
    if (z !== 64 && buffer[i + 3] !== '=') result += String.fromCharCode(c);
  }
  return result;
};

const decodeJwt = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = base64Decode(parts[1]);
    return JSON.parse(decoded);
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(escape(base64Decode(parts[1]))));
    } catch (err) {
      return null;
    }
  }
};

export default function LoginPage({navigation}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const signIn = () => {
    if (!username || !username.trim() || !password || !password.trim()) {
      Alert.alert(
        'Thông báo',
        'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!',
      );
      return;
    }

    console.log('Username:', username);
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: username.trim(),
      password,
    }).toString();
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };
    setIsLoading(true);
    fetch(KEYCLOAK_TOKEN_ENDPOINT, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        return response.json();
      })
      .then(async data => {
        if (!data.access_token) {
          throw new Error('Missing access token');
        }

        // Verify client-side role first
        const payload = decodeJwt(data.access_token);
        const roles = payload?.realm_access?.roles || [];
        if (!roles.includes('teacher')) {
          Alert.alert(
            'Từ chối truy cập',
            'Tài khoản của bạn là Sinh viên. Vui lòng đăng nhập bằng tài khoản Giảng viên!',
          );
          setIsLoading(false);
          return;
        }

        await AsyncStorage.setItem('accessToken', data.access_token);

        // Fetch teacher profile to verify approved/pending/rejected status
        try {
          const config = {
            headers: {
              Authorization: 'Bearer ' + data.access_token,
            },
          };
          const profileResponse = await axios.get(
            `${API_BASE_URL}/teacher/profile`,
            config,
          );
          const profileData = profileResponse.data;
          console.log('Teacher Account Status:', profileData?.accountStatus);

          if (profileData) {
            const status = profileData.accountStatus || 'PENDING';
            if (status === 'PENDING' || status === 'REJECTED') {
              navigation.replace('PendingApproval');
            } else {
              navigation.replace('Main');
            }
          } else {
            // Fallback if profile response is empty
            navigation.replace('Main');
          }
        } catch (err) {
          console.error('Error fetching teacher profile status:', err);
          if (err.response?.status === 403) {
            Alert.alert(
              'Từ chối truy cập',
              'Tài khoản của bạn không có quyền truy cập ứng dụng Giảng viên!',
            );
          } else {
            // General network error fallback (since role was already validated in JWT)
            navigation.replace('Main');
          }
        }
      })
      .catch(error => {
        console.error(error);
        if (error.message !== 'Missing access token' && !error.message.includes('Từ chối')) {
          Alert.alert(
            'Lỗi đăng nhập',
            'Tên đăng nhập hoặc mật khẩu không chính xác.',
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: theme.bg}]} behavior="padding">
      <View style={styles.logoZone}>
        <Text style={[styles.logoText, {color: theme.text}]}>BKHN</Text>
        <Text style={[styles.subLogoText, {color: theme.primary}]}>Teacher Portal</Text>
      </View>
      <View style={styles.signInZone}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, {backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border}]}
            placeholder="Your Email / Username"
            value={username}
            onChangeText={val => setUsername(val)}
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, {backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border}]}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={val => setPassword(val)}
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
        </View>
      </View>
      <View style={styles.bottomZone}>
        <TouchableOpacity
          style={[styles.primaryButton, {backgroundColor: theme.primary}, isLoading && styles.disabledButton]}
          onPress={() => signIn()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>ĐĂNG NHẬP SSO</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row2Bot}>
          <TouchableOpacity
            style={styles.signUp}
            onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.signUpText, {color: theme.secondary}]}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.signUpText, {color: theme.textSecondary}]}>Forgot Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flex: 3,
    justifyContent: 'center',
    width: '80%',
    paddingLeft: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -1,
  },
  subLogoText: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'System',
    marginTop: -5,
  },
  signInZone: {
    flex: 2,
    width: '80%',
    justifyContent: 'center',
  },
  textInput: {
    height: 55,
    width: '100%',
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 16,
  },
  bottomZone: {
    flex: 3,
    justifyContent: 'flex-start',
    width: '80%',
    marginTop: 20,
  },
  primaryButton: {
    width: '100%',
    height: 55,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  row2Bot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 5,
  },
  signUp: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPassword: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
