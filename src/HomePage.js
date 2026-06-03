import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import {BarChart} from 'react-native-gifted-charts';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import {getData, getThemeColors} from './Utility';
import {API_URL} from '@env';

export default function HomePage() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [data1, setData1] = useState([]);

  const fetchData = async () => {
    try {
      const token = await getData('accessToken');
      let config = {
        method: 'get',
        url: `${API_URL}/teacher/get-my-class-chart`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.request(config);

      if (Array.isArray(response.data)) {
        const chartData = response.data.map(item => ({
          label: item.label,
          value: item.value,
          frontColor: theme.primary || '#3B82F6',
          topLabelComponent: () => (
            <Text style={{color: theme.text, fontSize: 10, fontWeight: '700'}}>{item.value}</Text>
          ),
        }));
        setData(chartData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData1 = async () => {
    try {
      const token = await getData('accessToken');
      let config = {
        method: 'get',
        url: `${API_URL}/teacher/get-rate-of-my-class-chart`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.request(config);

      if (Array.isArray(response.data)) {
        const chartData = response.data.map(item => ({
          label: item.label,
          value: item.value * 100, // Chuyển đổi thành phần trăm
          frontColor: theme.secondary || '#10B981',
          topLabelComponent: () => (
            <Text style={{color: theme.text, fontSize: 9, fontWeight: '700'}}>
              {(item.value * 100).toFixed(1)}%
            </Text>
          ),
        }));
        setData1(chartData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchData1()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const totalClasses = data.length;
  const totalStudents = data.reduce((sum, d) => sum + d.value, 0);
  const avgAttendance = data1.length > 0 
    ? (data1.reduce((sum, d) => sum + d.value, 0) / data1.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.bg}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{color: theme.textSecondary, marginTop: 12, fontWeight: '700'}}>
          Đang tải dữ liệu phân tích...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, {backgroundColor: theme.bg}]} contentContainerStyle={styles.content}>
      {/* Premium Dashboard Header Welcome */}
      <View style={[styles.welcomeBanner, {backgroundColor: theme.primary}]}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.welcomeSub}>HỆ THỐNG GIẢNG DẠY</Text>
            <Text style={styles.welcomeText}>Chào mừng giảng viên!</Text>
            <Text style={styles.welcomeDesc}>Chúc bạn một ngày lên lớp hiệu quả.</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Icon name="user-circle" size={44} color="#FFF" />
          </View>
        </View>
      </View>

      {/* 2x2 live stats KPI cards */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <Icon name="university" size={18} color="#3B82F6" style={{marginBottom: 6}} />
          <Text style={[styles.kpiLabel, {color: theme.textSecondary}]}>Lớp Giảng Dạy</Text>
          <Text style={[styles.kpiVal, {color: theme.text}]}>{totalClasses}</Text>
        </View>
        
        <View style={[styles.kpiCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <Icon name="users" size={18} color="#10B981" style={{marginBottom: 6}} />
          <Text style={[styles.kpiLabel, {color: theme.textSecondary}]}>Tổng Sinh Viên</Text>
          <Text style={[styles.kpiVal, {color: theme.text}]}>{totalStudents}</Text>
        </View>

        <View style={[styles.kpiCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <Icon name="check-circle" size={18} color="#F59E0B" style={{marginBottom: 6}} />
          <Text style={[styles.kpiLabel, {color: theme.textSecondary}]}>Chuyên Cần TB</Text>
          <Text style={[styles.kpiVal, {color: theme.text}]}>{avgAttendance}%</Text>
        </View>

        <View style={[styles.kpiCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <Icon name="file-text" size={18} color="#8A4C7D" style={{marginBottom: 6}} />
          <Text style={[styles.kpiLabel, {color: theme.textSecondary}]}>Đề Thi Đã Giao</Text>
          <Text style={[styles.kpiVal, {color: theme.text}]}>{data1.length}</Text>
        </View>
      </View>

      {/* Chart Block 1: Student Distribution */}
      <View style={[styles.chartBlockCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.chartIconBg}>
            <Icon name="bar-chart" size={14} color={theme.primary} />
          </View>
          <View style={{marginLeft: 10}}>
            <Text style={[styles.chartTitle, {color: theme.text}]}>Sĩ Số Lớp Học</Text>
            <Text style={[styles.chartSubText, {color: theme.textSecondary}]}>Số lượng học viên đăng ký theo từng lớp</Text>
          </View>
        </View>
        <View style={styles.divider} />
        {data && data.length > 0 ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <BarChart
              data={data}
              height={200}
              barWidth={28}
              spacing={35}
              hideRules={true}
              hideAxesAndRules={false}
              yAxisThickness={1}
              noOfSections={4}
              maxValue={Math.max(...data.map(d => d.value), 5) + 5}
              showScrollIndicator={false}
              initialSpacing={15}
              finalSpacing={30}
              barBorderRadius={6}
              stepValue={2}
              labelWidth={30}
              xAxisLabelTextStyle={{
                fontWeight: 'bold',
                color: theme.textSecondary,
                fontSize: 10,
              }}
              yAxisLabelTextStyle={{
                fontWeight: 'bold',
                color: theme.textSecondary,
                fontSize: 10,
              }}
            />
          </ScrollView>
        ) : (
          <Text style={{color: theme.textSecondary, textAlign: 'center', marginVertical: 20}}>Không có dữ liệu</Text>
        )}
      </View>

      {/* Chart Block 2: Attendance Rate */}
      <View style={[styles.chartBlockCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.chartIconBg}>
            <Icon name="pie-chart" size={14} color={theme.secondary} />
          </View>
          <View style={{marginLeft: 10}}>
            <Text style={[styles.chartTitle, {color: theme.text}]}>Tỉ Lệ Điểm Danh</Text>
            <Text style={[styles.chartSubText, {color: theme.textSecondary}]}>Phần trăm đi học chuyên cần theo lớp</Text>
          </View>
        </View>
        <View style={styles.divider} />
        {data1 && data1.length > 0 ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <BarChart
              data={data1}
              height={200}
              barWidth={28}
              spacing={35}
              hideRules={true}
              hideAxesAndRules={false}
              yAxisThickness={1}
              noOfSections={5}
              maxValue={100}
              showScrollIndicator={false}
              initialSpacing={15}
              finalSpacing={30}
              barBorderRadius={6}
              stepValue={20}
              labelWidth={30}
              xAxisLabelTextStyle={{
                fontWeight: 'bold',
                color: theme.textSecondary,
                fontSize: 10,
              }}
              yAxisLabelTextStyle={{
                fontWeight: 'bold',
                color: theme.textSecondary,
                fontSize: 10,
              }}
            />
          </ScrollView>
        ) : (
          <Text style={{color: theme.textSecondary, textAlign: 'center', marginVertical: 20}}>Không có dữ liệu</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBanner: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  welcomeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  welcomeDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4,
  },
  avatarCircle: {
    opacity: 0.9,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  kpiCard: {
    width: '47%',
    margin: '1.5%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  chartBlockCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 3,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chartSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
});
