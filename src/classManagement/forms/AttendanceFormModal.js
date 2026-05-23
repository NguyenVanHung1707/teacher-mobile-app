import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API_URL } from '@env';
import { getData } from '../../Utility';
import { convertTime, formatToDate, stringToDate, stringToTime } from '../../Utility';

export default function AttendanceFormModal({ visible, onClose, onSubmit }) {
  const [lectureNumber, setLectureNumber] = useState('');
  const currentTime = new Date();
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const nowTime = `${hours}:${minutes}`;
  const [attendanceDate, setAttendanceDate] = useState(formatToDate(new Date().toISOString().slice(0, 10)));
  const [attendanceHour, setAttendanceHour] = useState(nowTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAttendance, setIsAttendance] = useState(true);
  const [isSelectingDate, setIsSelectingDate] = useState(false); // Biến trạng thái xác định trường ngày đang được chọn
  const [isSelectingTime, setIsSelectingTime] = useState(false); // Biến trạng thái xác định trường giờ đang được chọn

  const handleCreateAttendance = async () => {
    const currentClassId = await getData('currentClassId');
    if (lectureNumber === '') {
      alert('Vui lòng nhập buổi học số ...');
      return;
    }
    // Chuyển attendanceHour thành đối tượng Date
    const [hour, minute] = attendanceHour.split(':');
    const dateWithHour = new Date();
    dateWithHour.setHours(hour);
    dateWithHour.setMinutes(minute);

    // Chuyển attendanceDate thành đối tượng Date
    const [day, month, year] = attendanceDate.split('/');
    const dateWithDate = new Date(`${year}-${month}-${day}`);

    // Kết hợp đối tượng Date hour và date để tạo attendanceTime
    const attendanceTime = new Date(
      dateWithDate.getFullYear(),
      dateWithDate.getMonth(),
      dateWithDate.getDate(),
      dateWithHour.getHours(),
      dateWithHour.getMinutes()
    ).toISOString(); // Chuyển đối tượng Date thành chuỗi ISO

    // Tạo đối tượng dữ liệu JSON với attendanceTime
    const data = JSON.stringify({
      "lectureNumber": lectureNumber,
      "attendanceTime": attendanceTime,
      "isAttendance": isAttendance,
      "courseId": currentClassId,
      "studentId": await getData('currentStudentId')
    });
    console.log(data);

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/add-attendance`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + await getData('accessToken')
      },
      data: data
    };
    console.log(data);

    axios.request(config)
      .then((response) => {
        console.log(response.data);
        onSubmit(isAttendance); // Gọi hàm onSubmit để làm mới dữ liệu trong StudentDetail
        onClose(); // Đóng modal
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const onChangeDate = (event, selectedDate) => {
    console.log('Selected date:', selectedDate);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Đảm bảo tháng luôn có 2 chữ số
    const day = String(selectedDate.getDate()).padStart(2, '0'); // Đảm bảo ngày luôn có 2 chữ số
    const dateString = `${day}/${month}/${year}`;
    setIsSelectingDate(false); // Sau khi chọn xong ngày, đặt isSelectingDate thành false
    setAttendanceDate(dateString);
  };

  const onChangeHour = (event, selectedDate) => {
    const hours = selectedDate.getHours().toString().padStart(2, '0'); // Lấy giờ và đảm bảo có 2 chữ số
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0'); // Lấy phút và đảm bảo có 2 chữ số
    const timeString = `${hours}:${minutes}`;
    setShowDatePicker(Platform.OS === 'ios');
    setAttendanceHour(timeString);
    console.log('Selected time:', timeString);
    setIsSelectingTime(false); // Sau khi chọn xong giờ, đặt isSelectingTime thành false
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Tạo buổi điểm danh</Text>
          <TextInput
            style={styles.input}
            placeholder="Buổi học số"
            value={lectureNumber}
            onChangeText={setLectureNumber}
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={() => {
            setShowDatePicker(true);
            setIsSelectingDate(true); // Khi nhấn vào trường ngày, đặt isSelectingDate thành true
            setIsSelectingTime(false); // Đồng thời đặt isSelectingTime thành false
          }} style={styles.input}>
            <Text>{attendanceDate}</Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showDatePicker && isSelectingDate && (
            <DateTimePicker
              value={stringToDate(attendanceDate)}
              mode="date"
              display="spinner"
              onChange={onChangeDate}
            />
          )}
          <TouchableOpacity onPress={() => {
            setShowDatePicker(true);
            setIsSelectingDate(false); // Khi nhấn vào trường giờ, đặt isSelectingDate thành false
            setIsSelectingTime(true); // Đồng thời đặt isSelectingTime thành true
          }} style={styles.input}>
            <Text>{attendanceHour}</Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showDatePicker && isSelectingTime && (
            <DateTimePicker
              value={stringToTime(attendanceHour)}
              mode="time"
              display="spinner"
              onChange={onChangeHour}
            />
          )}
          <View style={styles.radioContainer}>
            <TouchableOpacity onPress={() => setIsAttendance(true)} style={styles.radio}>
              <Text style={isAttendance ? styles.radioSelected : styles.radioText}>Đi</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsAttendance(false)} style={styles.radio}>
              <Text style={!isAttendance ? styles.radioSelected : styles.radioText}>Vắng</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCreateAttendance}>
            <Text style={styles.buttonText}>Tạo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Màu nền tối với độ mờ
  },
  modalView: {
    width: '80%', // Điều chỉnh chiều rộng để modal nhỏ hơn
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%'
  },
  radio: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginHorizontal: 5
  },
  radioText: {
    fontSize: 16,
    color: '#000'
  },
  radioSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007BFF'
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16
  }
});
