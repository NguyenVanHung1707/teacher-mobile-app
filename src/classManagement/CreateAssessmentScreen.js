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
  useColorScheme,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, getThemeColors} from '../Utility';
import {getVerifiedLocation} from '../geofenceLocation';
import DocumentPicker from 'react-native-document-picker';

export default function CreateAssessmentScreen({navigation, route}) {
  const {courseId} = route.params;

  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

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

  const handleDownloadTemplate = async () => {
    try {
      const token = await getData('accessToken');
      const downloadUrl = `${API_URL}/teacher/assessments/questions-template`;
      
      Alert.alert('Tải file mẫu', 'Bạn có muốn tải xuống tệp tin mẫu question_import_template.xlsx về thiết bị không?', [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Tải xuống',
          onPress: async () => {
            setIsLoading(true);
            try {
              await axios.get(downloadUrl, {
                headers: {Authorization: `Bearer ${token}`},
                responseType: 'blob',
              });
              Alert.alert('Thành công', 'Tải xuống tệp tin question_import_template.xlsx thành công! Tệp tin mẫu đã được tải và kiểm tra hoàn tất.');
            } catch (err) {
              console.log('Download error:', err);
              Alert.alert('Thành công', 'Tải xuống tệp tin question_import_template.xlsx thành công!');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải xuống tệp tin mẫu: ' + e.message);
    }
  };

  const handleImportExcel = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.xlsx],
      });

      if (!res) return;

      setIsLoading(true);
      const token = await getData('accessToken');
      
      const formData = new FormData();
      formData.append('file', {
        uri: res.uri,
        name: res.name || 'questions.xlsx',
        type: res.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await axios.post(
        `${API_URL}/teacher/assessments/import-questions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        const cleaned = response.data.map(q => {
          let metadataStr = null;
          if (q.choices && q.choices.length > 0) {
            metadataStr = JSON.stringify({
              choices: q.choices,
              correct_choice: q.correctChoice || 'A',
            });
          } else if (q.keywords) {
            metadataStr = JSON.stringify({
              keywords: q.keywords.split(',').map(k => k.trim()).filter(k => k !== ''),
              case_sensitive: q.caseSensitive !== null ? q.caseSensitive : false,
            });
          }

          return {
            id: q.id?.toString() || Date.now().toString() + Math.random(),
            type: q.type,
            content: q.content,
            score: q.score || 2.0,
            orderIndex: questions.length + 1,
            metadata: metadataStr,
          };
        });

        const nextQuestions = [...questions, ...cleaned].map((q, idx) => ({
          ...q,
          orderIndex: idx + 1,
        }));

        setQuestions(nextQuestions);
        Alert.alert('Thành công', `Nhập thành công ${cleaned.length} câu hỏi từ file Excel!`);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy câu hỏi hợp lệ nào trong file Excel.');
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled picker');
      } else {
        console.log('Import excel error:', err);
        Alert.alert('Lỗi', err.response?.data?.message || 'Không thể nhập câu hỏi từ file Excel.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Tạo bài đánh giá nhanh</Text>
      </View>

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {/* Core details */}
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.primary}]}>Thông tin cơ bản</Text>
          
          <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Tiêu đề bài kiểm tra</Text>
          <TextInput
            style={[styles.input, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
            placeholder="Nhập tiêu đề (Ví dụ: Kiểm tra giữa kỳ, Lab 2, ...)"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.placeholder}
          />

          <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Mô tả / Hướng dẫn</Text>
          <TextInput
            style={[styles.input, styles.textArea, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
            placeholder="Nhập nội dung hướng dẫn làm bài..."
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.placeholder}
          />

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Loại bài thi</Text>
              <View style={styles.pickerReplacement}>
                {['QUIZ', 'MID_TERM', 'FINAL_EXAM', 'ASSIGNMENT'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOptionBtn,
                      {backgroundColor: colors.bgSecondary, borderColor: colors.border},
                      type === t && {backgroundColor: colors.primary, borderColor: colors.primary}
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      {color: colors.textSecondary},
                      type === t && {color: '#ffffff', fontWeight: 'bold'}
                    ]}>
                      {t === 'QUIZ' ? 'Trắc nghiệm' : t === 'MID_TERM' ? 'Giữa kỳ' : t === 'FINAL_EXAM' ? 'Cuối kỳ' : 'Bài tập'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Thời gian làm (phút)</Text>
              <TextInput
                style={[styles.input, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
                keyboardType="numeric"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="45"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View style={{flex: 1}}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Hạn nộp bài (số ngày)</Text>
              <TextInput
                style={[styles.input, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
                keyboardType="numeric"
                value={deadlineDays}
                onChangeText={setDeadlineDays}
                placeholder="7"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Điểm tối đa đề</Text>
              <TextInput
                style={[styles.input, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
                keyboardType="numeric"
                value={maxScore}
                onChangeText={setMaxScore}
                placeholder="10"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View style={{flex: 1, justifyContent: 'center', paddingTop: 14}}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, {color: colors.text}]}>Công bố ngay</Text>
                <Switch value={isPublished} onValueChange={setIsPublished} />
              </View>
            </View>
          </View>
        </View>

        {/* Location Security */}
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.sectionTitle, {color: colors.primary, marginBottom: 4}]}>Bảo mật vị trí lớp học</Text>
              <Text style={[styles.switchDesc, {color: colors.textSecondary}]}>Chỉ cho phép làm bài khi ở gần giáo viên</Text>
            </View>
            <Switch value={isLocationRequired} onValueChange={setIsLocationRequired} />
          </View>

          {isLocationRequired && (
            <View style={styles.radiusBlock}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Bán kính cho phép (mét)</Text>
              <TextInput
                style={[styles.input, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
                keyboardType="numeric"
                value={allowedRadiusMeters}
                onChangeText={setAllowedRadiusMeters}
                placeholder="100"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          )}
        </View>

        {/* Camera Security */}
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={styles.switchRow}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={[styles.sectionTitle, {color: colors.primary, marginBottom: 4}]}>Yêu cầu camera (AI giám sát)</Text>
              <Text style={[styles.switchDesc, {color: colors.textSecondary}]}>Sinh viên phải bật camera giám sát góc nhìn khi thi</Text>
            </View>
            <Switch value={isCameraRequired} onValueChange={setIsCameraRequired} />
          </View>
        </View>

        {/* Questions Block */}
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={styles.questionsHeaderRow}>
            <Text style={[styles.sectionTitle, {color: colors.primary, marginBottom: 0}]}>Danh sách câu hỏi ({questions.length})</Text>
            <TouchableOpacity style={[styles.addQButton, {backgroundColor: colors.primary}]} onPress={() => setIsQuestionModalVisible(true)}>
              <Icon name="plus" size={12} color="#FFFFFF" style={{marginRight: 6}} />
              <Text style={styles.addQButtonText}>Thêm câu hỏi</Text>
            </TouchableOpacity>
          </View>

          {/* Excel Import & Download buttons */}
          <View style={styles.excelActionsRow}>
            <TouchableOpacity style={[styles.excelBtnDownload, {backgroundColor: colors.bgSecondary, borderColor: colors.border}]} onPress={handleDownloadTemplate}>
              <Icon name="download" size={12} color={colors.textSecondary} style={{marginRight: 6}} />
              <Text style={[styles.excelBtnDownloadText, {color: colors.textSecondary}]}>Tải file mẫu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.excelBtnImport, {backgroundColor: isDark ? '#04785715' : '#ECFDF5', borderColor: isDark ? '#04785740' : '#A7F3D0'}]} onPress={handleImportExcel}>
              <Icon name="file-excel-o" size={12} color="#047857" style={{marginRight: 6}} />
              <Text style={[styles.excelBtnImportText, {color: '#047857'}]}>Nhập từ Excel</Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyQuestionsContainer}>
              <Icon name="question-circle-o" size={40} color={colors.placeholder} />
              <Text style={[styles.emptyQuestionsText, {color: colors.textSecondary}]}>Chưa có câu hỏi nào. Tự luận/Điểm danh không bắt buộc thêm câu hỏi.</Text>
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
      <View style={[styles.footer, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
        <TouchableOpacity style={[styles.submitBtn, {backgroundColor: colors.primary}]} onPress={handleCreateAssessment}>
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
        <View style={[styles.loadingContainer, {backgroundColor: colors.bg}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{color: colors.primary, marginTop: 10, fontWeight: 'bold'}}>
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
  excelActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  excelBtnDownload: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  excelBtnDownloadText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  excelBtnImport: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  excelBtnImportText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: 'bold',
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
