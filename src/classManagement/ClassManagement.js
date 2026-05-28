import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import ClassCard from './ClassCard';
import AddClassModal from './forms/AddClassModal';
import {getData, getThemeColors} from '../Utility';
import {useFocusEffect} from '@react-navigation/native';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const fetchData = async () => {
    setIsLoading(true);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/get-my-courses`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };
    axios
      .request(config)
      .then(response => {
        setClasses(response.data);
      })
      .catch(error => {
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const addCourse = () => {
    setModalVisible(true);
  };

  const handleAddClass = async (courseCode, subject, description) => {
    let data = JSON.stringify({
      courseCode: courseCode,
      subject: subject,
      description: description,
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/create-course`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
      data: data,
    };

    axios
      .request(config)
      .then(response => {
        console.log(JSON.stringify(response.data));
        fetchData(); // Reload the class list after adding a new class
      })
      .catch(error => {
        console.log(error);
      });
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}>
      {/* Premium Header Banner with Action */}
      <View style={[styles.headerBanner, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSubtitle, {color: theme.primary}]}>GIẢNG DẠY</Text>
          <Text style={[styles.headerTitle, {color: theme.text}]}>Lớp Học Quản Lý</Text>
        </View>
        
        <TouchableOpacity style={[styles.addButton, {backgroundColor: theme.primary}]} onPress={addCourse}>
          <Icon name="plus" size={14} color="#FFF" style={styles.addIcon} />
          <Text style={styles.addButtonText}>Tạo lớp</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {isLoading && classes.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, {color: theme.textSecondary}]}>Đang tải danh sách lớp học...</Text>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, {backgroundColor: theme.bgSecondary}]}>
              <Icon name="university" size={48} color={theme.placeholder} />
            </View>
            <Text style={[styles.emptyTitle, {color: theme.text}]}>Chưa có lớp giảng dạy</Text>
            <Text style={[styles.emptySubtitle, {color: theme.textSecondary}]}>
              Hãy nhấn nút "Tạo lớp" ở phía trên để khởi tạo lớp học phần mới của bạn.
            </Text>
          </View>
        ) : (
          <FlatList
            data={classes}
            renderItem={({item}) => <ClassCard classInfo={item} />}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{height: 4}} />}
          />
        )}
      </View>
      
      <AddClassModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddClass}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#0F62FE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flatListContent: {
    paddingBottom: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
