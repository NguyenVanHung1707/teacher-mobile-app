import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PendingApproval from '../src/PendingApproval';
import axios from 'axios';
import { Alert } from 'react-native';

const alertSpy = jest.spyOn(Alert, 'alert');

describe('PendingApproval Screen', () => {
  const mockNavigation = {
    replace: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await require('@react-native-async-storage/async-storage').setItem('accessToken', 'fake-token');
  });

  it('initially re-checks status and shows PENDING view', async () => {
    // Mock the backend returning PENDING
    axios.get.mockResolvedValueOnce({
      data: { accountStatus: 'PENDING', rejectionReason: '' }
    });

    const { getByText, queryByText } = render(<PendingApproval navigation={mockNavigation} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(axios.get).toHaveBeenCalled();
    expect(getByText('ĐANG CHỜ PHÊ DUYỆT')).toBeTruthy();
    expect(getByText('Tài khoản của bạn đang được quản trị viên xem xét và phê duyệt. Vui lòng quay lại sau.')).toBeTruthy();
    expect(queryByText('Lý do từ chối:')).toBeNull();
  });

  it('shows REJECTED view and rejection reason when backend status is REJECTED', async () => {
    axios.get.mockResolvedValueOnce({
      data: { accountStatus: 'REJECTED', rejectionReason: 'Thiếu chứng chỉ giảng dạy hợp lệ!' }
    });

    const { getByText } = render(<PendingApproval navigation={mockNavigation} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('BỊ TỪ CHỐI PHÊ DUYỆT')).toBeTruthy();
    expect(getByText('Lý do từ chối:')).toBeTruthy();
    expect(getByText('Thiếu chứng chỉ giảng dạy hợp lệ!')).toBeTruthy();
  });

  it('alerts and redirects to Main when accountStatus is APPROVED', async () => {
    axios.get.mockResolvedValueOnce({
      data: { accountStatus: 'APPROVED', rejectionReason: '' }
    });

    render(<PendingApproval navigation={mockNavigation} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Thành công',
      'Tài khoản của bạn đã được phê duyệt! Đang chuyển hướng...'
    );
    expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
  });

  it('allows manual refresh clicking the button', async () => {
    // 1st request on mount (PENDING)
    axios.get.mockResolvedValueOnce({
      data: { accountStatus: 'PENDING', rejectionReason: '' }
    });

    const { getByText } = render(<PendingApproval navigation={mockNavigation} />);

    await act(async () => {
      await Promise.resolve();
    });

    // 2nd request on press (now APPROVED)
    axios.get.mockResolvedValueOnce({
      data: { accountStatus: 'APPROVED', rejectionReason: '' }
    });

    const refreshButton = getByText('KIỂM TRA LẠI TRẠNG THÁI');
    await act(async () => {
      fireEvent.press(refreshButton);
    });

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
  });
});
