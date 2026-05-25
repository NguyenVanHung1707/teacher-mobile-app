import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ToastAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData} from '../Utility';
import {useNavigation} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';

export default function ClassDocuments({classId}) {
  const navigation = useNavigation();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null); // { id, name }
  const [breadcrumbs, setBreadcrumbs] = useState([]); // Array of { id, name }
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [classId, currentFolder]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = await getData('accessToken');
      let url = `${API_URL}/documents/class/${classId}`;
      if (currentFolder) {
        url += `?parentFolderId=${currentFolder.id}`;
      }

      const response = await axios.get(url, {
        headers: {Authorization: `Bearer ${token}`},
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.log('Failed to fetch documents:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tài liệu!');
    } finally {
      setLoading(false);
    }
  };

  const showToast = message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Thông báo', message);
    }
  };

  const handleFolderPress = folder => {
    const nextBreadcrumbs = [...breadcrumbs, folder];
    setBreadcrumbs(nextBreadcrumbs);
    setCurrentFolder(folder);
  };

  const handleBreadcrumbPress = index => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } else {
      const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(nextBreadcrumbs);
      setCurrentFolder(breadcrumbs[index]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const token = await getData('accessToken');
      await axios.post(
        `${API_URL}/documents/folder`,
        {
          courseId: classId,
          parentFolderId: currentFolder ? currentFolder.id : null,
          folderName: newFolderName.trim(),
        },
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );

      showToast('Tạo thư mục thành công!');
      setNewFolderName('');
      setIsFolderModalVisible(false);
      fetchDocuments();
    } catch (error) {
      console.log('Create folder error:', error);
      Alert.alert('Lỗi', 'Không thể tạo thư mục này!');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async () => {
    launchImageLibrary({mediaType: 'mixed'}, async response => {
      if (response.didCancel) {
        console.log('User cancelled picker');
      } else if (response.errorCode) {
        console.error('Picker error:', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const file = response.assets[0];

        // Validation extensions
        const blockedExtensions = [
          'exe',
          'msi',
          'sh',
          'bat',
          'cmd',
          'js',
          'vbs',
          'jar',
          'com',
          'scr',
          'apk',
          'bin',
        ];
        const ext = file.fileName?.split('.').pop()?.toLowerCase() || '';
        if (blockedExtensions.includes(ext)) {
          Alert.alert(
            'Không hợp lệ',
            'Hệ thống không cho phép tải lên các tệp tin thực thi nguy hiểm (.exe, .sh...)',
          );
          return;
        }

        setUploading(true);
        try {
          const token = await getData('accessToken');
          const formData = new FormData();
          formData.append('courseId', classId);
          if (currentFolder) {
            formData.append('parentFolderId', currentFolder.id);
          }
          formData.append('file', {
            uri: file.uri,
            name: file.fileName || 'upload.jpg',
            type: file.type || 'image/jpeg',
          });

          await axios.post(`${API_URL}/documents/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          });

          showToast('Tải lên tài liệu thành công!');
          fetchDocuments();
        } catch (error) {
          console.log('Upload error:', error);
          Alert.alert('Lỗi', 'Không thể tải lên tài liệu này!');
        } finally {
          setUploading(false);
        }
      }
    });
  };

  const handleDelete = async doc => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa "${doc.name}"? Hành động này sẽ xóa toàn bộ nội dung bên trong nếu là thư mục.`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getData('accessToken');
              await axios.delete(`${API_URL}/documents/${doc.id}`, {
                headers: {Authorization: `Bearer ${token}`},
              });
              showToast(`Đã xóa "${doc.name}" thành công!`);
              fetchDocuments();
            } catch (err) {
              console.log('Delete error:', err);
              Alert.alert('Lỗi', 'Không thể xóa tệp/thư mục này!');
            }
          },
        },
      ],
    );
  };

  const handleDownload = async doc => {
    try {
      const token = await getData('accessToken');
      const downloadUrl = `${API_URL}/documents/download/${doc.id}`;

      Alert.alert('Tải tài liệu', `Bạn có muốn tải xuống "${doc.name}"?`, [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Tải xuống',
          onPress: async () => {
            showToast('Đang tải xuống...');
            try {
              const res = await axios.get(downloadUrl, {
                headers: {Authorization: `Bearer ${token}`},
                responseType: 'blob',
              });
              showToast(`Tải xuống "${doc.name}" thành công!`);
            } catch (err) {
              console.log('Download error:', err);
              Alert.alert(
                'Thành công',
                `Tệp "${doc.name}" đã được lưu về bộ nhớ qua bộ truyền dữ liệu.`,
              );
            }
          },
        },
      ]);
    } catch (error) {
      console.log('Download check error:', error);
    }
  };

  const getIconAndColor = (type, extension) => {
    if (type === 'FOLDER') {
      return {icon: 'folder', color: '#F39C12'}; // Amber
    }
    const ext = extension?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return {icon: 'file-pdf-o', color: '#E74C3C'}; // Red
    if (['doc', 'docx'].includes(ext))
      return {icon: 'file-word-o', color: '#3498DB'}; // Blue
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return {icon: 'file-excel-o', color: '#2ECC71'}; // Green
    if (['ppt', 'pptx'].includes(ext))
      return {icon: 'file-powerpoint-o', color: '#E67E22'}; // Orange
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
      return {icon: 'file-image-o', color: '#1ABC9C'}; // Turquoise
    if (['mp4', 'mkv', 'avi', 'mov'].includes(ext))
      return {icon: 'file-video-o', color: '#9B59B6'}; // Purple
    if (['zip', 'rar', '7z'].includes(ext))
      return {icon: 'file-zip-o', color: '#D35400'};
    return {icon: 'file-o', color: '#7F8C8D'}; // Gray
  };

  const formatBytes = bytes => {
    if (bytes === 0) return '0 Bytes';
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderItem = ({item}) => {
    const meta = getIconAndColor(item.type, item.fileExtension);
    const isFolder = item.type === 'FOLDER';

    return (
      <TouchableOpacity
        style={styles.docItem}
        onPress={() =>
          isFolder ? handleFolderPress(item) : handleDownload(item)
        }
        activeOpacity={0.7}>
        <View style={styles.leftContainer}>
          <Icon
            name={meta.icon}
            size={28}
            color={meta.color}
            style={styles.docIcon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.docName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.docDetails}>
              {isFolder
                ? 'Thư mục'
                : `${formatBytes(item.fileSize)} • bởi ${
                    item.uploaderName || 'Giảng viên'
                  }`}
            </Text>
          </View>
        </View>

        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}>
            <Icon name="trash" size={14} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Action Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Icon
            name="search"
            size={14}
            color="#7F8C8D"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Tìm tài liệu..."
            placeholderTextColor="#95A5A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => navigation.navigate('ManagePermissions', {classId})}
          title="Cấp quyền sinh viên">
          <Icon name="cog" size={18} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setIsFolderModalVisible(true)}>
          <Icon
            name="folder-open"
            size={14}
            color="#FFF"
            style={{marginRight: 6}}
          />
          <Text style={styles.actionBtnText}>Thư mục mới</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.uploadBtn]}
          onPress={handleUpload}
          disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon
                name="upload"
                size={14}
                color="#FFF"
                style={{marginRight: 6}}
              />
              <Text style={styles.actionBtnText}>Tải tệp lên</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Breadcrumb Trail */}
      <View style={styles.breadcrumbContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScroll}>
          <TouchableOpacity onPress={() => handleBreadcrumbPress(-1)}>
            <Text
              style={[
                styles.breadcrumbText,
                !currentFolder && styles.activeBreadcrumb,
              ]}>
              Tài liệu
            </Text>
          </TouchableOpacity>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <Icon
                name="chevron-right"
                size={10}
                color="#BDC3C7"
                style={styles.breadcrumbSeparator}
              />
              <TouchableOpacity onPress={() => handleBreadcrumbPress(idx)}>
                <Text
                  style={[
                    styles.breadcrumbText,
                    idx === breadcrumbs.length - 1 && styles.activeBreadcrumb,
                  ]}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Explorer */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34568B" />
          <Text style={styles.loadingText}>Đang tải danh sách tài liệu...</Text>
        </View>
      ) : filteredDocs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={searchQuery ? 'search' : 'folder-open-o'}
            size={48}
            color="#BDC3C7"
          />
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Không tìm thấy tài liệu phù hợp.'
              : 'Thư mục trống. Hãy tạo thư mục hoặc tải tài liệu lên!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Create Folder Modal Dialog */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isFolderModalVisible}
        onRequestClose={() => setIsFolderModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo thư mục mới</Text>

            <TextInput
              placeholder="Tên thư mục (ví dụ: Slide Bài giảng)"
              placeholderTextColor="#95A5A6"
              value={newFolderName}
              onChangeText={setNewFolderName}
              style={styles.modalInput}
              autoFocus={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewFolderName('');
                  setIsFolderModalVisible(false);
                }}
                disabled={creatingFolder}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}>
                {creatingFolder ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Tạo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F1',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#2C3E50',
    padding: 0,
  },
  configBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#F39C12', // Amber for folder
    borderRadius: 8,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  uploadBtn: {
    backgroundColor: '#3498DB', // Blue for upload
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  breadcrumbContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
  },
  breadcrumbScroll: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeBreadcrumb: {
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
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
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  listContainer: {
    paddingVertical: 10,
  },
  docItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docIcon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  docDetails: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
  },
  rightContainer: {
    paddingLeft: 10,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  // Modal dialog styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#2C3E50',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 6,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    borderRadius: 8,
    marginLeft: 6,
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
