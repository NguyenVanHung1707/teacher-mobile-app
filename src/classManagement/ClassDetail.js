import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import StudentCard from './StudentCard';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, storeData, formatToView, convertTime} from '../Utility';
import EditClassModal from './forms/EditClassModal';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import ConfirmDeleteModal from './forms/ConfirmDeleteModal';
import AddStudentModal from './forms/AddStudentModal';
import AddFormModal from './forms/AddFormModal';
import ImageModal from './forms/ImageModal';
import ClassDocuments from './ClassDocuments';

export default function ClassDetail() {
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

  return (
    <>
      <View style={styles.classInfoContainer}>
        <Text style={styles.classInfoText}>Mã lớp: {courseCode}</Text>
        <Text style={styles.classInfoText}>Môn học: {subject}</Text>
        <Text style={styles.classInfoText}>Mô tả: {description}</Text>
      </View>
      <View style={styles.activeBar}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => clickCreateForm()}>
            <Text style={styles.addButtonText}>Form điểm danh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => clickImage()}>
            <Text style={styles.addButtonText}>Chụp ảnh điểm danh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addButton,
              {flexDirection: 'row', alignItems: 'center'},
            ]}
            onPress={() => navigation.navigate('ClassDiscussion')}>
            <Icon
              name="comments"
              size={16}
              color="#FFFFFF"
              style={{marginRight: 6}}
            />
            <Text style={styles.addButtonText}>Thảo luận</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => clickUpdateClass()}>
            <Text style={styles.addButtonText}>Sửa lớp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => clickDeleteClass()}>
            <Text style={styles.addButtonText}>Xóa lớp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => clickAddStudent()}>
            <Text style={styles.addButtonText}>Thêm sinh viên</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'students' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('students')}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'students' && styles.activeTabButtonText,
            ]}>
            Danh sách sinh viên
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'assessment' && styles.activeTabButton,
          ]}
          onPress={() => {
            setActiveTab('assessment');
            fetchAssessments();
          }}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'assessment' && styles.activeTabButtonText,
            ]}>
            Bài tập & Bài thi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'document' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('document')}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'document' && styles.activeTabButtonText,
            ]}>
            Tài liệu
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'students' ? (
        <>
          <View style={[styles.container]}>
            <Text style={styles.text1}>Danh sách sinh viên</Text>
          </View>
          <View style={[styles.studentList]}>
            <FlatList
              data={studentList}
              renderItem={({item}) => <StudentCard student={item} />}
              keyExtractor={item => item.id.toString()}
              ItemSeparatorComponent={Separator}
            />
          </View>
        </>
      ) : activeTab === 'assessment' ? (
        <>
          <View style={[styles.container]}>
            <Text style={styles.text1}>Bài tập & Bài thi đã giao</Text>
          </View>
          <View style={[styles.studentList]}>
            {isAssessmentsLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#34568B" />
                <Text style={{marginTop: 10, color: '#7F8C8D'}}>
                  Đang tải bài thi...
                </Text>
              </View>
            ) : assessmentsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="file-text-o" size={48} color="#BDC3C7" />
                <Text style={styles.emptyText}>
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
      ) : (
        <ClassDocuments classId={classId} />
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
          style={styles.fab}
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
});
