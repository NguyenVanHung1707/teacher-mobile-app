import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import {API_URL} from '@env';
import {getData} from '../../Utility';
import {DETECT_FACE_ATTENDANCE_ENDPOINT} from '../../config';

const ImageModal = ({visible, onClose, studentList}) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageName, setImageName] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  // Recognition states
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedIds, setRecognizedIds] = useState([]);
  const [hasRecognized, setHasRecognized] = useState(false);

  // Delta Review states
  const [showDeltaReview, setShowDeltaReview] = useState(false);
  const [deltaStudents, setDeltaStudents] = useState([]);
  const [lectureNumber, setLectureNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setImageName(null);
      setImageType(null);
      setSelectedStudents(studentList.map(s => s.id)); // Pre-select all students by default for recognition scope
      setRecognizedIds([]);
      setHasRecognized(false);
      setShowDeltaReview(false);
      setDeltaStudents([]);
      setLectureNumber('1');
    }
  }, [visible, studentList]);

  const handleCapturePhoto = () => {
    launchCamera({mediaType: 'photo'}, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
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
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
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
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một sinh viên trong danh sách quét!');
      return;
    }

    if (imageUri) {
      setIsProcessing(true);
      const formData = new FormData();
      const imageIdsString = selectedStudents.join(',');
      
      formData.append('image_ids', imageIdsString);
      formData.append('image_file', {
        uri: imageUri,
        name: imageName,
        type: imageType,
      });

      // Send to FastAPI face recognition service
      fetch(DETECT_FACE_ATTENDANCE_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        body: formData,
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Không thể kết nối dịch vụ nhận diện khuôn mặt FastAPI!');
          }
          return response.json();
        })
        .then(async (result) => {
          console.log('FastAPI Recognition result:', result);
          
          // Filter recognized student IDs (isAttendance === true or equivalent from Python response)
          const matchedIds = result
            .filter(r => r.isAttendance === true || r.isAttendance === 'true')
            .map(r => r.id);

          setRecognizedIds(matchedIds);
          setHasRecognized(true);

          // Call Spring Boot preview-attendance-face to get delta reviews
          await fetchAttendanceDelta(matchedIds);
        })
        .catch(error => {
          console.error(error);
          Alert.alert('Lỗi nhận dạng', error.message || 'Đã xảy ra lỗi khi gửi ảnh quét tới AI server.');
          setIsProcessing(false);
        });
    }
  };

  const fetchAttendanceDelta = async (ids) => {
    try {
      const token = await getData('accessToken');
      const classId = await getData('currentClassId');
      
      // Call preview-attendance-face endpoint
      const response = await axios.get(
        `${API_URL}/teacher/preview-attendance-face`,
        {
          params: {
            courseId: classId,
            lectureNumber: parseInt(lectureNumber),
            recognizedStudentIds: ids.join(','),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Attendance delta preview:', response.data);
      
      // Default manual review toggles to matching proposal status
      const formattedDeltas = response.data.map(item => ({
        ...item,
        isAttendance: item.proposedStatus === 'PRESENT',
      }));

      setDeltaStudents(formattedDeltas);
      setShowDeltaReview(true);
    } catch (err) {
      console.log('Error fetching delta review:', err);
      Alert.alert('Cảnh báo', 'Nhận diện hoàn thành nhưng không thể truy xuất dữ liệu đối sánh chuyên cần từ CSDL.');
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
      const classId = await getData('currentClassId');

      const changesPayload = deltaStudents.map(item => ({
        studentId: item.studentId,
        isAttendance: item.isAttendance,
      }));

      const payload = {
        courseId: parseInt(classId),
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
        Alert.alert('Thành công', 'Lưu kết quả điểm danh chuyên cần thành công!');
        onClose();
      }
    } catch (err) {
      console.log('Error saving bulk attendance:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu chuyên cần.');
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
        style={[styles.studentCheckItem, isSelected && styles.studentCheckItemSelected]}
        onPress={() => toggleStudentSelection(item.id)}
      >
        <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleChecked]}>
          {isSelected && <Icon name="check" size={10} color="#FFFFFF" />}
        </View>
        <Text style={[styles.studentCheckName, isSelected && styles.studentCheckNameActive]}>
          {item.name}
        </Text>
        <Text style={styles.studentCheckCode}>{item.studentCode}</Text>
      </TouchableOpacity>
    );
  };

  const renderDeltaItem = ({item}) => {
    return (
      <View style={styles.deltaCard}>
        <View style={styles.deltaInfo}>
          <Text style={styles.deltaName}>{item.name}</Text>
          <Text style={styles.deltaCode}>MSSV: {item.studentCode}</Text>
          
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
          <Text style={styles.finalStatusLabel}>Phê duyệt</Text>
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBgContainer}>
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Điểm danh nhận diện khuôn mặt</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
              <Icon name="times" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <View style={styles.contentWorkspace}>
              {!showDeltaReview ? (
                // Step 2: Configure scan & view overlay
                <ScrollView style={{flex: 1}} contentContainerStyle={styles.imagePreviewWorkspace}>
                  
                  {/* Bounding Box Image Preview */}
                  <View style={styles.previewImageContainer}>
                    <Image source={{uri: imageUri}} style={styles.previewImage} />
                    
                    {/* Bounding Box Mock Overlay matching web aesthetics */}
                    {hasRecognized && (
                      <>
                        {studentList.map((student, idx) => {
                          const isPresent = recognizedIds.includes(student.id);
                          if (!isPresent) return null;
                          // Deterministic positioning based on idx matching web formulas
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

                  {/* Settings section */}
                  <View style={styles.scanConfigBlock}>
                    <View style={styles.row}>
                      <View style={{flex: 1, marginRight: 10}}>
                        <Text style={styles.configLabel}>Buổi học số:</Text>
                        <TextInput
                          style={styles.configInput}
                          keyboardType="numeric"
                          value={lectureNumber}
                          onChangeText={setLectureNumber}
                          placeholder="1"
                        />
                      </View>
                      <View style={{flex: 2}}>
                        <Text style={styles.configLabel}>Phạm vi quét ({selectedStudents.length} học viên)</Text>
                        <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                          <Text style={styles.selectAllBtnText}>
                            {selectedStudents.length === studentList.length ? 'Bỏ chọn hết' : 'Chọn cả lớp'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Scope list */}
                    <Text style={styles.configLabel}>Danh sách học viên để đối sánh FaceID</Text>
                    <FlatList
                      data={studentList}
                      renderItem={renderStudentCheckItem}
                      keyExtractor={item => item.id.toString()}
                      style={styles.checkList}
                      scrollEnabled={false}
                    />

                    {/* Action buttons */}
                    <View style={styles.workspaceActions}>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnBack]} onPress={() => setImageUri(null)}>
                        <Icon name="arrow-left" size={14} color="#64748B" />
                        <Text style={styles.btnTextBack}> Chụp lại</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={[styles.actionBtn, styles.btnScan]} onPress={handleFaceIDRecognition}>
                        <Icon name="camera" size={14} color="#FFFFFF" />
                        <Text style={styles.btnTextScan}> Nhận diện AI</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              ) : (
                // Step 3: Delta Review Panel
                <View style={{flex: 1}}>
                  <View style={styles.deltaHeaderPanel}>
                    <Icon name="users" size={24} color="#34568B" />
                    <View style={styles.deltaHeaderTextWrapper}>
                      <Text style={styles.deltaHeaderTitle}>Rà soát chênh lệch chuyên cần</Text>
                      <Text style={styles.deltaHeaderSubtitle}>
                        Bảng kê các điểm khác biệt giữa nhận diện AI và cơ sở dữ liệu hiện hành.
                      </Text>
                    </View>
                  </View>

                  {deltaStudents.length === 0 ? (
                    <View style={styles.deltaEmpty}>
                      <Icon name="check-circle" size={48} color="#10B981" />
                      <Text style={styles.deltaEmptyTitle}>Khớp hoàn toàn!</Text>
                      <Text style={styles.deltaEmptyDesc}>
                        Trạng thái chuyên cần hiện tại của lớp đã khớp hoàn toàn với kết quả quét. Không cần cập nhật.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={deltaStudents}
                      renderItem={renderDeltaItem}
                      keyExtractor={item => item.studentId.toString()}
                      contentContainerStyle={styles.deltaList}
                    />
                  )}

                  <View style={styles.deltaFooterActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnBack]} onPress={() => setShowDeltaReview(false)}>
                      <Text style={styles.btnTextBack}>Xem lại ảnh</Text>
                    </TouchableOpacity>
                    
                    {deltaStudents.length > 0 && (
                      <TouchableOpacity style={[styles.actionBtn, styles.btnScan]} onPress={handleSaveBulkAttendance}>
                        <Text style={styles.btnTextScan}>Phê duyệt & Lưu</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Step 1: Capture or Upload Select
            <View style={styles.chooseOptionBody}>
              <Icon name="camera-retro" size={56} color="#CBD5E1" style={{marginBottom: 16}} />
              <Text style={styles.chooseTextTitle}>Lấy nguồn ảnh lớp học</Text>
              <Text style={styles.chooseTextDesc}>
                Hãy chụp trực tiếp bằng camera hoặc tải ảnh lớp học tập thể lên để bắt đầu quét nhận dạng sinh viên có mặt bằng FaceNet.
              </Text>

              <TouchableOpacity style={styles.choiceBtn} onPress={handleCapturePhoto}>
                <Icon name="camera" size={16} color="#FFFFFF" style={{marginRight: 10}} />
                <Text style={styles.choiceBtnText}>Chụp ảnh trực tiếp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.choiceBtn, styles.choiceBtnOutline]} onPress={handleSelectPhoto}>
                <Icon name="photo" size={16} color="#34568B" style={{marginRight: 10}} />
                <Text style={styles.choiceBtnTextOutline}>Chọn ảnh từ thư viện</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Overlaid general loaders */}
          {(isProcessing || isSaving) && (
            <View style={styles.modalOverlayLoader}>
              <ActivityIndicator size="large" color="#34568B" />
              <Text style={styles.loaderMsgText}>
                {isProcessing
                  ? 'FastAPI AI đang xử lý trích xuất đặc trưng vector khuôn mặt...'
                  : 'Đang phê duyệt và lưu chênh lệch chuyên cần...'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBgContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBody: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeHeaderBtn: {
    padding: 6,
  },
  chooseOptionBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  chooseTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  chooseTextDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34568B',
    width: '85%',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#34568B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  choiceBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  choiceBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#34568B',
  },
  choiceBtnTextOutline: {
    color: '#34568B',
    fontWeight: 'bold',
    fontSize: 15,
  },
  contentWorkspace: {
    flex: 1,
  },
  imagePreviewWorkspace: {
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
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.8,
    shadowRadius: 2,
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
  configLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
  },
  selectAllBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  checkList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 180,
  },
  studentCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  studentCheckItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxCircleChecked: {
    backgroundColor: '#34568B',
    borderColor: '#34568B',
  },
  studentCheckName: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  studentCheckNameActive: {
    color: '#1E293B',
    fontWeight: 'bold',
  },
  studentCheckCode: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
  },
  btnTextBack: {
    color: '#475569',
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
  deltaHeaderPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EBF1FA',
    borderBottomWidth: 1,
    borderBottomColor: '#D3E2F4',
  },
  deltaHeaderTextWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  deltaHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34568B',
  },
  deltaHeaderSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  deltaList: {
    padding: 16,
  },
  deltaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  deltaInfo: {
    flex: 2,
  },
  deltaName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  deltaCode: {
    fontSize: 12,
    color: '#64748B',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 10,
  },
  finalStatusLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  finalStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  deltaEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  deltaEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 12,
  },
  deltaEmptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  deltaFooterActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalOverlayLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 32,
  },
  loaderMsgText: {
    marginTop: 14,
    color: '#34568B',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ImageModal;
