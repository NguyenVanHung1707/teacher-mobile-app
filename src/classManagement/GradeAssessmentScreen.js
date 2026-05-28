import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, formatToView, convertTime} from '../Utility';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function GradeAssessmentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {submissionId, studentName, assessmentTitle, assessmentId} = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [assessment, setAssessment] = useState(null);
  
  // Grading state
  const [questionGrades, setQuestionGrades] = useState({}); // questionId -> { score: number, comment: string }
  const [overallFeedback, setOverallFeedback] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      const classId = await getData('currentClassId');
      const headers = {Authorization: `Bearer ${token}`};

      // 1. Fetch submission list to get answers
      const subsResponse = await axios.get(
        `${API_URL}/teacher/assessments/${assessmentId}/submissions`,
        {headers}
      );
      const sub = subsResponse.data.find(s => s.id === submissionId);
      
      if (!sub) {
        throw new Error('Không tìm thấy bài nộp của sinh viên');
      }
      setSubmission(sub);
      setOverallFeedback(sub.teacherFeedback || '');

      // 2. Fetch original assessment questions & keys
      const assessResponse = await axios.get(
        `${API_URL}/courses/${classId}/assessments`,
        {headers}
      );
      const matchAssess = assessResponse.data.find(a => a.id === assessmentId);
      if (!matchAssess) {
        throw new Error('Không tìm thấy thông tin đề thi');
      }
      setAssessment(matchAssess);

      // 3. Initialize grading state
      const initialGrades = {};
      matchAssess.questions?.forEach(q => {
        // Find existing graded answer
        const existingAns = sub.answers?.find(a => a.questionId === q.id);
        
        // Auto-grade calculation fallback if score is null
        let defaultScore = 0;
        if (existingAns) {
          if (existingAns.score !== null && existingAns.score !== undefined) {
            defaultScore = existingAns.score;
          } else if (q.type === 'MULTIPLE_CHOICE') {
            // Check if correct
            try {
              const meta = JSON.parse(q.metadata || '{}');
              const isCorrect = meta.correct_choice?.toLowerCase() === existingAns.selectedChoice?.toLowerCase();
              defaultScore = isCorrect ? q.score : 0;
            } catch (e) {
              defaultScore = 0;
            }
          } else if (q.type === 'SHORT_ANSWER') {
            try {
              const meta = JSON.parse(q.metadata || '{}');
              const isCorrect = meta.keywords?.some(
                kw => kw.trim().toLowerCase() === existingAns.answerText?.trim().toLowerCase()
              );
              defaultScore = isCorrect ? q.score : 0;
            } catch (e) {
              defaultScore = 0;
            }
          }
        }

        initialGrades[q.id] = {
          score: defaultScore.toString(),
          comment: existingAns?.teacherComment || '',
        };
      });
      setQuestionGrades(initialGrades);

    } catch (error) {
      console.log('Error loading grading space:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải không gian chấm thi!');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [submissionId]);

  const handleScoreChange = (questionId, maxScore, val) => {
    // Basic validation for float/double numbers
    const cleanVal = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanVal);
    
    if (num > maxScore) {
      Alert.alert('Cảnh báo', `Điểm tối đa của câu hỏi này là ${maxScore}đ`);
      setQuestionGrades(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          score: maxScore.toString(),
        },
      }));
      return;
    }

    setQuestionGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        score: cleanVal,
      },
    }));
  };

  const handleCommentChange = (questionId, commentText) => {
    setQuestionGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comment: commentText,
      },
    }));
  };

  const handleSubmitGrades = async () => {
    setIsSubmitting(true);
    try {
      const token = await getData('accessToken');
      const answersPayload = Object.keys(questionGrades).map(qId => ({
        questionId: parseInt(qId),
        score: parseFloat(questionGrades[qId].score || 0),
        comment: questionGrades[qId].comment,
      }));

      const payload = {
        feedback: overallFeedback,
        answers: answersPayload,
      };

      const response = await axios.put(
        `${API_URL}/teacher/submissions/${submissionId}/grade`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        Alert.alert('Thành công', 'Chấm điểm và phản hồi bài thi thành công!');
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error submitting grades:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi kết quả chấm thi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !assessment || !submission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#34568B" />
        <Text style={styles.loadingText}>Đang chuẩn bị bài làm sinh viên...</Text>
      </View>
    );
  }

  const questions = assessment.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const studentAns = submission.answers?.find(a => a.questionId === currentQ.id);
  const totalQuestions = questions.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={18} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Chấm thi: {studentName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {assessmentTitle}
          </Text>
        </View>
      </View>

      {/* GPS Integrity Bar */}
      {assessment.isLocationRequired && (
        <View
          style={[
            styles.gpsBar,
            submission.isValidLocation ? styles.gpsValid : styles.gpsInvalid,
          ]}
        >
          <Icon
            name={submission.isValidLocation ? 'check-circle' : 'exclamation-circle'}
            size={14}
            color={submission.isValidLocation ? '#155724' : '#721C24'}
          />
          <Text
            style={[
              styles.gpsText,
              {color: submission.isValidLocation ? '#155724' : '#721C24'},
            ]}
          >
            {submission.isValidLocation
              ? `Vị trí nộp bài hợp lệ (${submission.calculatedDistance?.toFixed(1)}m từ lớp)`
              : submission.mockLocationDetected
              ? 'Phát hiện thiết bị sử dụng định vị giả (FAKE GPS)!'
              : `Nộp bài sai vị trí lớp học (Khoảng cách: ${submission.calculatedDistance?.toFixed(1)}m)`}
          </Text>
        </View>
      )}

      {/* Main Grading Panel */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Progress Grid Selector */}
        <View style={styles.qSelectorContainer}>
          <Text style={styles.sectionTitle}>Sơ đồ câu hỏi</Text>
          <View style={styles.gridRow}>
            {questions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const hasGrades = questionGrades[q.id]?.score !== '';
              const isEssay = q.type === 'ESSAY';
              
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.gridItem,
                    isCurrent && styles.gridItemCurrent,
                    hasGrades && !isEssay && styles.gridItemGraded,
                    isEssay && !hasGrades && styles.gridItemEssayPending,
                    isEssay && hasGrades && styles.gridItemEssayGraded,
                  ]}
                  onPress={() => setCurrentQuestionIndex(idx)}
                >
                  <Text
                    style={[
                      styles.gridItemText,
                      isCurrent && styles.gridItemTextCurrent,
                      (hasGrades || isEssay) && styles.gridItemTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Current Question Block */}
        <View style={styles.questionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.qNumberLabel}>Câu hỏi {currentQuestionIndex + 1}</Text>
            <Text style={styles.qScoreLabel}>Mức điểm: {currentQ.score}đ</Text>
          </View>
          <Text style={styles.qContent}>{currentQ.content}</Text>

          {/* Correct Answer Reference */}
          {(() => {
            try {
              const meta = JSON.parse(currentQ.metadata || '{}');
              if (currentQ.type === 'MULTIPLE_CHOICE') {
                return (
                  <View style={styles.refContainer}>
                    <Text style={styles.refLabel}>Đáp án đúng hệ thống:</Text>
                    {meta.choices?.map(c => {
                      const isCorrect = c.key?.toLowerCase() === meta.correct_choice?.toLowerCase();
                      return (
                        <View
                          key={c.key}
                          style={[
                            styles.choiceRow,
                            isCorrect && styles.choiceCorrect,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceKey,
                              isCorrect && styles.choiceTextCorrect,
                            ]}
                          >
                            {c.key}.
                          </Text>
                          <Text
                            style={[
                              styles.choiceText,
                              isCorrect && styles.choiceTextCorrect,
                            ]}
                          >
                            {c.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              } else if (currentQ.type === 'SHORT_ANSWER') {
                return (
                  <View style={styles.refContainer}>
                    <Text style={styles.refLabel}>Từ khóa đáp án đúng:</Text>
                    <Text style={styles.refValueText}>
                      {meta.keywords?.join('  |  ')}
                    </Text>
                  </View>
                );
              }
            } catch (e) {
              return null;
            }
          })()}
        </View>

        {/* Student Response Block */}
        <View style={styles.studentAnswerCard}>
          <Text style={styles.sectionTitle}>Bài làm của sinh viên</Text>
          {!studentAns || (!studentAns.selectedChoice && !studentAns.answerText) ? (
            <Text style={styles.noAnswerText}>Sinh viên bỏ trống câu hỏi này.</Text>
          ) : currentQ.type === 'MULTIPLE_CHOICE' ? (
            <View style={styles.studentChoiceContainer}>
              <Text style={styles.responseLabel}>Lựa chọn đã chọn:</Text>
              <View style={styles.studentChoiceRow}>
                <View style={styles.studentChoiceBadge}>
                  <Text style={styles.studentChoiceBadgeText}>
                    {studentAns.selectedChoice}
                  </Text>
                </View>
                <Text style={styles.studentChoiceLabelText}>
                  {(() => {
                    try {
                      const meta = JSON.parse(currentQ.metadata || '{}');
                      return (
                        meta.choices?.find(
                          c => c.key?.toLowerCase() === studentAns.selectedChoice?.toLowerCase()
                        )?.text || ''
                      );
                    } catch (e) {
                      return '';
                    }
                  })()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.essayResponseContainer}>
              <Text style={styles.responseLabel}>Lời giải chi tiết:</Text>
              <Text style={styles.essayResponseText}>{studentAns.answerText}</Text>
            </View>
          )}
        </View>

        {/* Grading Form Block */}
        <View style={styles.gradingFormCard}>
          <Text style={styles.sectionTitle}>Chấm điểm & Nhận xét</Text>
          <View style={styles.scoreInputRow}>
            <Text style={styles.scoreInputLabel}>Nhập điểm số:</Text>
            <View style={styles.scoreInputWrapper}>
              <TextInput
                style={styles.scoreInput}
                keyboardType="numeric"
                placeholder="0.0"
                value={questionGrades[currentQ.id]?.score}
                onChangeText={val => handleScoreChange(currentQ.id, currentQ.score, val)}
              />
              <Text style={styles.maxScoreLabelSuffix}>/ {currentQ.score}đ</Text>
            </View>
          </View>

          <View style={styles.commentInputContainer}>
            <Text style={styles.commentInputLabel}>Nhận xét riêng cho câu này:</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Nhập lời nhận xét, góp ý cho đáp án..."
              multiline
              numberOfLines={3}
              value={questionGrades[currentQ.id]?.comment}
              onChangeText={text => handleCommentChange(currentQ.id, text)}
            />
          </View>
        </View>

        {/* Overall Feedback Block */}
        <View style={styles.overallFeedbackCard}>
          <Text style={styles.sectionTitle}>Phản hồi chung cho cả bài thi</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Nhận xét tổng thể năng lực, nhắc nhở hoặc biểu dương sinh viên..."
            multiline
            numberOfLines={4}
            value={overallFeedback}
            onChangeText={setOverallFeedback}
          />
        </View>
      </ScrollView>

      {/* Bottom Navigation & Save Actions */}
      <View style={styles.footer}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            disabled={currentQuestionIndex === 0}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          >
            <Icon name="arrow-left" size={14} color={currentQuestionIndex === 0 ? '#CBD5E1' : '#475569'} />
            <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
              Trước đó
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentQuestionIndex === totalQuestions - 1 && styles.navButtonDisabled,
            ]}
            disabled={currentQuestionIndex === totalQuestions - 1}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
          >
            <Text
              style={[
                styles.navButtonText,
                currentQuestionIndex === totalQuestions - 1 && styles.navButtonTextDisabled,
              ]}
            >
              Tiếp theo
            </Text>
            <Icon name="arrow-right" size={14} color={currentQuestionIndex === totalQuestions - 1 ? '#CBD5E1' : '#475569'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          disabled={isSubmitting}
          onPress={handleSubmitGrades}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check-square-o" size={16} color="#FFFFFF" style={{marginRight: 8}} />
              <Text style={styles.submitButtonText}>Hoàn Thành Chấm Điểm</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  gpsValid: {
    backgroundColor: '#D4EDDA',
    borderBottomColor: '#C3E6CB',
  },
  gpsInvalid: {
    backgroundColor: '#F8D7DA',
    borderBottomColor: '#F5C6CB',
  },
  gpsText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  qSelectorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridItem: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  gridItemCurrent: {
    borderColor: '#34568B',
    borderWidth: 2,
    backgroundColor: '#EBF1FA',
  },
  gridItemGraded: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
  },
  gridItemEssayPending: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEBAA',
  },
  gridItemEssayGraded: {
    backgroundColor: '#D1ECF1',
    borderColor: '#BEE5EB',
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  gridItemTextCurrent: {
    color: '#34568B',
  },
  gridItemTextActive: {
    color: '#1E293B',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qNumberLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34568B',
    backgroundColor: '#EBF1FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  qScoreLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  qContent: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    lineHeight: 22,
  },
  refContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  refLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  refValueText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: 'bold',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  choiceCorrect: {
    backgroundColor: '#E8F8F5',
  },
  choiceKey: {
    fontWeight: 'bold',
    marginRight: 6,
    color: '#64748B',
  },
  choiceText: {
    color: '#475569',
  },
  choiceTextCorrect: {
    color: '#117A65',
    fontWeight: 'bold',
  },
  studentAnswerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  noAnswerText: {
    fontSize: 14,
    color: '#EF4444',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
  },
  studentChoiceContainer: {
    marginTop: 4,
  },
  studentChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentChoiceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34568B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentChoiceBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  studentChoiceLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  essayResponseContainer: {
    marginTop: 4,
  },
  essayResponseText: {
    fontSize: 14.5,
    color: '#1E293B',
    lineHeight: 22,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradingFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreInputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scoreInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInput: {
    width: 70,
    height: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34568B',
    backgroundColor: '#F8FAFC',
  },
  maxScoreLabelSuffix: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  commentInputContainer: {
    marginTop: 8,
  },
  commentInputLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  overallFeedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
    marginHorizontal: 8,
  },
  navButtonTextDisabled: {
    color: '#CBD5E1',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
