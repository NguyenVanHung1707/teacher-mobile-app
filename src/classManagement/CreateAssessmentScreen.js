import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData} from '../Utility';
import {getVerifiedLocation} from '../geofenceLocation';

export default function CreateAssessmentScreen({navigation, route}) {
  const {courseId} = route.params;

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('QUIZ'); // QUIZ, MID_TERM, FINAL_EXAM, ASSIGNMENT
  const [maxScore, setMaxScore] = useState('10');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [deadlineDays, setDeadlineDays] = useState('7'); // Default 7 days from now
  const [isPublished, setIsPublished] = useState(true);
  const [isLocationRequired, setIsLocationRequired] = useState(false);
  const [isCameraRequired, setIsCameraRequired] = useState(false);
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState('100');

  // Question list states
  const [questions, setQuestions] = useState([]);
  const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);

  // New question form states
  const [qType, setQType] = useState('MULTIPLE_CHOICE'); // MULTIPLE_CHOICE, SHORT_ANSWER, ESSAY
  const [qContent, setQContent] = useState('');
  const [qScore, setQScore] = useState('2.0');
  
  // MCQ choices
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctChoice, setCorrectChoice] = useState('A');

  // Short Answer keywords
  const [keywords, setKeywords] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleAddQuestion = () => {
    if (qContent.trim() === '') {
      Alert.alert('Lỗi', 'Nội dung câu hỏi không được để trống!');
      return;
    }

    const scoreNum = parseFloat(qScore);
    if (isNaN(scoreNum) || scoreNum <= 0) {
      Alert.alert('Lỗi', 'Điểm câu hỏi phải là số lớn hơn 0!');
      return;
    }

    let metadataStr = null;

    if (qType === 'MULTIPLE_CHOICE') {
      if (!choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ cả 4 phương án lựa chọn A, B, C, D!');
        return;
      }
      const choices = [
        {key: 'A', text: choiceA.trim()},
        {key: 'B', text: choiceB.trim()},
        {key: 'C', text: choiceC.trim()},
        {key: 'D', text: choiceD.trim()},
      ];
      metadataStr = JSON.stringify({
        choices,
        correct_choice: correctChoice,
      });
    } else if (qType === 'SHORT_ANSWER') {
      if (keywords.trim() === '') {
        Alert.alert('Lỗi', 'Vui lòng nhập các từ khóa đáp án đúng!');
        return;
      }
      const kwList = keywords.split(',').map(k => k.trim()).filter(k => k !== '');
      metadataStr = JSON.stringify({
        keywords: kwList,
        case_sensitive: false,
      });
    }

    const newQuestion = {
      id: Date.now().toString(),
      type: qType,
      content: qContent.trim(),
      score: scoreNum,
      orderIndex: questions.length + 1,
      metadata: metadataStr,
    };

    setQuestions([...questions, newQuestion]);
    resetQuestionForm();
    setIsQuestionModalVisible(false);
  };

  const resetQuestionForm = () => {
    setQContent('');
    setQScore('2.0');
    setChoiceA('');
    setChoiceB('');
    setChoiceC('');
    setChoiceD('');
    setCorrectChoice('A');
    setKeywords('');
  };

  const handleDeleteQuestion = (id) => {
    const updated = questions.filter(q => q.id !== id).map((q, idx) => ({
      ...q,
      orderIndex: idx + 1,
    }));
    setQuestions(updated);
  };

  const handleCreateAssessment = async () => {
    if (title.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề bài kiểm tra!');
      return;
    }

    const maxScoreVal = parseFloat(maxScore);
    if (isNaN(maxScoreVal) || maxScoreVal <= 0) {
      Alert.alert('Lỗi', 'Điểm tối đa phải là số lớn hơn 0!');
      return;
    }

    // Verify sum of questions' scores matches max score
    const totalQuestionsScore = questions.reduce((sum, q) => sum + q.score, 0);
    if (questions.length > 0 && Math.abs(totalQuestionsScore - maxScoreVal) > 0.01) {
      Alert.alert(
        'Xác nhận điểm số',
        `Tổng điểm của các câu hỏi (${totalQuestionsScore}đ) không bằng Điểm tối đa bài kiểm tra (${maxScoreVal}đ). Bạn có muốn tự động cập nhật Điểm tối đa thành ${totalQuestionsScore}đ không?`,
        [
          {text: 'Hủy', style: 'cancel'},
          {
            text: 'Cập nhật và Tiếp tục',
            onPress: () => {
              setMaxScore(totalQuestionsScore.toString());
              executeSubmit(totalQuestionsScore);
            },
          },
        ]
      );
      return;
    }

    executeSubmit(maxScoreVal);
  };

  const executeSubmit = async (finalMaxScore) => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      let location = null;

      if (isLocationRequired) {
        Alert.alert('Định vị GPS', 'Hệ thống đang lấy vị trí GPS hiện tại của bạn để cấu hình vòng tròn Geofencing...');
        location = await getVerifiedLocation();
      }

      // Calculate deadline datetime
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(deadlineDays || 7));

      const payload = {
        courseId: parseInt(courseId),
        title: title.trim(),
        description: description.trim(),
        type,
        maxScore: finalMaxScore,
        durationMinutes: parseInt(durationMinutes || 0),
        deadline: deadlineDate.toISOString(),
        scoreReleaseMode: 'AUTOMATIC',
        isPublished,
        isLocationRequired,
        isCameraRequired,
        allowedRadiusMeters: isLocationRequired ? parseInt(allowedRadiusMeters) : null,
        teacherLatitude: location?.latitude || null,
        teacherLongitude: location?.longitude || null,
        questions: questions.map(q => ({
          type: q.type,
          content: q.content,
          score: q.score,
          orderIndex: q.orderIndex,
          metadata: q.metadata,
        })),
      };

      const response = await axios.post(
        `${API_URL}/teacher/assessments`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Thành công', 'Tạo bài kiểm tra thành công!');
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error creating assessment:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo bài kiểm tra.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuestionItem = ({item, index}) => {
    let detailView = null;
    try {
      if (item.type === 'MULTIPLE_CHOICE') {
        const meta = JSON.parse(item.metadata || '{}');
        detailView = (
          <View style={styles.qDetailBlock}>
            {meta.choices?.map(c => (
              <Text
                key={c.key}
                style={[
                  styles.qChoiceText,
                  c.key === meta.correct_choice && styles.qChoiceTextCorrect,
                ]}
              >
                {c.key}. {c.text} {c.key === meta.correct_choice ? ' (Đáp án đúng)' : ''}
              </Text>
            ))}
          </View>
        );
      } else if (item.type === 'SHORT_ANSWER') {
        const meta = JSON.parse(item.metadata || '{}');
        detailView = (
          <View style={styles.qDetailBlock}>
            <Text style={styles.qKeyphraseText}>
              Từ khóa đúng: <Text style={{fontWeight: 'bold'}}>{meta.keywords?.join(', ')}</Text>
            </Text>
          </View>
        );
      }
    } catch (e) {
      // Ignored
    }

    return (
      <View style={styles.qCard}>
        <View style={styles.qCardHeader}>
          <Text style={styles.qIndexLabel}>Câu {index + 1}</Text>
          <View style={styles.qMetaRow}>
            <Text style={styles.qTypeBadge}>
              {item.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : item.type === 'SHORT_ANSWER' ? 'Từ khóa' : 'Tự luận'}
            </Text>
            <Text style={styles.qScoreBadge}>{item.score}đ</Text>
            <TouchableOpacity onPress={() => handleDeleteQuestion(item.id)} style={styles.deleteQBtn}>
              <Icon name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.qCardContent}>{item.content}</Text>
        {detailView}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={18} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo bài đánh giá nhanh</Text>
      </View>

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {/* Core details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
          
          <Text style={styles.inputLabel}>Tiêu đề bài kiểm tra</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tiêu đề (Ví dụ: Kiểm tra giữa kỳ, Lab 2, ...)"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.inputLabel}>Mô tả / Hướng dẫn</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập nội dung hướng dẫn làm bài..."
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.inputLabel}>Loại bài thi</Text>
              <View style={styles.pickerReplacement}>
                {['QUIZ', 'MID_TERM', 'FINAL_EXAM', 'ASSIGNMENT'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOptionBtn, type === t && styles.typeOptionBtnSelected]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextSelected]}>
                      {t === 'QUIZ' ? 'Trắc nghiệm' : t === 'MID_TERM' ? 'Giữa kỳ' : t === 'FINAL_EXAM' ? 'Cuối kỳ' : 'Bài tập'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.inputLabel}>Thời gian làm (phút)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="45"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.inputLabel}>Hạn nộp bài (số ngày)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={deadlineDays}
                onChangeText={setDeadlineDays}
                placeholder="7"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.inputLabel}>Điểm tối đa đề</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={maxScore}
                onChangeText={setMaxScore}
                placeholder="10"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={{flex: 1, justifyContent: 'center', paddingTop: 14}}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Công bố ngay</Text>
                <Switch value={isPublished} onValueChange={setIsPublished} />
              </View>
            </View>
          </View>
        </View>

        {/* Location Security */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.sectionTitle}>Bảo mật vị trí lớp học</Text>
              <Text style={styles.switchDesc}>Chỉ cho phép làm bài khi ở gần giáo viên</Text>
            </View>
            <Switch value={isLocationRequired} onValueChange={setIsLocationRequired} />
          </View>

          {isLocationRequired && (
            <View style={styles.radiusBlock}>
              <Text style={styles.inputLabel}>Bán kính cho phép (mét)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={allowedRadiusMeters}
                onChangeText={setAllowedRadiusMeters}
                placeholder="100"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}
        </View>

        {/* Camera Security */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={styles.sectionTitle}>Yêu cầu camera (AI giám sát)</Text>
              <Text style={styles.switchDesc}>Sinh viên phải bật camera giám sát góc nhìn khi thi</Text>
            </View>
            <Switch value={isCameraRequired} onValueChange={setIsCameraRequired} />
          </View>
        </View>

        {/* Questions Block */}
        <View style={styles.card}>
          <View style={styles.questionsHeaderRow}>
            <Text style={styles.sectionTitle}>Danh sách câu hỏi ({questions.length})</Text>
            <TouchableOpacity style={styles.addQButton} onPress={() => setIsQuestionModalVisible(true)}>
              <Icon name="plus" size={12} color="#FFFFFF" style={{marginRight: 6}} />
              <Text style={styles.addQButtonText}>Thêm câu hỏi</Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyQuestionsContainer}>
              <Icon name="question-circle-o" size={40} color="#CBD5E1" />
              <Text style={styles.emptyQuestionsText}>Chưa có câu hỏi nào. Tự luận/Điểm danh không bắt buộc thêm câu hỏi.</Text>
            </View>
          ) : (
            <FlatList
              data={questions}
              renderItem={renderQuestionItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{height: 10}} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer create button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAssessment}>
          <Text style={styles.submitBtnText}>Tạo bài đánh giá nhanh</Text>
        </TouchableOpacity>
      </View>

      {/* Add Question Modal */}
      <Modal visible={isQuestionModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Thêm câu hỏi mới</Text>

            <ScrollView style={styles.modalFormScroll}>
              <Text style={styles.inputLabel}>Loại câu hỏi</Text>
              <View style={styles.modalQTypeContainer}>
                {[
                  {key: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm'},
                  {key: 'SHORT_ANSWER', label: 'Trả lời ngắn'},
                  {key: 'ESSAY', label: 'Tự luận'},
                ].map(item => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.modalQTypeBtn, qType === item.key && styles.modalQTypeBtnSelected]}
                    onPress={() => setQType(item.key)}
                  >
                    <Text style={[styles.modalQTypeText, qType === item.key && styles.modalQTypeTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Điểm số câu hỏi</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={qScore}
                onChangeText={setQScore}
                placeholder="2.0"
              />

              <Text style={styles.inputLabel}>Nội dung câu hỏi</Text>
              <TextInput
                style={[styles.input, styles.modalQContentInput]}
                placeholder="Nhập nội dung câu hỏi..."
                multiline
                numberOfLines={3}
                value={qContent}
                onChangeText={setQContent}
              />

              {/* Conditional options rendering */}
              {qType === 'MULTIPLE_CHOICE' && (
                <View style={styles.mcqBlock}>
                  <Text style={styles.inputLabel}>Các phương án và đáp án đúng</Text>
                  
                  <View style={styles.choiceInputRow}>
                    <Text style={styles.choiceInputPrefix}>A</Text>
                    <TextInput
                      style={styles.choiceTextInput}
                      placeholder="Nhập phương án A..."
                      value={choiceA}
                      onChangeText={setChoiceA}
                    />
                  </View>
                  <View style={styles.choiceInputRow}>
                    <Text style={styles.choiceInputPrefix}>B</Text>
                    <TextInput
                      style={styles.choiceTextInput}
                      placeholder="Nhập phương án B..."
                      value={choiceB}
                      onChangeText={setChoiceB}
                    />
                  </View>
                  <View style={styles.choiceInputRow}>
                    <Text style={styles.choiceInputPrefix}>C</Text>
                    <TextInput
                      style={styles.choiceTextInput}
                      placeholder="Nhập phương án C..."
                      value={choiceC}
                      onChangeText={setChoiceC}
                    />
                  </View>
                  <View style={styles.choiceInputRow}>
                    <Text style={styles.choiceInputPrefix}>D</Text>
                    <TextInput
                      style={styles.choiceTextInput}
                      placeholder="Nhập phương án D..."
                      value={choiceD}
                      onChangeText={setChoiceD}
                    />
                  </View>

                  <Text style={styles.inputLabel}>Chọn đáp án đúng nhất</Text>
                  <View style={styles.correctChoicePicker}>
                    {['A', 'B', 'C', 'D'].map(key => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.correctChoiceBadge,
                          correctChoice === key && styles.correctChoiceBadgeSelected,
                        ]}
                        onPress={() => setCorrectChoice(key)}
                      >
                        <Text
                          style={[
                            styles.correctChoiceText,
                            correctChoice === key && styles.correctChoiceTextSelected,
                          ]}
                        >
                          {key}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {qType === 'SHORT_ANSWER' && (
                <View style={styles.shortAnswerBlock}>
                  <Text style={styles.inputLabel}>Các từ khóa đúng (phân cách bằng dấu phẩy)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: java, c++, python..."
                    value={keywords}
                    onChangeText={setKeywords}
                    autoCapitalize="none"
                  />
                  <Text style={styles.hintText}>Hệ thống sẽ chấm đúng nếu khớp một trong các từ khóa này.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsQuestionModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleAddQuestion}>
                <Text style={styles.modalBtnTextSave}>Thêm câu hỏi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34568B" />
          <Text style={{color: '#34568B', marginTop: 10, fontWeight: 'bold'}}>
            Đang đồng bộ và khởi tạo bài kiểm tra...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34568B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerReplacement: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  typeOptionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
    marginBottom: 6,
  },
  typeOptionBtnSelected: {
    backgroundColor: '#EBF1FA',
    borderColor: '#34568B',
  },
  typeOptionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 'bold',
  },
  typeOptionTextSelected: {
    color: '#34568B',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  switchDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  radiusBlock: {
    marginTop: 12,
  },
  questionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addQButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34568B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addQButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyQuestionsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQuestionsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  qCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  qIndexLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34568B',
    backgroundColor: '#EBF1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qTypeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  qScoreBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D35400',
    backgroundColor: '#FFEAD2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  deleteQBtn: {
    padding: 4,
  },
  qCardContent: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  qDetailBlock: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  qChoiceText: {
    fontSize: 11,
    color: '#64748B',
    marginVertical: 1,
  },
  qChoiceTextCorrect: {
    color: '#117A65',
    fontWeight: 'bold',
  },
  qKeyphraseText: {
    fontSize: 11,
    color: '#64748B',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  submitBtn: {
    backgroundColor: '#34568B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalFormScroll: {
    marginBottom: 16,
  },
  modalQTypeContainer: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  modalQTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  modalQTypeBtnSelected: {
    backgroundColor: '#34568B',
  },
  modalQTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modalQTypeTextSelected: {
    color: '#FFFFFF',
  },
  modalQContentInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  mcqBlock: {
    marginTop: 10,
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceInputPrefix: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34568B',
  },
  choiceTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  correctChoicePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 16,
  },
  correctChoiceBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  correctChoiceBadgeSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  correctChoiceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  correctChoiceTextSelected: {
    color: '#FFFFFF',
  },
  shortAnswerBlock: {
    marginTop: 10,
  },
  hintText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  modalBtnSave: {
    backgroundColor: '#34568B',
  },
  modalBtnTextCancel: {
    color: '#475569',
    fontWeight: 'bold',
  },
  modalBtnTextSave: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
