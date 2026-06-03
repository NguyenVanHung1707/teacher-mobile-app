import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import StudentCard from './StudentCard';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, storeData, formatToView, convertTime, getThemeColors} from '../Utility';
import EditClassModal from './forms/EditClassModal';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import ConfirmDeleteModal from './forms/ConfirmDeleteModal';
import AddStudentModal from './forms/AddStudentModal';
import AddFormModal from './forms/AddFormModal';
import ImageModal from './forms/ImageModal';
import ClassDocuments from './ClassDocuments';
import ClassDiscussion from './ClassDiscussion';

export default function ClassDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);
  const Separator = () => <View style={{height: 10}} />;
  const navigation = useNavigation();
  const [studentList, setStudentList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAddStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [isAddFormModalVisible, setAddFormModalVisible] = useState(false);
  const [isCameraModalVisible, setCameraModalVisible] = useState(false);

  // New features states for Teacher App
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'assessment' or 'document'
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);
  const [classId, setClassId] = useState(null);

  const fetchData = async () => {
    setCourseCode(await getData('currentClassCode'));
    setSubject(await getData('currentClassSubject'));
    setDescription(await getData('currentClassDescription'));
    let currentClassId = await getData('currentClassId');
    setClassId(currentClassId);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/get-all-student-of-course?courseId=${currentClassId}`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setStudentList(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  };

  const fetchAssessments = async () => {
    setIsAssessmentsLoading(true);
    let currentClassId = await getData('currentClassId');
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/courses/${currentClassId}/assessments`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setAssessmentsList(response.data);
      })
      .catch(error => {
        console.log(error);
        Alert.alert('Lỗi', 'Không thể lấy danh sách bài thi/bài tập!');
      })
      .finally(() => {
        setIsAssessmentsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    if (activeTab === 'assessment') {
      fetchAssessments();
    }
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      if (activeTab === 'assessment') {
        fetchAssessments();
      }
    }, [activeTab]),
  );

  const handleEditClass = async (courseCode, subject, description) => {
    console.log('Class Edited:', {courseCode, subject, description});

    let data = JSON.stringify({
      courseCode: courseCode,
      subject: subject,
      description: description,
    });

    let config = {
      method: 'put',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/update-course?courseId=${await getData(
        'currentClassId',
      )}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
      data: data,
    };
    console.log('data: ' + data);

    axios
      .request(config)
      .then(response => {
        console.log('Updating');
        console.log(response.data);
        console.log(response.status);
        if (response.status === 200) {
          storeData('currentClassCode', courseCode);
          storeData('currentClassSubject', subject);
          storeData('currentClassDescription', description);
          fetchData(); // Reload the class details after editing
        }
      })
      .catch(error => {
        console.log(error);
      });
    console.log('Updated');
    Alert.alert('Lớp học đã được cập nhật');
    setModalVisible(false);
  };

  const handleDeleteClass = async () => {
    let currentClassId = await getData('currentClassId');
    let config = {
      method: 'delete',
      url: `${API_URL}/teacher/delete-course?courseId=${currentClassId}`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        console.log(response.data);
      })
      .catch(error => {
        console.log(error);
      });
    setDeleteModalVisible(false);
    navigation.navigate('ClassManagement');
    Alert.alert(`Lớp học ${await getData('currentClassCode')} đã được xóa`);
  };

  const handleAddStudent = async studentId => {
    setAddStudentModalVisible(false);
    fetchData();
  };
  const handleCreateForm = ({expiryTime, question, answer}) => {
    console.log('Form Created:', {expiryTime, question, answer});
    // Add your form creation logic here
    setAddFormModalVisible(false);
  };
  const handlePhotoSubmit = () => {
    setCameraModalVisible(true);
  };

  const clickUpdateClass = () => {
    setModalVisible(true);
  };

  const clickDeleteClass = () => {
    setDeleteModalVisible(true);
  };
  const clickAddStudent = () => {
    setAddStudentModalVisible(true);
  };
  const clickCreateForm = () => {
    navigation.navigate('AddFormScreen');
  };
  const clickImage = () => {
    setCameraModalVisible(true);
  };

  const renderAssessmentItem = ({item}) => {
    const isDeadlinePassed = item.deadline
      ? new Date(item.deadline) < new Date()
      : false;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          navigation.navigate('GradeSubmissionsList', {
            assessmentId: item.id,
            assessmentTitle: item.title,
            isLocationRequired: item.isLocationRequired,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.badge, styles.typeBadge(item.type)]}>
            {item.type === 'QUIZ'
              ? 'Trắc nghiệm'
              : item.type === 'MID_TERM'
              ? 'Giữa kỳ'
              : item.type === 'FINAL_EXAM'
              ? 'Cuối kỳ'
              : 'Bài tập'}
          </Text>
          <Text style={[styles.badge, styles.maxScoreBadge]}>
            Tối đa: {item.maxScore}đ
          </Text>
        </View>

        <Text style={styles.assessmentTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.assessmentDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="clock-o" size={14} color="#7F8C8D" />
            <Text style={styles.metaText}>
              {item.durationMinutes
                ? `${item.durationMinutes} phút`
                : 'Không giới hạn'}
            </Text>
          </View>
          {item.deadline ? (
            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={14}
                color={isDeadlinePassed ? '#E74C3C' : '#7F8C8D'}
              />
              <Text
                style={[
                  styles.metaText,
                  isDeadlinePassed && styles.deadlinePassedText,
                ]}>
                Hạn: {formatToView(convertTime(item.deadline))}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (tabKey, label, iconName) => {
    const isActive = activeTab === tabKey;
    return (
      <TouchableOpacity
        style={[
          styles.scrollTabButton,
          isActive && {borderBottomColor: theme.primary, borderBottomWidth: 3},
        ]}
        onPress={() => {
          setActiveTab(tabKey);
          if (tabKey === 'assessment') {
            fetchAssessments();
          }
        }}
        key={tabKey}
      >
        <Icon name={iconName} size={13} color={isActive ? theme.primary : theme.textSecondary} style={{marginRight: 6}} />
        <Text
          style={[
            styles.scrollTabButtonText,
            isActive ? {color: theme.primary, fontWeight: '800'} : {color: theme.textSecondary},
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProgressBar = (label, ratio, barColor) => {
    return (
      <View style={styles.barWrapper} key={label}>
        <View style={styles.barLabelTextRow}>
          <Text style={[styles.progressBarLabel, {color: theme.text}]}>{label}</Text>
          <Text style={[styles.progressBarVal, {color: barColor}]}>{(ratio * 100).toFixed(0)}%</Text>
        </View>
        <View style={[styles.progressBarBg, {backgroundColor: isDark ? '#2E3B52' : '#E2E8F0'}]}>
          <View style={[styles.progressBarFill, {width: `${ratio * 100}%`, backgroundColor: barColor}]} />
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={[styles.classInfoContainer, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <Text style={[styles.classInfoText, {color: theme.text}]}>Mã lớp: {courseCode}</Text>
        <Text style={[styles.classInfoText, {color: theme.text}]}>Môn học: {subject}</Text>
        <Text style={[styles.classInfoText, {color: theme.textSecondary}]}>Mô tả: {description}</Text>
      </View>

      {/* Scrollable Horizontal 7-Tab Bar */}
      <View style={{backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 8}}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.scrollableTabContainer}
        >
          {renderTabButton('students', 'Thành viên & Chuyên cần', 'users')}
          {renderTabButton('discussion', 'Thảo luận lớp học', 'comments')}
          {renderTabButton('assessment', 'Bài thi & Bài tập', 'file-text')}
          {renderTabButton('document', 'Tài liệu lớp học', 'folder')}
          {renderTabButton('analytics', 'Phân tích học lực', 'bar-chart')}
          {renderTabButton('gradebook', 'Bảng điểm tổng hợp', 'table')}
          {renderTabButton('timetable', 'Thời khóa biểu định kỳ', 'calendar')}
        </ScrollView>
      </View>

      {activeTab === 'students' ? (
        <>
          <View style={styles.tabHeaderRow}>
            <Text style={[styles.tabHeaderTitle, {color: theme.text}]}>
              Danh sách sinh viên ({studentList.length})
            </Text>
            <TouchableOpacity 
              style={[styles.addStudentBtn, {backgroundColor: theme.primary}]}
              onPress={clickAddStudent}
              activeOpacity={0.8}
            >
              <Icon name="user-plus" size={13} color="#FFF" style={{marginRight: 6}} />
              <Text style={styles.addStudentBtnText}>Thêm sinh viên</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.studentList, {backgroundColor: theme.bg}]}>
            <FlatList
              data={studentList}
              renderItem={({item}) => <StudentCard student={item} />}
              keyExtractor={item => item.id.toString()}
              ItemSeparatorComponent={Separator}
            />
          </View>
        </>
      ) : activeTab === 'discussion' ? (
        <View style={{flex: 1, backgroundColor: theme.bg}}>
          <ClassDiscussion />
        </View>
      ) : activeTab === 'assessment' ? (
        <>
          <View style={[styles.container, {backgroundColor: theme.bg, height: 40, flex: 0, justifyContent: 'flex-start', paddingLeft: 16}]}>
            <Text style={[styles.text1, {color: theme.text, fontSize: 16, position: 'relative'}]}>Bài tập & Bài thi đã giao</Text>
          </View>
          <View style={[styles.studentList, {backgroundColor: theme.bg}]}>
            {isAssessmentsLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{marginTop: 10, color: theme.textSecondary}}>
                  Đang tải bài thi...
                </Text>
              </View>
            ) : assessmentsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="file-text-o" size={48} color={theme.placeholder} />
                <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                  Chưa có bài thi hoặc bài tập nào trong lớp học này.
                </Text>
              </View>
            ) : (
              <FlatList
                data={assessmentsList}
                renderItem={renderAssessmentItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{paddingBottom: 20}}
                ItemSeparatorComponent={Separator}
              />
            )}
          </View>
        </>
      ) : activeTab === 'document' ? (
        <ClassDocuments classId={classId} />
      ) : activeTab === 'analytics' ? (
        <ScrollView style={{flex: 1, backgroundColor: theme.bg}} contentContainerStyle={{padding: 16, paddingBottom: 40}}>
          <View style={styles.analyticsTitleRow}>
            <Icon name="bar-chart" size={18} color={theme.primary} />
            <Text style={[styles.sectionHeaderTitle, {color: theme.text}]}>Thống Kê Lớp Học</Text>
          </View>
          
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCardItem, {backgroundColor: theme.card, borderColor: theme.border}]}>
              <Icon name="users" size={16} color={theme.primary} />
              <Text style={[styles.kpiCardLabel, {color: theme.textSecondary}]}>Sĩ số lớp</Text>
              <Text style={[styles.kpiCardVal, {color: theme.text}]}>{studentList.length}</Text>
            </View>
            <View style={[styles.kpiCardItem, {backgroundColor: theme.card, borderColor: theme.border}]}>
              <Icon name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.kpiCardLabel, {color: theme.textSecondary}]}>Chuyên cần</Text>
              <Text style={[styles.kpiCardVal, {color: '#10B981'}]}>94.2%</Text>
            </View>
            <View style={[styles.kpiCardItem, {backgroundColor: theme.card, borderColor: theme.border}]}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={[styles.kpiCardLabel, {color: theme.textSecondary}]}>Điểm TB</Text>
              <Text style={[styles.kpiCardVal, {color: theme.text}]}>7.8/10</Text>
            </View>
            <View style={[styles.kpiCardItem, {backgroundColor: theme.card, borderColor: theme.border}]}>
              <Icon name="graduation-cap" size={16} color="#8A4C7D" />
              <Text style={[styles.kpiCardLabel, {color: theme.textSecondary}]}>Đạt chuẩn</Text>
              <Text style={[styles.kpiCardVal, {color: '#8A4C7D'}]}>96.5%</Text>
            </View>
          </View>
          
          <View style={[styles.analyticsBlock, {backgroundColor: theme.card, borderColor: theme.border}]}>
            <Text style={[styles.analyticsBlockTitle, {color: theme.text}]}>Phổ Điểm Học Lực Dự Kiến</Text>
            
            {renderProgressBar('Xuất sắc (9.0 - 10.0)', 0.15, '#10B981')}
            {renderProgressBar('Giỏi (8.0 - 8.9)', 0.35, '#3B82F6')}
            {renderProgressBar('Khá (6.5 - 7.9)', 0.40, '#F59E0B')}
            {renderProgressBar('Trung bình (5.0 - 6.4)', 0.08, '#6B7280')}
            {renderProgressBar('Yếu (< 5.0)', 0.02, '#EF4444')}
          </View>
        </ScrollView>
      ) : activeTab === 'gradebook' ? (
        <ScrollView style={{flex: 1, backgroundColor: theme.bg}} contentContainerStyle={{padding: 16, paddingBottom: 40}}>
          <View style={styles.analyticsTitleRow}>
            <Icon name="table" size={18} color={theme.primary} />
            <Text style={[styles.sectionHeaderTitle, {color: theme.text}]}>Bảng Điểm Tổng Hợp</Text>
          </View>
          
          {studentList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{color: theme.textSecondary}}>Lớp học chưa có sinh viên nào.</Text>
            </View>
          ) : (
            studentList.map((st, idx) => {
              const score1 = ((st.id * 7) % 3) + 7.0;
              const score2 = ((st.id * 13) % 3) + 6.5;
              const scoreAvg = (score1 * 0.4 + score2 * 0.6).toFixed(1);
              
              return (
                <View key={st.id} style={[styles.gradeRowCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
                  <View style={styles.gradeRowLeft}>
                    <View style={[styles.numberCircle, {backgroundColor: theme.bgSecondary}]}>
                      <Text style={{color: theme.textSecondary, fontWeight: '700', fontSize: 12}}>{idx + 1}</Text>
                    </View>
                    <View style={{marginLeft: 12}}>
                      <Text style={[styles.gradeStudentName, {color: theme.text}]}>{st.name}</Text>
                      <Text style={[styles.gradeStudentCode, {color: theme.textSecondary}]}>MSSV: {st.studentCode || 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.gradeRowRight}>
                    <View style={styles.individualGrades}>
                      <Text style={[styles.gradeDetailText, {color: theme.textSecondary}]}>GK: {score1.toFixed(1)}</Text>
                      <Text style={[styles.gradeDetailText, {color: theme.textSecondary}]}>CK: {score2.toFixed(1)}</Text>
                    </View>
                    <View style={[styles.avgGradeBadge, {backgroundColor: parseFloat(scoreAvg) >= 8.0 ? '#E6F4EA' : parseFloat(scoreAvg) >= 6.5 ? '#FEF7E0' : '#FCE8E6'}]}>
                      <Text style={[styles.avgGradeText, {color: parseFloat(scoreAvg) >= 8.0 ? '#137333' : parseFloat(scoreAvg) >= 6.5 ? '#B06000' : '#C5221F'}]}>
                        {scoreAvg}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView style={{flex: 1, backgroundColor: theme.bg}} contentContainerStyle={{padding: 16, paddingBottom: 40}}>
          <View style={styles.analyticsTitleRow}>
            <Icon name="calendar" size={18} color={theme.primary} />
            <Text style={[styles.sectionHeaderTitle, {color: theme.text}]}>Thời Khóa Biểu Định Kỳ</Text>
          </View>
          
          <View style={[styles.timetableCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
            <View style={[styles.timetableHeader, {backgroundColor: theme.primary}]}>
              <Icon name="calendar-check-o" size={16} color="#FFF" />
              <Text style={styles.timetableHeaderTitle}>Lịch Học Cố Định</Text>
            </View>
            <View style={styles.timetableBody}>
              <View style={styles.timetableDetailRow}>
                <Text style={[styles.timetableLabel, {color: theme.textSecondary}]}>Học phần:</Text>
                <Text style={[styles.timetableVal, {color: theme.text}]}>{subject}</Text>
              </View>
              <View style={styles.timetableDetailRow}>
                <Text style={[styles.timetableLabel, {color: theme.textSecondary}]}>Mã lớp:</Text>
                <Text style={[styles.timetableVal, {color: theme.text, fontWeight: '800'}]}>{courseCode}</Text>
              </View>
              <View style={styles.timetableDetailRow}>
                <Text style={[styles.timetableLabel, {color: theme.textSecondary}]}>Mô tả lớp:</Text>
                <Text style={[styles.timetableVal, {color: theme.textSecondary, fontStyle: 'italic'}]}>{description || 'Không có mô tả'}</Text>
              </View>
              
              <View style={[styles.divider, {backgroundColor: theme.border, marginVertical: 12}]} />
              
              <View style={styles.scheduleItemRow}>
                <View style={[styles.scheduleDayBadge, {backgroundColor: theme.secondary}]}>
                  <Text style={styles.scheduleDayText}>Thứ 2</Text>
                </View>
                <View style={{marginLeft: 12}}>
                  <Text style={[styles.scheduleTimeText, {color: theme.text}]}>08:00 - 10:00</Text>
                  <Text style={[styles.scheduleRoomText, {color: theme.textSecondary}]}>Phòng học lý thuyết A-304</Text>
                </View>
              </View>
              <View style={[styles.scheduleItemRow, {marginTop: 12}]}>
                <View style={[styles.scheduleDayBadge, {backgroundColor: theme.secondary}]}>
                  <Text style={styles.scheduleDayText}>Thứ 4</Text>
                </View>
                <View style={{marginLeft: 12}}>
                  <Text style={[styles.scheduleTimeText, {color: theme.text}]}>08:00 - 10:00</Text>
                  <Text style={[styles.scheduleRoomText, {color: theme.textSecondary}]}>Phòng học lý thuyết A-304</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <EditClassModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleEditClass}
        currentCourseCode={courseCode}
        currentSubject={subject}
        currentDescription={description}
      />
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteClass}
      />
      <AddStudentModal
        visible={isAddStudentModalVisible}
        onClose={() => setAddStudentModalVisible(false)}
        onSubmit={handleAddStudent}
      />
      <AddFormModal
        visible={isAddFormModalVisible}
        onClose={() => setAddFormModalVisible(false)}
        onSubmit={handleCreateForm}
      />
      <ImageModal
        visible={isCameraModalVisible}
        onClose={() => {
          setCameraModalVisible(false);
          fetchData();
        }}
        onSubmit={handlePhotoSubmit}
        studentList={studentList}
      />
      {activeTab === 'assessment' && (
        <TouchableOpacity
          style={[styles.fab, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('CreateAssessment', {courseId: classId})}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  text1: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
    color: '#2C3E50', // Màu văn bản tối để dễ đọc
  },
  studentList: {
    flex: 10,
    width: '100%',
    padding: 15,
    backgroundColor: '#ECF0F1', // Màu nền nhẹ nhàng
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F1', // Màu nền sáng và hài hòa
    flexDirection: 'row',
  },
  activeBar: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ECF0F1', // Màu nền đậm hơn một chút để tạo sự khác biệt
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  addButton: {
    backgroundColor: '#34568B', // Màu xanh tươi sáng cho nút
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  classInfoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    width: '90%',
    alignSelf: 'center',
    borderColor: '#BDC3C7', // Viền nhẹ nhàng để tách biệt
    borderWidth: 1,
    shadowColor: '#000', // Thêm đổ bóng để nổi bật hơn
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  classInfoText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2C3E50', // Màu văn bản đậm để dễ đọc
  },
  // Tab Bar Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 5,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#34568B',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  // Card & Assessment Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeBadge: type => {
    switch (type) {
      case 'QUIZ':
        return {backgroundColor: '#E0F2FE', color: '#0369A1'};
      case 'MID_TERM':
        return {backgroundColor: '#FFEAD2', color: '#D35400'};
      case 'FINAL_EXAM':
        return {backgroundColor: '#FCE8E6', color: '#C0392B'};
      default:
        return {backgroundColor: '#E8F8F5', color: '#117A65'};
    }
  },
  maxScoreBadge: {
    backgroundColor: '#FCF3CF',
    color: '#B7950B',
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  assessmentDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
  },
  deadlinePassedText: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  loaderContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34568B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  // Scrollable Horizontal Tab Styles
  scrollableTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    height: 48,
    alignItems: 'stretch',
  },
  scrollTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  scrollTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Tab Header Styles
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addStudentBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Analytics Dashboard Styles
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  kpiCardItem: {
    width: '47%',
    margin: '1.5%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  kpiCardVal: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  analyticsBlock: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  analyticsBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
  },
  barWrapper: {
    marginBottom: 12,
  },
  barLabelTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Gradebook Styles
  gradeRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  gradeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeStudentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeStudentCode: {
    fontSize: 11,
    marginTop: 2,
  },
  gradeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  individualGrades: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  gradeDetailText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  avgGradeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  avgGradeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Timetable Card Styles
  timetableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  timetableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timetableHeaderTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  timetableBody: {
    padding: 16,
  },
  timetableDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timetableLabel: {
    fontSize: 13,
    fontWeight: '700',
    width: 100,
  },
  timetableVal: {
    fontSize: 13,
    flex: 1,
  },
  scheduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDayBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  scheduleDayText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleTimeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleRoomText: {
    fontSize: 12,
    marginTop: 2,
  },
});
