// 历史记录 API 服务

export interface HistoryRecord {
  id: string;
  original_image_url?: string;
  original_name?: string;
  operation_type?: string;
  operation_name?: string;
  operation_params?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  processed_image_url: string;
  created_at: string;
  image_width?: number;
  image_height?: number;
  has_selection?: boolean;
  selection_bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

// 保存历史记录到后端
export async function saveHistoryRecord(record: {
  original_name: string;
  operation_name: string;
  parameters: Record<string, unknown>;
  processed_image_url: string;
  image_width: number;
  image_height: number;
  has_selection: boolean;
  selection_bounds: HistoryRecord['selection_bounds'];
}): Promise<{ success: boolean; data?: HistoryRecord; error?: string }> {
  try {
    const response = await fetch('/api/history/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return { success: false, error: '网络请求失败' };
  }
}

// 获取历史记录列表
export async function fetchHistoryList(
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; data?: HistoryRecord[]; total?: number; error?: string }> {
  try {
    const response = await fetch(`/api/history/list?limit=${limit}&offset=${offset}`);
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        total: result.total,
      };
    }
    
    return { success: false, error: result.error };
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return { success: false, error: '网络请求失败' };
  }
}

// 清空历史记录
export async function clearHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/history/clear', {
      method: 'DELETE',
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('清空历史记录失败:', error);
    return { success: false, error: '网络请求失败' };
  }
}
