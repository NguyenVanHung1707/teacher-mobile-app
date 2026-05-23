import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Switch } from 'react-native';

const UpdateQuestionModal = ({ modalVisible, setModalVisible, currentQuestion, setQuestionsList }) => {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (currentQuestion) {
      setQuestion(currentQuestion.question || '');
      setAnswers(currentQuestion.answers || []);
    }
  }, [currentQuestion]);

  const addAnswer = () => {
    setAnswers([...answers, { text: '', correct: false }]);
  };

  const updateAnswer = (index, text) => {
    const newAnswers = [...answers];
    newAnswers[index].text = text;
    setAnswers(newAnswers);
    console.log(answers);
  };

  const toggleCorrectness = (index) => {
    const newAnswers = [...answers];
    newAnswers[index].correct = !newAnswers[index].correct;
    setAnswers(newAnswers);
  };

  const handleSave = () => {
    setQuestionsList((prevQuestionsList) => {
      const newQuestionsList = [...prevQuestionsList];
      const questionIndex = newQuestionsList.findIndex((q) => q.id === currentQuestion.id);
      newQuestionsList[questionIndex] = { ...currentQuestion, question, answers };
      return newQuestionsList;
    });
    setModalVisible(false);
  };

  const handleDelete = () => {
    setQuestionsList((prevQuestionsList) => prevQuestionsList.filter((q) => q.id !== currentQuestion.id));
    setModalVisible(false);
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cập nhật câu hỏi</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Câu hỏi</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập câu hỏi"
              value={question}
              onChangeText={setQuestion}
            />
          </View>
          <Text style={styles.inputLabel}>Câu trả lời</Text>
          {answers && Array.isArray(answers) && answers.map((answer, index) => (
            <View style={styles.answerItemContainer} key={index}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={`Câu trả lời ${index + 1}`}
                value={answer.text}
                onChangeText={(text) => updateAnswer(index, text)}
              />
              <Switch
                value={answer.correct}
                onValueChange={() => toggleCorrectness(index)}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addAnswer}>
            <Text style={styles.addButtonText}>Thêm câu trả lời</Text>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
              <Text style={styles.buttonText}>Xóa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
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
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  inputLabel: {
    marginBottom: 5,
    fontSize: 16,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  addButton: {
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  answerItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    justifyContent: 'space-between',
    width: '100%'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
});

export default UpdateQuestionModal;
