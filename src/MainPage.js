import {View, Text, useColorScheme} from 'react-native';
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {getThemeColors} from './Utility';
import ClassManagement from './classManagement/ClassManagement';
import ClassDetail from './classManagement/ClassDetail';
import {createStackNavigator} from '@react-navigation/stack';
import StudentDetail from './classManagement/StudentDetail';
import ProfileScreen from './ProfileScreen';
import AddFormScreen from './classManagement/AddFormScreen';
import ClassDiscussion from './classManagement/ClassDiscussion';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import the icon library
import HomePage from './HomePage';
import ManagePermissions from './classManagement/ManagePermissions';
import TimetableScreen from './classManagement/TimetableScreen'; // Import TimetableScreen
import GradeSubmissionsListScreen from './classManagement/GradeSubmissionsListScreen';
import GradeAssessmentScreen from './classManagement/GradeAssessmentScreen';
import CreateAssessmentScreen from './classManagement/CreateAssessmentScreen';
import PhotoAttendanceScreen from './PhotoAttendanceScreen'; // Import PhotoAttendanceScreen
import CreateFormSelectClassScreen from './classManagement/CreateFormSelectClassScreen'; // Import CreateFormSelectClassScreen

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeScreen = () => {
  return <HomePage />;
};

const ClassManagementStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClassManagement"
        component={ClassManagement}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetail}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetail}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AddFormScreen"
        component={AddFormScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDiscussion"
        component={ClassDiscussion}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ManagePermissions"
        component={ManagePermissions}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="GradeSubmissionsList"
        component={GradeSubmissionsListScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="GradeAssessment"
        component={GradeAssessmentScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CreateAssessment"
        component={CreateAssessmentScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

const CreateFormStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CreateFormSelectClass"
        component={CreateFormSelectClassScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AddFormScreen"
        component={AddFormScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CreateAssessment"
        component={CreateAssessmentScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default function MainPage() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Bảng thống kê') {
            iconName = 'dashboard';
          } else if (route.name === 'Quản lý lớp học') {
            iconName = 'university';
          } else if (route.name === 'Thời khóa biểu') {
            iconName = 'calendar';
          } else if (route.name === 'Chụp ảnh điểm danh') {
            iconName = 'camera';
          } else if (route.name === 'Tạo Form điểm danh') {
            iconName = 'check-square-o';
          } else if (route.name === 'Thông tin cá nhân') {
            iconName = 'user';
          }

          return <Icon name={iconName} size={focused ? size + 2 : size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 9.5,
          paddingBottom: 6,
        },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 4,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -3},
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        headerStyle: {
          backgroundColor: theme.card,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.05,
          shadowRadius: 3,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      })}>
      <Tab.Screen name="Bảng thống kê" component={HomeScreen} />
      <Tab.Screen name="Quản lý lớp học" component={ClassManagementStack} />
      <Tab.Screen name="Thời khóa biểu" component={TimetableScreen} options={{headerShown: false}} />
      <Tab.Screen name="Chụp ảnh điểm danh" component={PhotoAttendanceScreen} options={{headerShown: false}} />
      <Tab.Screen name="Tạo Form điểm danh" component={CreateFormStack} options={{headerShown: false}} />
      <Tab.Screen name="Thông tin cá nhân" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

