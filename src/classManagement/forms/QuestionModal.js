import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Switch } from 'react-native';

const QuestionModal = ({ modalVisible, setModalVisible, question, setQuestion, answers, setAnswers, handleAddQuestion }) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const addAnswer = () => {
    if (currentAnswer.trim() !== '') {
      setAnswers([...answers, { text: currentAnswer, correct: isCorrect }]);
      setCurrentAnswer('');
      setIsCorrect(false);
    }
  };

  const toggleCorrectness = (index) => {
    const newAnswers = [...answers];
    newAnswers[index].correct = !newAnswers[index].correct;
    setAnswers(newAnswers);
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
          <Text style={styles.modalTitle}>Thêm câu hỏi</Text>
          <TextInput
            style={styles.input}
            placeholder="Câu hỏi"
            value={question}
            onChangeText={setQuestion}
          />
          <TextInput
            style={styles.input}
            placeholder="Câu trả lời"
            value={currentAnswer}
            onChangeText={setCurrentAnswer}
          />
          <View style={styles.switchContainer}>
            <Text>Đúng</Text>
            <Switch
              value={isCorrect}
              onValueChange={setIsCorrect}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addAnswer}>
            <Text style={styles.addButtonText}>Thêm câu trả lời</Text>
          </TouchableOpacity>
          {answers.map((answer, index) => (
            <View key={index} style={styles.answerItemContainer}>
              <Text style={styles.answerItem}>{answer.text}</Text>
              <Switch
                value={answer.correct}
                onValueChange={() => toggleCorrectness(index)}
                style={styles.answerSwitch}
              />
            </View>
          ))}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleAddQuestion}>
              <Text style={styles.buttonText}>Thêm câu hỏi</Text>
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
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    width: '100%',
  },
  answerItem: {
    fontSize: 15,
    color: 'gray',
    flex: 1,
  },
  answerSwitch: {
    marginLeft: 10,
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
  cancelButton: {
    backgroundColor: '#FF0000',
  },
});

export default QuestionModal;