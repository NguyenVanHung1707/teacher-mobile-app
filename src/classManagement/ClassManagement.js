import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { API_URL } from '@env';
import ClassCard from './ClassCard';
import AddClassModal from './forms/AddClassModal';
import { getData } from '../Utility';
import { useFocusEffect } from '@react-navigation/native';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/get-my-courses`,
      headers: {
        'Authorization': 'Bearer ' + await getData('accessToken')
      }
    };
    axios.request(config)
      .then((response) => {
        setClasses(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const addCourse = () => {
    setModalVisible(true);
  };

  const handleAddClass = async (courseCode, subject, description) => {
    console.log("aloooooo")
    let data = JSON.stringify({
      "courseCode": courseCode,
      "subject": subject,
      "description": description
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_URL}/teacher/create-course`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + await getData('accessToken')
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
        console.log(response.status);
        fetchData(); // Reload the class list after adding a new class
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <>
      <View style={styles.activeBar}>
        <TouchableOpacity style={styles.addButton} onPress={addCourse}>
          <Text style={styles.addButtonText}>Thêm lớp</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Text style={styles.text1}>Các lớp của bạn</Text>
      </View>
      <View style={styles.classList}>
        <FlatList
          data={classes}
          renderItem={({ item }) => <ClassCard classInfo={item} />}
          keyExtractor={(item) => item.id.toString()}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>
      <AddClassModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddClass}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#ECF0F1',
  },
  text1: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute'
  },
  classList: {
    flex: 10,
    width: "100%",
    padding: 15
  },
  activeBar: {
    backgroundColor: '#ECF0F1',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#34568B',
    padding: 10,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
