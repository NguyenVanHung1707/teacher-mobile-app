import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
  ScrollView,
  useColorScheme,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import {useFocusEffect} from '@react-navigation/native';
import {API_URL} from '@env';
import {getData, getThemeColors} from './Utility';
import {DETECT_FACE_ATTENDANCE_ENDPOINT} from './config';

export default function PhotoAttendanceScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  // UI states
  const [imageUri, setImageUri] = useState(null);
  const [imageName, setImageName] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [lectureNumber, setLectureNumber] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Recognition states
  const [recognizedIds, setRecognizedIds] = useState([]);
  const [hasRecognized, setHasRecognized] = useState(false);

  // Delta review states
  const [showDeltaReview, setShowDeltaReview] = useState(false);
  const [deltaStudents, setDeltaStudents] = useState([]);

  // Fetch list of courses
  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      const response = await axios.get(`${API_URL}/teacher/get-my-courses`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching courses for photo attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchClasses();
    }, []),
  );

  const handleSelectClass = async (course) => {
    setSelectedClass(course);
    setImageUri(null);
    setHasRecognized(false);
    setShowDeltaReview(false);
    
    // Fetch all students of this class
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      const response = await axios.get(
        `${API_URL}/teacher/get-all-student-of-course?courseId=${course.id}`,
        {
          headers: {Authorization: `Bearer ${token}`},
        }
      );
      setStudentList(response.data);
      setSelectedStudents(response.data.map(s => s.id));
    } catch (err) {
      console.error('Error fetching students:', err);
      Alert.alert('Lỗi', 'Không thể lấy danh sách sinh viên lớp này.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapturePhoto = () => {
    launchCamera({mediaType: 'photo'}, response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
      } else {
        const asset = response.assets[0];
        setImageUri(asset.uri);
        setImageName(asset.fileName);
        setImageType(asset.type);
      }
    });
  };

  const handleSelectPhoto = () => {
    launchImageLibrary({mediaType: 'photo'}, response => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        console.log('Gallery Error: ', response.errorMessage);
      } else {
        const asset = response.assets[0];
        setImageUri(asset.uri);
        setImageName(asset.fileName);
        setImageType(asset.type);
      }
    });
  };

  const handleFaceIDRecognition = () => {
    if (!lectureNumber || parseInt(lectureNumber) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập buổi học số hợp lệ!');
      return;
    }
    
    if (selectedStudents.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một sinh viên để nhận dạng!');
      return;
    }

    if (imageUri) {
      setIsProcessing(true);
      const formData = new FormData();
      const imageIdsString = selectedStudents.join(',');
      
      formData.append('image_ids', imageIdsString);
      formData.append('image_file', {
        uri: imageUri,
        name: imageName || 'photo.jpg',
        type: imageType || 'image/jpeg',
      });

      // Call FastAPI
      fetch(DETECT_FACE_ATTENDANCE_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        body: formData,
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Dịch vụ nhận diện FastAPI trả về lỗi!');
          }
          return response.json();
        })
        .then(async (result) => {
          const matchedIds = (result.attendance || [])
            .filter(r => r.isAttendance === true || r.isAttendance === 'true')
            .map(r => r.id);

          setRecognizedIds(matchedIds);
          setHasRecognized(true);

          await fetchAttendanceDelta(matchedIds);
        })
        .catch(error => {
          console.error(error);
          Alert.alert('Lỗi nhận dạng', 'Đã xảy ra lỗi khi gửi ảnh quét tới AI server.');
          setIsProcessing(false);
        });
    }
  };

  const fetchAttendanceDelta = async (ids) => {
    try {
      const token = await getData('accessToken');
      
      const response = await axios.get(
        `${API_URL}/teacher/preview-attendance-face`,
        {
          params: {
            courseId: selectedClass.id,
            lectureNumber: parseInt(lectureNumber),
            recognizedStudentIds: ids.join(','),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const formattedDeltas = response.data.map(item => ({
        ...item,
        isAttendance: item.proposedStatus === 'PRESENT',
      }));

      setDeltaStudents(formattedDeltas);
      setShowDeltaReview(true);
    } catch (err) {
      console.error('Error fetching delta:', err);
      Alert.alert('Cảnh báo', 'Nhận diện hoàn thành nhưng không thể truy xuất dữ liệu chênh lệch chuyên cần.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDeltaAttendance = (studentId) => {
    setDeltaStudents(prev =>
      prev.map(item =>
        item.studentId === studentId
          ? {...item, isAttendance: !item.isAttendance}
          : item
      )
    );
  };

  const handleSaveBulkAttendance = async () => {
    setIsSaving(true);
    try {
      const token = await getData('accessToken');

      const changesPayload = deltaStudents.map(item => ({
        studentId: item.studentId,
        isAttendance: item.isAttendance,
      }));

      const payload = {
        courseId: parseInt(selectedClass.id),
        lectureNumber: parseInt(lectureNumber),
        changes: changesPayload,
      };

      const response = await axios.post(
        `${API_URL}/teacher/confirm-attendance-changes`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        Alert.alert('Thành công', 'Lưu kết quả điểm danh lớp học thành công!');
        setSelectedClass(null);
        setStudentList([]);
        setImageUri(null);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể lưu chuyên cần.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStudentSelection = studentId => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === studentList.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentList.map(s => s.id));
    }
  };

  const renderStudentCheckItem = ({item}) => {
    const isSelected = selectedStudents.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.studentCheckItem, {borderBottomColor: colors.border}, isSelected && {backgroundColor: colors.bgSecondary}]}
        onPress={() => toggleStudentSelection(item.id)}
      >
        <View style={[styles.checkboxCircle, {borderColor: colors.border}, isSelected && {backgroundColor: colors.primary, borderColor: colors.primary}]}>
          {isSelected && <Icon name="check" size={10} color="#FFFFFF" />}
        </View>
        <Text style={[styles.studentCheckName, {color: colors.text}, isSelected && {fontWeight: 'bold'}]}>
          {item.name}
        </Text>
        <Text style={[styles.studentCheckCode, {color: colors.textSecondary}]}>{item.studentCode}</Text>
      </TouchableOpacity>
    );
  };

  const renderDeltaItem = ({item}) => {
    return (
      <View style={[styles.deltaCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
        <View style={styles.deltaInfo}>
          <Text style={[styles.deltaName, {color: colors.text}]}>{item.name}</Text>
          <Text style={[styles.deltaCode, {color: colors.textSecondary}]}>MSSV: {item.studentCode}</Text>
          
          <View style={styles.deltaStatusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>CSDL Hiện tại:</Text>
              <Text style={[styles.statusText, item.currentStatus === 'PRESENT' ? styles.presentText : styles.absentText]}>
                {item.currentStatus === 'PRESENT' ? 'Đi học' : item.currentStatus === 'ABSENT' ? 'Vắng mặt' : 'Chưa có'}
              </Text>
            </View>
            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>Phát hiện AI:</Text>
              <Text style={[styles.statusText, item.proposedStatus === 'PRESENT' ? styles.presentText : styles.absentText]}>
                {item.proposedStatus === 'PRESENT' ? 'Đi học' : 'Vắng mặt'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.deltaToggleCol}>
          <Text style={[styles.finalStatusLabel, {color: colors.textSecondary}]}>Phê duyệt</Text>
          <Switch
            value={item.isAttendance}
            onValueChange={() => handleToggleDeltaAttendance(item.studentId)}
            thumbColor={item.isAttendance ? '#10B981' : '#64748B'}
            trackColor={{false: '#CBD5E1', true: '#A7F3D0'}}
          />
          <Text style={[styles.finalStatusText, {color: item.isAttendance ? '#10B981' : '#EF4444'}]}>
            {item.isAttendance ? 'Có mặt' : 'Vắng'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* Banner */}
      <View style={[styles.headerBanner, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <Text style={[styles.headerSubtitle, {color: colors.primary}]}>ĐIỂM DANH AI</Text>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Ảnh Điểm Danh Tập Thể</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{color: colors.textSecondary, marginTop: 12}}>Đang tải dữ liệu...</Text>
        </View>
      ) : !selectedClass ? (
        // Step 1: Select Class
        <View style={styles.listContainer}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Chọn lớp học phần cần quét điểm danh:</Text>
          <FlatList
            data={classes}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[styles.classSelectItem, {backgroundColor: colors.card, borderColor: colors.border}]}
                onPress={() => handleSelectClass(item)}
              >
                <View style={styles.classIconBg}>
                  <Icon name="university" size={18} color="#FFFFFF" />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={[styles.classItemCode, {color: colors.text}]}>{item.courseCode}</Text>
                  <Text style={[styles.classItemSubject, {color: colors.textSecondary}]}>{item.subject}</Text>
                </View>
                <Icon name="chevron-right" size={14} color={colors.placeholder} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : !imageUri ? (
        // Step 2: Choose Source
        <View style={[styles.chooseOptionBody, {backgroundColor: colors.bg}]}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedClass(null)}>
            <Icon name="arrow-left" size={14} color={colors.textSecondary} />
            <Text style={{marginLeft: 8, color: colors.textSecondary, fontWeight: 'bold'}}>Chọn lớp khác</Text>
          </TouchableOpacity>
          
          <Icon name="camera-retro" size={64} color={colors.placeholder} style={{marginBottom: 16, marginTop: 40}} />
          <Text style={[styles.chooseTextTitle, {color: colors.text}]}>Lấy nguồn ảnh lớp học</Text>
          <Text style={[styles.chooseTextDesc, {color: colors.textSecondary}]}>
            Lớp học đã chọn: {selectedClass.courseCode} ({selectedClass.subject})
          </Text>

          <TouchableOpacity style={[styles.choiceBtn, {backgroundColor: colors.primary}]} onPress={handleCapturePhoto}>
            <Icon name="camera" size={16} color="#FFFFFF" style={{marginRight: 10}} />
            <Text style={styles.choiceBtnText}>Chụp ảnh trực tiếp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnOutline, {borderColor: colors.primary}]} onPress={handleSelectPhoto}>
            <Icon name="photo" size={16} color={colors.primary} style={{marginRight: 10}} />
            <Text style={[styles.choiceBtnTextOutline, {color: colors.primary}]}>Chọn ảnh từ thư viện</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Step 3: Workspace
        <View style={{flex: 1}}>
          {!showDeltaReview ? (
            <ScrollView contentContainerStyle={styles.workspaceScroll}>
              <View style={styles.previewImageContainer}>
                <Image source={{uri: imageUri}} style={styles.previewImage} />
                
                {hasRecognized && (
                  <>
                    {studentList.map((student, idx) => {
                      const isPresent = recognizedIds.includes(student.id);
                      if (!isPresent) return null;
                      const top = 15 + (idx * 18) % 45;
                      const left = 12 + (idx * 22) % 65;
                      return (
                        <View
                          key={student.id}
                          style={[
                            styles.faceBoundingBox,
                            {
                              top: `${top}%`,
                              left: `${left}%`,
                              width: '20%',
                              height: '22%',
                            },
                          ]}
                        >
                          <View style={styles.faceLabelContainer}>
                            <Text style={styles.faceLabelText} numberOfLines={1}>
                              {student.name}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>

              <View style={styles.scanConfigBlock}>
                <View style={styles.row}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={[styles.configLabel, {color: colors.textSecondary}]}>Buổi học số:</Text>
                    <TextInput
                      style={[styles.configInput, {backgroundColor: colors.card, borderColor: colors.border, color: colors.text}]}
                      keyboardType="numeric"
                      value={lectureNumber}
                      onChangeText={setLectureNumber}
                    />
                  </View>
                  <View style={{flex: 2}}>
                    <Text style={[styles.configLabel, {color: colors.textSecondary}]}>Phạm vi quét ({selectedStudents.length} SV)</Text>
                    <TouchableOpacity style={[styles.selectAllBtn, {backgroundColor: colors.card}]} onPress={toggleSelectAll}>
                      <Text style={[styles.selectAllBtnText, {color: colors.primary}]}>
                        {selectedStudents.length === studentList.length ? 'Bỏ chọn hết' : 'Chọn cả lớp'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.configLabel, {color: colors.textSecondary}]}>Danh sách học viên để đối sánh</Text>
                <FlatList
                  data={studentList}
                  renderItem={renderStudentCheckItem}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                />

                <View style={styles.workspaceActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnBack, {backgroundColor: colors.card, borderColor: colors.border}]} onPress={() => setImageUri(null)}>
                    <Icon name="arrow-left" size={14} color={colors.textSecondary} />
                    <Text style={[styles.btnTextBack, {color: colors.textSecondary}]}> Chụp lại</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionBtn, styles.btnScan]} onPress={handleFaceIDRecognition}>
                    <Icon name="camera" size={14} color="#FFFFFF" />
                    <Text style={styles.btnTextScan}> Nhận diện AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            // Delta review list
            <View style={{flex: 1, padding: 16}}>
              <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 12}]}>Rà soát chênh lệch chuyên cần</Text>
              
              {deltaStudents.length === 0 ? (
                <View style={styles.deltaEmpty}>
                  <Icon name="check-circle" size={48} color="#10B981" />
                  <Text style={[styles.deltaEmptyTitle, {color: colors.text}]}>Khớp hoàn toàn!</Text>
                  <Text style={[styles.deltaEmptyDesc, {color: colors.textSecondary}]}>
                    Trạng thái chuyên cần hiện tại của lớp đã khớp hoàn toàn với kết quả quét.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={deltaStudents}
                  renderItem={renderDeltaItem}
                  keyExtractor={item => item.studentId.toString()}
                  showsVerticalScrollIndicator={false}
                />
              )}

              <View style={styles.deltaFooterActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnBack, {backgroundColor: colors.card, borderColor: colors.border}]} onPress={() => setShowDeltaReview(false)}>
                  <Text style={[styles.btnTextBack, {color: colors.textSecondary}]}>Xem lại ảnh</Text>
                </TouchableOpacity>
                
                {deltaStudents.length > 0 && (
                  <TouchableOpacity style={[styles.actionBtn, styles.btnScan, {backgroundColor: colors.primary}]} onPress={handleSaveBulkAttendance}>
                    <Text style={styles.btnTextScan}>Phê duyệt & Lưu</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {(isProcessing || isSaving) && (
        <View style={styles.modalOverlayLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderMsgText, {color: colors.text}]}>
            {isProcessing
              ? 'FastAPI AI đang xử lý trích xuất đặc trưng vector khuôn mặt...'
              : 'Đang phê duyệt và lưu chênh lệch chuyên cần...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  classSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  classIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#34568B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classItemCode: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  classItemSubject: {
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chooseOptionBody: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  chooseTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chooseTextDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  choiceBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  choiceBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  choiceBtnTextOutline: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  workspaceScroll: {
    padding: 16,
  },
  previewImageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.85,
  },
  faceBoundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 4,
  },
  faceLabelContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  faceLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  scanConfigBlock: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  configInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  selectAllBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectAllBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  studentCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentCheckName: {
    flex: 1,
    fontSize: 14,
  },
  studentCheckCode: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  workspaceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnBack: {
    borderWidth: 1,
    marginRight: 12,
  },
  btnTextBack: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnScan: {
    backgroundColor: '#10B981',
  },
  btnTextScan: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deltaCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  deltaInfo: {
    flex: 2,
  },
  deltaName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  deltaCode: {
    fontSize: 12,
    marginTop: 1,
  },
  deltaStatusRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  statusCol: {
    marginRight: 20,
  },
  statusColLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  presentText: {
    color: '#10B981',
  },
  absentText: {
    color: '#EF4444',
  },
  deltaToggleCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  finalStatusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  finalStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  deltaFooterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingBottom: 24,
  },
  modalOverlayLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 24,
  },
  loaderMsgText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  deltaEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  deltaEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  deltaEmptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
});
