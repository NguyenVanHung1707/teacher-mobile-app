import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { API_URL } from '@env';
import axios from 'axios';
import { getData } from '../Utility';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ManagePermissions() {
  const navigation = useNavigation();
  const route = useRoute();
  const { classId } = route.params;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkUpload, setBulkUpload] = useState(false);
  const [bulkDownload, setBulkDownload] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [classId]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const token = await getData('accessToken');
      const response = await axios.get(`${API_URL}/documents/class/${classId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || [];
      setStudents(data);
      
      if (data.length > 0) {
        setBulkUpload(data.every(s => s.canUploadDocuments));
        setBulkDownload(data.every(s => s.canDownloadDocuments));
      }
    } catch (error) {
      console.log('Failed to fetch permissions:', error);
      Alert.alert('Lỗi', 'Không thể tải cấu hình quyền của sinh viên!');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = async (studentId, type, currentValue) => {
    setSaving(true);
    try {
      const token = await getData('accessToken');
      const targetStudent = students.find(s => s.studentId === studentId);
      const nextUpload = type === 'upload' ? !currentValue : targetStudent.canUploadDocuments;
      const nextDownload = type === 'download' ? !currentValue : targetStudent.canDownloadDocuments;

      await axios.post(
        `${API_URL}/documents/class/${classId}/permissions/student/${studentId}`,
        { canUpload: nextUpload, canDownload: nextDownload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStudents(students.map(s => 
        s.studentId === studentId 
          ? { ...s, canUploadDocuments: nextUpload, canDownloadDocuments: nextDownload }
          : s
      ));
    } catch (error) {
      console.log('Update permission error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật quyền cho sinh viên!');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBulk = async (type) => {
    setSaving(true);
    const nextVal = type === 'upload' ? !bulkUpload : !bulkDownload;
    const nextUpload = type === 'upload' ? nextVal : bulkUpload;
    const nextDownload = type === 'download' ? nextVal : bulkDownload;

    try {
      const token = await getData('accessToken');
      await axios.post(
        `${API_URL}/documents/class/${classId}/permissions/bulk`,
        { canUpload: nextUpload, canDownload: nextDownload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (type === 'upload') setBulkUpload(nextUpload);
      else setBulkDownload(nextDownload);

      setStudents(students.map(s => ({
        ...s,
        canUploadDocuments: nextUpload,
        canDownloadDocuments: nextDownload
      })));
    } catch (error) {
      console.log('Bulk update permission error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật quyền đồng loạt!');
    } finally {
      setSaving(false);
    }
  };

  const renderStudentItem = ({ item }) => {
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.studentCode}>MSSV: {item.studentCode}</Text>
        </View>
        
        <View style={styles.toggleRow}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Tải xuống</Text>
            <Switch
              value={item.canDownloadDocuments}
              onValueChange={() => handleToggleStudent(item.studentId, 'download', item.canDownloadDocuments)}
              disabled={saving}
              trackColor={{ false: '#BDC3C7', true: '#AED6F1' }}
              thumbColor={item.canDownloadDocuments ? '#3498DB' : '#F5F5F5'}
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Tải lên</Text>
            <Switch
              value={item.canUploadDocuments}
              onValueChange={() => handleToggleStudent(item.studentId, 'upload', item.canUploadDocuments)}
              disabled={saving}
              trackColor={{ false: '#BDC3C7', true: '#A9DFBF' }}
              thumbColor={item.canUploadDocuments ? '#2ECC71' : '#F5F5F5'}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={18} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu hình quyền tài liệu</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Bulk Config Options */}
      <View style={styles.bulkContainer}>
        <Text style={styles.bulkTitle}>Cấu hình nhanh toàn bộ lớp</Text>
        <View style={styles.bulkRow}>
          <TouchableOpacity 
            style={[styles.bulkBtn, bulkDownload && styles.bulkBtnActive]} 
            onPress={() => handleToggleBulk('download')}
            disabled={saving}
          >
            <Icon name={bulkDownload ? "check-square-o" : "square-o"} size={16} color={bulkDownload ? "#3498DB" : "#7F8C8D"} />
            <Text style={[styles.bulkBtnText, bulkDownload && styles.bulkBtnTextActive]}>Tải xuống</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bulkBtn, bulkUpload && styles.bulkBtnActiveSuccess]} 
            onPress={() => handleToggleBulk('upload')}
            disabled={saving}
          >
            <Icon name={bulkUpload ? "check-square-o" : "square-o"} size={16} color={bulkUpload ? "#2ECC71" : "#7F8C8D"} />
            <Text style={[styles.bulkBtnText, bulkUpload && styles.bulkBtnTextActiveSuccess]}>Tải lên</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#34568B" />
          <Text style={styles.loaderText}>Đang tải cấu hình quyền...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="users" size={48} color="#BDC3C7" />
          <Text style={styles.emptyText}>Chưa có sinh viên nào trong lớp này.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={item => item.studentId.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  bulkContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bulkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  bulkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bulkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 5,
  },
  bulkBtnActive: {
    backgroundColor: '#EBF5FB',
    borderColor: '#AED6F1',
  },
  bulkBtnActiveSuccess: {
    backgroundColor: '#E8F8F5',
    borderColor: '#A3E4D7',
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginLeft: 8,
  },
  bulkBtnTextActive: {
    color: '#2980B9',
  },
  bulkBtnTextActiveSuccess: {
    color: '#27AE60',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loaderText: {
    marginTop: 10,
    color: '#7F8C8D',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 10,
  },
  listContent: {
    padding: 15,
  },
  studentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studentInfo: {
    marginBottom: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  studentCode: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  toggleLabel: {
    fontSize: 13,
    color: '#34495E',
    fontWeight: '500',
    marginRight: 10,
  }
});
