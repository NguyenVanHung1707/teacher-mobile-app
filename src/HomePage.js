import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import axios from 'axios';
import { getData } from './Utility';
import { API_URL } from '@env';

export default function HomePage() {
  const [data, setData] = useState([]);
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth * 2.5; // Điều chỉnh để đảm bảo nhãn cuối cùng không bị cắt
  const [data1, setData1] = useState([]);

  const fetchData = async () => {
    try {
      const token = await getData('accessToken');
      let config = {
        method: 'get',
        url: `${API_URL}/teacher/get-my-class-chart`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const response = await axios.request(config);
      console.log(JSON.stringify(response.data));

      // Kiểm tra dữ liệu từ API và chuyển đổi thành định dạng yêu cầu bởi react-native-gifted-charts
      if (Array.isArray(response.data)) {
        const chartData = response.data.map(item => ({
          label: item.label,
          value: item.value,
          frontColor: '#1cc910', // Tùy chỉnh màu của cột
          topLabelComponent: () => (
            <Text style={{ color: '#000' }}>{item.value}</Text>
          ),
        }));
        setData(chartData);
      } else {
        console.error("API data does not match expected structure");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const fetchData1 = async () => {
    try {
      const token = await getData('accessToken');
      let config = {
        method: 'get',
        url: `${API_URL}/teacher/get-rate-of-my-class-chart`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const response = await axios.request(config);
      console.log(JSON.stringify(response.data));

      // Kiểm tra dữ liệu từ API và chuyển đổi thành định dạng yêu cầu bởi react-native-gifted-charts
      if (Array.isArray(response.data)) {
        const chartData = response.data.map(item => ({
          label: item.label,
          value: item.value * 100, // Chuyển đổi thành phần trăm
          frontColor: '#1cc910', // Tùy chỉnh màu của cột
          topLabelComponent: () => (
            <Text style={{ color: '#000', fontSize: 9 }}>{(item.value * 100).toFixed(1)}%</Text> // Hiển thị phần trăm
          ),
        }));
        console.log(chartData);
        setData1(chartData);
      } else {
        console.error("API data does not match expected structure 1");
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchData();
    fetchData1();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Biểu đồ số lượng học sinh trong lớp</Text>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', paddingRight: 5 }}>
        <View>
          {data && data.length > 0 ? (
            <ScrollView horizontal={true}>
              <BarChart
                data={data}
                height={220}
                barWidth={30}
                spacing={40}
                hideRules={true}
                hideAxesAndRules={false}
                yAxisThickness={1}
                noOfSections={4}
                maxValue={Math.max(...data.map(d => d.value)) + 5} // Điều chỉnh theo dữ liệu của bạn
                showScrollIndicator={false}
                initialSpacing={10}
                finalSpacing={30} // Thêm khoảng trống ở cuối để đảm bảo nhãn cuối cùng hiển thị
                barBorderRadius={4}
                stepValue={2}
                labelWidth={30}
                // Custom styles for the x-axis labels
                xAxisLabelTextStyle={{
                  fontWeight: 'bold', // In đậm
                  color: '#000', // Màu chữ (có thể tùy chỉnh)
                }}

                // Custom styles for the y-axis labels
                yAxisLabelTextStyle={{
                  fontWeight: 'bold', // In đậm
                  color: '#000', // Màu chữ (có thể tùy chỉnh)
                }}
              />
            </ScrollView>
          ) : (
            <Text>Loading...</Text>
          )}
        </View>
      </ScrollView>
      <Text style={styles.header}>Biểu đồ tỉ lệ điểm danh</Text>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', paddingRight: 5 }}>
        <View>
          {data1 && data1.length > 0 ? (
            <ScrollView horizontal={true}>
              <BarChart
                data={data1}
                height={220}
                barWidth={30}
                spacing={40}
                hideRules={true}
                hideAxesAndRules={false}
                yAxisThickness={1}
                noOfSections={5} // Số phần trăm nhỏ nhất là 0%, số lớn nhất là 100%
                maxValue={100} // Giá trị tối đa là 100% cho biểu đồ phần trăm
                showScrollIndicator={false}
                initialSpacing={10}
                finalSpacing={30} // Thêm khoảng trống ở cuối để đảm bảo nhãn cuối cùng hiển thị
                barBorderRadius={4}
                stepValue={20} // Mỗi bước là 20% (0, 20, 40, 60, 80, 100)
                labelWidth={30}
                xAxisLabelTextStyle={{
                  fontWeight: 'bold', // In đậm
                  color: '#000', // Màu chữ (có thể tùy chỉnh)
                }}
                yAxisLabelTextStyle={{
                  fontWeight: 'bold', // In đậm
                  color: '#000', // Màu chữ (có thể tùy chỉnh)
                }}
              />
            </ScrollView>
          ) : (
            <Text>Loading...</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
  },
  header: {
    fontSize: 20, // Kích thước chữ
    fontWeight: 'bold', // Đậm
    color: '#333', // Màu chữ
    textAlign: 'center', // Căn giữa
    marginVertical: 20, // Khoảng cách trên dưới
    textShadowColor: '#aaa', // Màu bóng chữ
    textShadowOffset: { width: 2, height: 2 }, // Vị trí bóng chữ
    textShadowRadius: 4, // Bán kính bóng chữ
  },
});
