import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import {useFocusEffect} from '@react-navigation/native';
import {API_URL} from '@env';
import {getData, storeData, getThemeColors} from '../Utility';

export default function CreateFormSelectClassScreen({navigation}) {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      const response = await axios.get(`${API_URL}/teacher/get-my-courses`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching courses for form creation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchClasses();
    }, []),
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <Text style={[styles.headerSubtitle, {color: colors.primary}]}>ĐIỂM DANH</Text>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Tạo Form Điểm Danh</Text>
      </View>
 
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{color: colors.textSecondary, marginTop: 12}}>Đang tải danh sách lớp học...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Chọn lớp học phần để tạo form điểm danh:</Text>
          
          <FlatList
            data={classes}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[styles.classSelectItem, {backgroundColor: colors.card, borderColor: colors.border}]}
                onPress={async () => {
                  await storeData('currentClassId', item.id.toString());
                  await storeData('currentClassCode', item.courseCode);
                  await storeData('currentClassSubject', item.subject);
                  await storeData('currentClassDescription', item.description ?? '');
                  navigation.navigate('AddFormScreen');
                }}
              >
                <View style={styles.classIconBg}>
                  <Icon name="check-square-o" size={18} color="#FFFFFF" />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={[styles.classItemCode, {color: colors.text}]}>{item.courseCode}</Text>
                  <Text style={[styles.classItemSubject, {color: colors.textSecondary}]}>{item.subject}</Text>
                </View>
                <Icon name="chevron-right" size={14} color={colors.placeholder} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  classSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  classIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#34568B', // Blue color for attendance form
    justifyContent: 'center',
    alignItems: 'center',
  },
  classItemCode: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  classItemSubject: {
    fontSize: 12,
    marginTop: 2,
  },
});
