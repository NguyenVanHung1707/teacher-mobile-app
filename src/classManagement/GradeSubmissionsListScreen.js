import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData, formatToView, convertTime} from '../Utility';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';

export default function GradeSubmissionsListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {assessmentId, assessmentTitle, isLocationRequired} = route.params;

  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'SUBMITTED', 'GRADED', 'IN_PROGRESS'

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      const response = await axios.get(
        `${API_URL}/teacher/assessments/${assessmentId}/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSubmissions(response.data);
      filterAndSearchSubmissions(response.data, activeFilter, searchText);
    } catch (error) {
      console.log('Error fetching submissions:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách bài nộp của sinh viên!');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSubmissions();
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assessmentId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchSubmissions();
    }, [assessmentId])
  );

  const filterAndSearchSubmissions = (data, filter, search) => {
    let result = [...data];

    // Filter by status
    if (filter !== 'ALL') {
      result = result.filter(item => item.status === filter);
    }

    // Search by student name or student ID
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      result = result.filter(
        item =>
          (item.studentName && item.studentName.toLowerCase().includes(searchLower)) ||
          (item.studentId && item.studentId.toLowerCase().includes(searchLower))
      );
    }

    setFilteredSubmissions(result);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterAndSearchSubmissions(submissions, filter, searchText);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    filterAndSearchSubmissions(submissions, activeFilter, text);
  };

  const getStatusLabelAndStyle = (status) => {
    switch (status) {
      case 'GRADED':
        return {
          label: 'Đã chấm điểm',
          bg: '#E8F8F5',
          color: '#117A65',
        };
      case 'SUBMITTED':
        return {
          label: 'Đã nộp bài (Chờ chấm)',
          bg: '#FFF2CC',
          color: '#D35400',
        };
      case 'IN_PROGRESS':
        return {
          label: 'Đang làm bài',
          bg: '#EAECEE',
          color: '#5D6D7E',
        };
      default:
        return {
          label: 'Chưa bắt đầu',
          bg: '#F2F4F4',
          color: '#7F8C8D',
        };
    }
  };

  const renderSubmissionItem = ({item}) => {
    const statusStyle = getStatusLabelAndStyle(item.status);
    
    // GPS check badge
    let locationBadge = null;
    if (isLocationRequired && item.status !== 'IN_PROGRESS' && item.status !== 'NOT_STARTED') {
      if (item.isValidLocation) {
        locationBadge = (
          <View style={[styles.badge, styles.locationValid]}>
            <Icon name="check-circle" size={10} color="#155724" />
            <Text style={styles.locationValidText}> GPS hợp lệ</Text>
          </View>
        );
      } else {
        locationBadge = (
          <View style={[styles.badge, styles.locationInvalid]}>
            <Icon name="exclamation-circle" size={10} color="#721C24" />
            <Text style={styles.locationInvalidText}>
              {item.mockLocationDetected ? ' Fake GPS!' : ' Sai vị trí'}
            </Text>
          </View>
        );
      }
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (item.status === 'IN_PROGRESS' || item.status === 'NOT_STARTED') {
            Alert.alert(
              'Thông báo',
              'Sinh viên chưa nộp bài thi này. Không thể chấm điểm lúc này!'
            );
            return;
          }
          navigation.navigate('GradeAssessment', {
            submissionId: item.id,
            studentName: item.studentName,
            assessmentTitle: assessmentTitle,
            assessmentId: assessmentId,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.studentName}>{item.studentName || 'Sinh viên'}</Text>
            <Text style={styles.studentId}>MSSV: {item.studentId}</Text>
          </View>
          {item.status === 'GRADED' && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{item.finalScore}đ</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.metaColumn}>
            <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
              <Text style={[styles.statusText, {color: statusStyle.color}]}>
                {statusStyle.label}
              </Text>
            </View>
            {item.submittedAt && (
              <Text style={styles.timeText}>
                Nộp lúc: {formatToView(convertTime(item.submittedAt))}
              </Text>
            )}
          </View>
          {locationBadge}
        </View>
      </TouchableOpacity>
    );
  };

  const Separator = () => <View style={{height: 12}} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={18} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Danh sách bài nộp
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {assessmentTitle}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc mã sinh viên..."
          value={searchText}
          onChangeText={handleSearchChange}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          {key: 'ALL', label: 'Tất cả'},
          {key: 'SUBMITTED', label: 'Đã nộp'},
          {key: 'GRADED', label: 'Đã chấm'},
          {key: 'IN_PROGRESS', label: 'Đang làm'},
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeFilter === tab.key && styles.activeTabButton,
            ]}
            onPress={() => handleFilterChange(tab.key)}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeFilter === tab.key && styles.activeTabButtonText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submission List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#34568B" />
          <Text style={styles.loadingText}>Đang tải danh sách bài nộp...</Text>
        </View>
      ) : filteredSubmissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="file-text-o" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            Không tìm thấy bài nộp nào phù hợp.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubmissions}
          renderItem={renderSubmissionItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={Separator}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#34568B']}
            />
          }
        />
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1E293B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#34568B',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
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
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  studentId: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  scoreContainer: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A3E4D7',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#117A65',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaColumn: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  locationValid: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
  },
  locationValidText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#155724',
  },
  locationInvalid: {
    backgroundColor: '#F8D7DA',
    borderColor: '#F5C6CB',
  },
  locationInvalidText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#721C24',
  },
});
