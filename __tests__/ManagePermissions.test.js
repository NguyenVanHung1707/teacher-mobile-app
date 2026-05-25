import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';
import ManagePermissions from '../src/classManagement/ManagePermissions';
import axios from 'axios';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {classId: 456},
    }),
  };
});

describe('ManagePermissions Screen (Teacher Dashboard)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await require('@react-native-async-storage/async-storage').setItem(
      'accessToken',
      'fake-token',
    );
  });

  const mockStudents = [
    {
      studentId: 1001,
      studentName: 'Lê Văn C',
      studentCode: 'SV001',
      canUploadDocuments: false,
      canDownloadDocuments: true,
    },
    {
      studentId: 1002,
      studentName: 'Trần Thị D',
      studentCode: 'SV002',
      canUploadDocuments: true,
      canDownloadDocuments: false,
    },
  ];

  it('renders loading state first and empty message when no students', async () => {
    axios.get.mockResolvedValueOnce({data: []});

    const {getByText} = render(<ManagePermissions />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Chưa có sinh viên nào trong lớp này.')).toBeTruthy();
  });

  it('fetches student permissions list and renders student detail cards', async () => {
    axios.get.mockResolvedValueOnce({data: mockStudents});

    const {getByText} = render(<ManagePermissions />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/documents/class/456/permissions'),
      expect.any(Object),
    );

    // Verify student info rendered
    expect(getByText('Lê Văn C')).toBeTruthy();
    expect(getByText('MSSV: SV001')).toBeTruthy();
    expect(getByText('Trần Thị D')).toBeTruthy();
    expect(getByText('MSSV: SV002')).toBeTruthy();
  });

  it('sends specific student toggle API call when switch state changes', async () => {
    axios.get.mockResolvedValueOnce({data: mockStudents});
    axios.post.mockResolvedValueOnce({status: 200, data: {}}); // success mock

    const {getAllByRole} = render(<ManagePermissions />);

    await act(async () => {
      await Promise.resolve();
    });

    // Find switches. In react-native, Switch component behaves as a button or has role='switch'
    const switches = getAllByRole('switch');
    // Student 1 (Lê Văn C): canDownload = true (switches[0]), canUpload = false (switches[1])

    // Let's toggle upload for Lê Văn C (switches[1] from false to true)
    await act(async () => {
      fireEvent(switches[1], 'onValueChange', true);
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/documents/class/456/permissions/student/1001'),
      {canUpload: true, canDownload: true}, // nextUpload is true, nextDownload is unchanged (true)
      expect.any(Object),
    );
  });

  it('sends bulk permissions toggle API call when bulk buttons are clicked', async () => {
    axios.get.mockResolvedValueOnce({data: mockStudents});
    axios.post.mockResolvedValueOnce({status: 200, data: {}});

    const {getAllByText} = render(<ManagePermissions />);

    await act(async () => {
      await Promise.resolve();
    });

    const bulkUploadButton = getAllByText('Tải lên')[0];

    await act(async () => {
      fireEvent.press(bulkUploadButton);
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/documents/class/456/permissions/bulk'),
      {canUpload: true, canDownload: false}, // canUpload is toggled to true bulk, canDownload is unchanged bulk
      expect.any(Object),
    );
  });
});
