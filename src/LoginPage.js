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
} from 'react-native';
import {storeData, getData} from './Utility';
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
    <View style={styles.container}>
      <View style={styles.logoZone}>
        <Text style={styles.logoText}>Welcome</Text>
      </View>
      <View style={styles.signInZone}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Your Email"
            value={username}
            onChangeText={val => setUsername(val)}
            placeholderTextColor="#C7C7CD"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={val => setPassword(val)}
            placeholderTextColor="#C7C7CD"
            autoCapitalize="none"
          />
        </View>
      </View>
      <View style={styles.bottomZone}>
        <View style={styles.row1Bot}>
          <View style={styles.nothing}>
            {isLoading && <ActivityIndicator size="large" color="#8A4C7D" />}
          </View>
          <View style={styles.signInButtonView}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => signIn()}
              disabled={isLoading}>
              <Text style={styles.arrowText}>&rarr;</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.row2Bot}>
          <TouchableOpacity
            style={styles.signUp}
            onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nothing1}></TouchableOpacity>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.signUpText}>Forgot Password</Text>
          </TouchableOpacity>
        </View>
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
    flex: 396,
    justifyContent: 'center',
    width: '80%',
    paddingLeft: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
  },
  signInZone: {
    flex: 140,
    width: '80%',
    display: 'flex',
    justifyContent: 'space-between',
    padding: 10,
  },
  inputSignIn: {
    margin: '0 10px 0 0',
  },
  textInput: {
    height: 60,
    width: 303,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  bottomZone: {
    flex: 336,
    justifyContent: 'center',
    //backgroundColor: "#4C525C",
    width: '80%',
  },
  row1Bot: {
    flex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  row2Bot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    //
  },
  nothing: {
    flex: 239,
  },
  signInButtonView: {
    flex: 64,
    borderRadius: 20,
    marginRight: 10,
  },
  arrowButton: {
    width: 64,
    height: 64,
    borderRadius: 64,
    backgroundColor: '#8A4C7D',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  arrowText: {
    fontSize: 40,
    color: '#fff',
    position: 'absolute',
    top: -2,
    left: 12,
    right: 0,
    bottom: 20,
  },
  signUp: {
    flex: 68,
    // backgroundColor: "#E4DB7C",
    alignItems: 'center',
    justifyContent: 'center',
  },
  nothing1: {
    flex: 75,
  },
  forgotPassword: {
    flex: 151,
    //backgroundColor: "#E4DB7C",
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
  },
});
