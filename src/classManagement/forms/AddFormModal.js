import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const AddFormModal = ({ visible, onClose, onSubmit }) => {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionsList, setQuestionsList] = useState([]);

  const handleAddQuestion = () => {
    if (question.trim() !== '') {
      setQuestionsList([...questionsList, question]);
      setQuestion('');
    }
  };

  const handleSubmit = () => {
    const expiryTime = `${hours}:${minutes}:${seconds}`;
    onSubmit({ expiryTime, questions: questionsList, answer });
    setHours('');
    setMinutes('');
    setSeconds('');
    setQuestionsList([]);
    setQuestion('');
    setAnswer('');
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Tạo Form Điểm Danh</Text>
          <View style={styles.expiryTimeContainer}>
            <Text style={styles.label}>Thời gian hết hạn</Text>
            <View style={styles.timeContainer}>
              <TextInput
                style={styles.timeInput}
                placeholder="Giờ"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.timeInput}
                placeholder="Phút"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.timeInput}
                placeholder="Giây"
                value={seconds}
                onChangeText={setSeconds}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.questionContainer}>
            <TextInput
              style={styles.input}
              placeholder="Câu hỏi"
              value={question}
              onChangeText={setQuestion}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddQuestion}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.questionsListContainer}>
            {questionsList.map((q, index) => (
              <Text key={index}>{q}</Text>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Câu trả lời"
            value={answer}
            onChangeText={setAnswer}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Tạo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  expiryTimeContainer: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    marginBottom: 5,
    fontSize: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    width: '30%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 10,
  },
  addButton: {
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  questionsListContainer: {
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#007BFF',
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#FF0000',
  },
});

export default AddFormModal;
