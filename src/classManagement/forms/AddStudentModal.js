import React, { useState, useEffect } from 'react';
import { Modal, View, TextInput, Button, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import axios from 'axios'; // Thêm axios để gọi API
import { API_URL } from '@env'; // Thêm API_URL từ file env.js
import { getData } from '../../Utility'; // Thêm hàm getData từ file Utility.js

const AddStudentModal = ({ visible, onClose, onSubmit }) => {
  const [searchName, setSearchName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentId, setStudentId] = useState(''); // Thêm state để lưu id của sinh viên 
  const [searchResults, setSearchResults] = useState([]); // State để lưu kết quả tìm kiếm

  useEffect(() => {
    // Hàm gọi API để tìm kiếm sinh viên
    const fetchSearchResults = async () => {
      if (searchName) {
        let config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `${API_URL}/teacher/search-student?name=${searchName}`,
          headers: { 
            'Authorization': 'Bearer ' + await getData('accessToken')
          }
        };
        
        axios.request(config)
        .then((response) => {
          setSearchResults(response.data); // Lưu kết quả tìm kiếm vào state
          console.log(JSON.stringify(response.data));
        })
        .catch((error) => {
          console.log(error);
        });
      } else {
        setSearchResults([]); // Nếu không có gì để tìm kiếm, đặt kết quả về rỗng
      }
    };

    fetchSearchResults();
  }, [searchName]);

  const handleSubmit = async () => {
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/add-student-to-course?courseId=${await getData('currentClassId')}&studentId=${studentId}`,
      headers: { 
        'Authorization': 'Bearer ' + await getData('accessToken'),
      }
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      if(response.status === 200) {
        alert('Thêm sinh viên thành công');
      }
    })
    .catch((error) => {
      console.log(error);
      console.log('Response data:', error.response.data);
      console.log('Response status:', error.response.status);
      if(error.response.status === 400 && error.response.data.message === 'Student already registered to this course') {
        alert('Sinh viên đã tồn tại trong lớp');
      }
    });
    onSubmit(studentName);
    onClose();
  };

  const handleSelectStudent = (student) => {
    setStudentName(student.name);
    setStudentCode(student.studentCode);
    setStudentId(student.id); // Lưu id của sinh viên
    setSearchResults([]); // Xóa kết quả tìm kiếm sau khi chọn sinh viên
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TextInput
            style={styles.input}
            placeholder="Tìm theo tên sinh viên"
            value={searchName}
            onChangeText={setSearchName}
          />
          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectStudent(item)} style={styles.searchResultItem}>
                  <Text style={styles.searchResultText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id} // Giả sử mỗi sinh viên có một mã duy nhất
              style={styles.searchResults}
            />
          )}
          <Text style={styles.label}>Họ tên: {studentName}</Text>
          <Text style={styles.label}>MSSV: {studentCode}</Text>
          <View style={styles.buttonGroup}>
            <Button title="Thêm" onPress={handleSubmit} color="#007BFF" style={styles.button}/>
            <Button title="Đóng" onPress={onClose} color="#FF0000" style={styles.button}/>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    width: '80%', // Điều chỉnh chiều rộng của modal content
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  searchResults: {
    maxHeight: 150, // Giới hạn chiều cao của danh sách tìm kiếm
    marginBottom: 10,
    backgroundColor: '#fff', // Thêm màu nền cho danh sách
    borderRadius: 5,
    shadowColor: '#000', // Thêm shadow cho danh sách
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5, // Thêm shadow cho Android
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#f9f9f9', // Thêm màu nền cho item
    borderRadius: 5,
    marginVertical: 5,
  },
  searchResultText: {
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10, // Khoảng cách giữa input và buttonGroup
  },
  button: {
    flex: 1, // Phân chia độ rộng của nút
    marginHorizontal: 5 // Khoảng cách giữa các nút
  }
});

export default AddStudentModal;
