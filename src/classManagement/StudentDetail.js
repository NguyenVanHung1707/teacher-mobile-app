import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import the icon library

import { getData,storeData } from '../Utility';
import axios from 'axios';
import { API_URL } from '@env';
import AttendanceFormModal from './forms/AttendanceFormModal';
import { convertTime, formatToView } from '../Utility';
import ConfirmDeleteStudentModal from './forms/ConfirmDeleteStudentModal'; // Import the new modal

export default function StudentDetail() {
  const Separator = () => <View style={{ height: 10 }} />;
  const navigation = useNavigation();

  const [studentLogs, setStudentLogs] = useState([]);
  const [studentCode, setStudentCode] = useState();
  const [studentName, setStudentName] = useState();
  const [studentNumberOfAbsent, setStudentNumberOfAbsent] = useState();
  const [studentNumberOfPresent, setStudentNumberOfPresent] = useState();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // State to control delete confirmation modal visibility
  const [isDeleteAttendace, setIsDeleteAttendace] = useState(false); 
  
  const fetchData = async () => {
    setStudentCode(await getData('currentStudentCode'));
    setStudentName(await getData('currentStudentName'));
    setStudentNumberOfAbsent(await getData('currentStudentNumberOfAbsent'));
    setStudentNumberOfPresent(await getData('currentStudentNumberOfPresent'));
    let currentClassId = await getData('currentClassId');
    let currentStudentId = await getData('currentStudentId');
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/get-all-attendance-of-student-of-course?courseId=${currentClassId}&studentId=${currentStudentId}`,
      headers: {
        'Authorization': 'Bearer ' + await getData('accessToken')
      }
    };

    axios.request(config)
      .then((response) => {
        setStudentLogs(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteStudent = async () => {
    let currentClassId = await getData('currentClassId');
    let currentStudentId = await getData('currentStudentId');
    let config = {
      method: 'delete',
      url: `${API_URL}/teacher/delete-student-from-course?courseId=${currentClassId}&studentId=${currentStudentId}`,
      headers: {
        'Authorization': 'Bearer ' + await getData('accessToken')
      }
    };

    axios.request(config)
      .then(async (response) => {
        console.log(response.data);
        setDeleteModalVisible(false);
        navigation.navigate('ClassDetail');
        Alert.alert(`Xóa sinh viên ${await getData('currentStudentName')} khỏi lớp thành công`);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  // New function to handle attendance deletion
  const handleDeleteAttendance = async (attendanceId, isAttendance) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa buổi điểm danh này không?',
      [
        {
          text: 'Hủy',
          onPress: () => console.log('Xóa bị hủy'),
          style: 'cancel',
        },
        {
          text: 'Xóa',
          onPress: async () => {
            let config = {
              method: 'delete',
              url: `${API_URL}/teacher/delete-attendance?attendanceId=${attendanceId}`,
              headers: {
                'Authorization': 'Bearer ' + await getData('accessToken')
              }
            };

            axios.request(config)
              .then(async (response) => {
                console.log(response.data);
                if (isAttendance) {
                  storeData('currentStudentNumberOfPresent', (parseInt(studentNumberOfPresent) - 1).toString());
                } else {
                  storeData('currentStudentNumberOfAbsent', (parseInt(studentNumberOfAbsent) - 1).toString());
                }
                await fetchData(); // Refresh the list after deletion
              })
              .catch((error) => {
                console.log(error);
              });
          },
          style: 'destructive'
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã sinh viên:</Text>
            <Text style={styles.infoValue}>{studentCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên:</Text>
            <Text style={styles.infoValue}>{studentName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số buổi vắng:</Text>
            <Text style={styles.infoValue}>{studentNumberOfAbsent}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số buổi đi:</Text>
            <Text style={styles.infoValue}>{studentNumberOfPresent}</Text>
          </View>
        </View>
      </View>
      <View style={styles.activeBar}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>Tạo buổi điểm danh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.addButtonText}>Xóa sinh viên khỏi lớp</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.containerHeader}>
        <Text style={styles.header}>Thông tin điểm danh sinh viên</Text>
      </View>
      <View style={styles.test1}>
        <FlatList
          data={studentLogs}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View>
                  <Text style={styles.infoLabel}>Thời gian điểm danh:</Text>
                  <Text style={styles.infoValue}>{formatToView(convertTime(item.attendanceTime))}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteAttendance(item.id, item.isAttendance)}>
                  <Icon name="trash" size={24} color="#FF0000" />
                </TouchableOpacity>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buổi học số:</Text>
                <Text style={styles.infoValue}>{item.lectureNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Đi/Vắng:</Text>
                <Text style={styles.infoValue}>{item.isAttendance ? 'Đi' : 'Vắng'}</Text>
              </View>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ItemSeparatorComponent={Separator}
        />
      </View>
      <AttendanceFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (isAttendance) => {
          if(isAttendance) {
            storeData('currentStudentNumberOfPresent', (parseInt(studentNumberOfPresent) + 1).toString());
          } else {
            storeData('currentStudentNumberOfAbsent', (parseInt(studentNumberOfAbsent) + 1).toString());
          }
          await fetchData();
        }} // Refresh the data when a new attendance session is created
      />
      <ConfirmDeleteStudentModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteStudent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 3,
    padding: 20,
    backgroundColor: '#ECF0F1',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  containerHeader: {
    alignItems: 'center',
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center' // Aligns text and icon vertically
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
  },
  test1: {
    backgroundColor: '#ECF0F1',
    flex: 11,
  },
  activeBar: {
    flex: 1.25,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ECF0F1',
    padding: 10,
  },
  addButton: {
    backgroundColor: '#34568B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
