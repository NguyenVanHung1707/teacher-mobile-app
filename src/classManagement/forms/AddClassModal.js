import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function AddClassModal({ visible, onClose, onSubmit }) {
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleAddClass = () => {
    //check null value
    if (courseCode === '' || subject === '') {
      alert('Vui lòng nhập đầy đủ thông tin mã lớp và môn học');
      return;
    }
    onSubmit( courseCode, subject, description );
    setCourseCode('');
    setSubject('');
    setDescription('');
    alert('Thêm lớp thành công');
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Thêm lớp</Text>
          <TextInput
            style={styles.input}
            placeholder="Mã lớp"
            value={courseCode}
            onChangeText={setCourseCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Môn học"
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={styles.input}
            placeholder="Mô tả"
            value={description}
            onChangeText={setDescription}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleAddClass}>
              <Text style={styles.buttonText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});