import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';

export default function QuestionCard({ questionInfo, onPress, onLongPress }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.questionInfoContainer}>
        <Text style={styles.question}>{`Câu hỏi: ${questionInfo.question}`}</Text>
        {questionInfo.answers.map((answer, index) => (
          <View key={index} style={styles.answerItemContainer}>
            <Text style={styles.answer}>{`Câu trả lời: ${answer.text}`}</Text>
            <Text style={styles.correctText}>{answer.correct ? 'Đúng' : 'Sai'}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#00ff99',
    borderRadius: 10,
    marginBottom: 10,
  },
  questionInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  answerItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    justifyContent: 'space-between',
  },
  answer: {
    fontSize: 15,
    color: 'gray',
    flex: 1,
  },
  correctText: {
    color: 'green',
    fontWeight: 'bold',
  },
});
