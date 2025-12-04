import React, { useState, useEffect, createContext, useContext } from 'react';
import { AlertCircle, Building2, FileText, Calendar, CreditCard, Users,Building, Maximize, DollarSign, ClipboardList, LogOut, Menu, X, Plus, Edit2, Trash2, Eye, Filter, RefreshCw,AlertTriangle } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8001';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// API Service
class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса');
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Auth
  async register(data) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({
        username: data.phone,
        password: data.password,
        company_name: data.company_name,
        contact_person: data.contact_person
      })
    });
  }

  async login(phone, password) {
    const formData = new URLSearchParams();
    formData.append('username', phone);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка входа');
    }

    return await response.json();
  }

  // Offices
  async getOffices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/offices/${queryString ? '?' + queryString : ''}`);
  }

  async updateOffice(id, data) {
    return this.request(`/offices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Bookings
  async getBookings() {
    return this.request('/bookings/');
  }

  async createBooking(data) {
    return this.request('/bookings/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteBooking(id) {
    return this.request(`/bookings/${id}`, { method: 'DELETE' });
  }
  
  async checkExpiredBookings(autoUpdate = true) {
    return this.request(`/bookings/check-expired?auto_update=${autoUpdate}`);
  }

  async getExpiredBookings() {
    return this.request('/bookings/expired');
  }

  async getActiveExpiringBookings(days = 7) {
    return this.request(`/bookings/active-expiring?days_threshold=${days}`);
  }

  async bulkExpireBookings() {
    return this.request('/bookings/bulk-expire', {
      method: 'POST'
    });
  }

  async getBookingStats() {
    return this.request('/bookings/stats');
  }

  async forceExpireBooking(id) {
    return this.request(`/bookings/force-expire/${id}`, {
      method: 'POST'
    });
  }

   // Contracts
  async getContracts() {
    return this.request('/contracts/');
  }

  async createContract(data) {
    return this.request('/contracts/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ДОБАВЛЯЕМ НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ИСТЕКШИМИ ДОГОВОРАМИ:

  // Проверка и завершение истекших договоров
  async checkExpiredContracts() {
    return this.request('/contracts/check-expired', {
      method: 'POST'
    });
  }

  // Получение договоров, которые скоро истекут
  async getExpiringContracts(days = 7) {
    return this.request(`/contracts/expiring-soon?days=${days}`);
  }

  // Дополнительные методы для договоров (если нужны)
  async getContract(id) {
    return this.request(`/contracts/${id}`);
  }

  async updateContract(id, data) {
    return this.request(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteContract(id) {
    return this.request(`/contracts/${id}`, { method: 'DELETE' });
  }

    
  

  // Payments
  async getPayments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/payments/${queryString ? '?' + queryString : ''}`);
  }

  async payPayment(id) {
    return this.request(`/payments/${id}/pay`, { method: 'PUT' });
  }

  async checkOverduePayments() {
    return this.request('/payments/check-overdue', { method: 'POST' });
  }

  // Requests
  async getRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/requests/${queryString ? '?' + queryString : ''}`);
  }

  async createRequest(data) {
    return this.request('/requests/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRequest(id, data) {
    return this.request(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Tenants
  async getTenants(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tenants/${queryString ? '?' + queryString : ''}`);
  }

  async createTenant(data) {
    return this.request('/tenants/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

const api = new ApiService();

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      api.setToken(token);
    }
    setLoading(false);
  }, []);

  const login = async (phone, password) => {
    const response = await api.login(phone, password);
    api.setToken(response.access_token);
    
    const tokenParts = response.access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    
    const userData = {
      id: payload.user_id,
      role: payload.user_role,
      tenant_id: payload.tenant_id,
      phone
    };
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (data) => {
    const response = await api.register(data);
    api.setToken(response.access_token);
    
    const userData = {
      id: response.user.id,
      role: response.user.role,
      tenant_id: response.user.tenant_id,
      phone: response.user.phone
    };
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Requests Tab
const RequestsTab = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]); // Новое состояние для активных договоров
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    id_договора: '',
    текст_заявки: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [requestsData, contractsData] = await Promise.all([
        api.getRequests(params),
        api.getContracts()
      ]);
      
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      
      // Фильтруем только активные договоры
      const activeContractsData = contractsData.filter(contract => 
        contract.статус === 'активен' || contract.статус === 'active'
      );
      setActiveContracts(activeContractsData);
      
    } catch (error) {
      console.error(error);
      setRequests([]);
      setContracts([]);
      setActiveContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createRequest({ ...formData, статус: 'новая' });
      setShowModal(false);
      setFormData({ id_договора: '', текст_заявки: '' });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const openStatusModal = (request) => {
    setSelectedRequest(request);
    setNewStatus(request.статус);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!selectedRequest || !newStatus) return;
    try {
      await api.updateRequest(selectedRequest.id_заявки, { статус: newStatus });
      setShowStatusModal(false);
      setSelectedRequest(null);
      setNewStatus('');
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const applyFilters = () => {
    loadData();
  };

  // Функция для получения номера офиса по ID договора
  const getOfficeInfoForContract = (contractId) => {
    const contract = contracts.find(c => c.id_договора === contractId);
    if (!contract) return '';
    
    // Здесь можно добавить логику получения номера офиса
    // Например, если в данных договора есть id_офиса или номер_офиса
    return contract.id_офиса ? ` (Офис ${contract.id_офиса})` : '';
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Заявки</h2>
        {user?.role === 'tenant' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Создать заявку
          </button>
        )}
      </div>

      {/* Фильтр */}
      {(user?.role === 'admin' || user?.role === 'staff') && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Все статусы</option>
                <option value="новая">Новая</option>
                <option value="в работе">В работе</option>
                <option value="выполнена">Выполнена</option>
                <option value="отклонена">Отклонена</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Применить
              </button>
              <button
                onClick={() => {
                  setFilterStatus('');
                  loadData();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Заявки не найдены</p>
          {user?.role === 'tenant' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Создать заявку
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id_заявки} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Заявка №{request.id_заявки}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Договор №{request.id_договора}
                    {request.номер_офиса && ` • Офис: ${request.номер_офиса}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  request.статус === 'новая' ? 'bg-blue-100 text-blue-700' : 
                  request.статус === 'в работе' ? 'bg-yellow-100 text-yellow-700' :
                  request.статус === 'выполнена' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {request.статус}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{request.текст_заявки}</p>
              <p className="text-sm text-gray-500 mb-4">
                Создана: {new Date(request.дата_подачи).toLocaleDateString('ru-RU')}
              </p>
              <div className="flex gap-2">
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <button
                    onClick={() => openStatusModal(request)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Изменить статус
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal создания заявки */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новая заявка</h3>
            
            {activeContracts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  У вас нет активных договоров. Заявки можно создавать только для активных договоров.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Договор <span className="text-green-600">(только активные)</span>
                  </label>
                  <select
                    value={formData.id_договора}
                    onChange={(e) => setFormData({ ...formData, id_договора: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Выберите активный договор</option>
                    {activeContracts.map((contract) => (
                      <option key={contract.id_договора} value={contract.id_договора}>
                        Договор №{contract.id_договора} 
                        {contract.id_офиса && ` (Офис ${contract.id_офиса})`}
                        {contract.статус && ` - ${contract.статус}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Доступно активных договоров: {activeContracts.length}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Текст заявки</label>
                  <textarea
                    value={formData.текст_заявки}
                    onChange={(e) => setFormData({ ...formData, текст_заявки: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows="4"
                    placeholder="Опишите проблему подробно"
                    maxLength="500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Максимум 500 символов. Осталось: {500 - (formData.текст_заявки?.length || 0)}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Создать заявку
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal изменения статуса */}
      {showStatusModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Изменить статус заявки №{selectedRequest.id_заявки}
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg mb-2">
                <p className="text-sm text-gray-600">Текущий статус:</p>
                <p className="font-medium">{selectedRequest.статус}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Новый статус</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Выберите статус</option>
                  <option value="новая">Новая</option>
                  <option value="в работе">В работе</option>
                  <option value="выполнена">Выполнена</option>
                  <option value="отклонена">Отклонена</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedRequest(null);
                    setNewStatus('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!newStatus}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    newStatus 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tenants Tab
// Tenants Tab
const TenantsTab = () => {
  const { user } = useAuth(); // Добавляем useAuth для получения роли пользователя
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterTenantId, setFilterTenantId] = useState('');
  const [formData, setFormData] = useState({
    название_компании: '',
    контактное_лицо: '',
    телефон: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const params = filterTenantId ? { tenant_id: filterTenantId } : {};
      const data = await api.getTenants(params);
      setTenants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createTenant(formData);
      setShowModal(false);
      setFormData({ название_компании: '', контактное_лицо: '', телефон: '' });
      loadTenants();
    } catch (error) {
      alert(error.message);
    }
  };

  const applyFilters = () => {
    loadTenants();
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Арендаторы</h2>
        {/* Показываем кнопку только для admin, скрываем для staff */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Добавить арендатора
          </button>
        )}
      </div>

      {/* Фильтр */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ID Арендатора</label>
            <input
              type="number"
              value={filterTenantId}
              onChange={(e) => setFilterTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="ID арендатора"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Применить
            </button>
            <button
              onClick={() => {
                setFilterTenantId('');
                loadTenants();
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Арендаторы не найдены</p>
          {/* Показываем кнопку только для admin */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Добавить арендатора
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tenants.map((tenant) => (
            <div key={tenant.id_арендатора} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-gray-800">{tenant.название_компании}</h3>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  ID: {tenant.id_арендатора}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Контактное лицо:</span> {tenant.контактное_лицо}</p>
                <p><span className="font-medium">Телефон:</span> {tenant.телефон}</p>
                <p><span className="font-medium">Дата регистрации:</span> {new Date(tenant.дата_регистрации).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal создания арендатора - показываем только для admin */}
      {showModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый арендатор</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название компании</label>
                <input
                  type="text"
                  value={formData.название_компании}
                  onChange={(e) => setFormData({ ...formData, название_компании: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="ООО Компания"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо</label>
                <input
                  type="text"
                  value={formData.контактное_лицо}
                  onChange={(e) => setFormData({ ...formData, контактное_лицо: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.телефон}
                  onChange={(e) => setFormData({ ...formData, телефон: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="+7 (999) 123-45-67"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Dashboard
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('offices');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'offices': return <OfficesTab />;
      case 'bookings': return <BookingsTab />;
      case 'contracts': return <ContractsTab />;
      case 'payments': return <PaymentsTab />;
      case 'requests': return <RequestsTab />;
      case 'tenants': return <TenantsTab />;
      default: return <OfficesTab />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <header className="bg-white border-b border-gray-200 p-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
          </header>
        )}
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}

// Login Page
const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    company_name: '',
    contact_person: ''
  });
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(formData);
      } else {
        await login(formData.phone, formData.password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">CRM Офисы</h1>
          <p className="text-gray-600 mt-2">
            {isRegister ? 'Создайте аккаунт' : 'Войдите в систему'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название компании
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ООО Компания"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Контактное лицо
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Иван Иванов"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Sidebar
const Sidebar = ({ activeTab, setActiveTab, isMobile, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'offices', label: 'Офисы', icon: Building2, roles: ['admin', 'tenant', 'staff'] },
    { id: 'bookings', label: 'Брони', icon: Calendar, roles: ['admin', 'tenant', 'staff'] },
    { id: 'contracts', label: 'Договоры', icon: FileText, roles: ['admin', 'tenant'] },
    { id: 'payments', label: 'Платежи', icon: CreditCard, roles: ['admin', 'tenant', 'staff'] },
    { id: 'requests', label: 'Заявки', icon: ClipboardList, roles: ['admin', 'tenant', 'staff'] },
    { id: 'tenants', label: 'Арендаторы', icon: Users, roles: ['admin', 'staff'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'tenant': return 'Арендатор';
      case 'staff': return 'Персонал';
      default: return role;
    }
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform`
            : 'relative'
        } w-64 bg-indigo-900 text-white flex flex-col`}
      >
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              <h1 className="text-xl font-bold">CRM Офисы</h1>
            </div>
            {isMobile && (
              <button onClick={() => setIsOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          <p className="text-indigo-300 text-sm mt-2">{getRoleName(user?.role)}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-indigo-800 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-indigo-200 hover:bg-indigo-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </aside>
    </>
  );
};

// Offices Tab
const OfficesTab = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterOfficeNumber, setFilterOfficeNumber] = useState(''); // Новый фильтр по номеру офиса

  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterFloor) params.floor = filterFloor;
      if (filterOfficeNumber) params.office_number = filterOfficeNumber; // Добавляем параметр
      
      const data = await api.getOffices(params);
      setOffices(data);
    } catch (error) {
      console.error(error);
      setOffices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedOffice || !newStatus) return;
    try {
      await api.updateOffice(selectedOffice.id_офиса, { статус: newStatus });
      setShowStatusModal(false);
      setSelectedOffice(null);
      setNewStatus('');
      loadOffices();
    } catch (error) {
      alert(error.message);
    }
  };

  const openStatusModal = (office) => {
    setSelectedOffice(office);
    setNewStatus(office.статус);
    setShowStatusModal(true);
  };

  const applyFilters = () => {
    loadOffices();
  };

  const resetFilters = () => {
    setFilterStatus('');
    setFilterFloor('');
    setFilterOfficeNumber('');
    loadOffices();
  };

  // Функция для форматированного отображения номера офиса
  const formatOfficeNumber = (number) => {
    return number || 'Без номера';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Офисы</h2>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Номер офиса</label>
            <input
              type="text"
              value={filterOfficeNumber}
              onChange={(e) => setFilterOfficeNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Например: 101, 202"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Все статусы</option>
              <option value="свободен">Свободен</option>
              <option value="арендуется">Арендуется</option>
              <option value="только для брони">Только для брони</option>
              <option value="на обслуживании">На обслуживании</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Этаж</label>
            <input
              type="number"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Любой этаж"
              min="1"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Применить
            </button>
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Информация о фильтрах */}
      {(filterStatus || filterFloor || filterOfficeNumber) && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
          Активные фильтры:
          {filterOfficeNumber && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Номер: {filterOfficeNumber}</span>}
          {filterStatus && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Статус: {filterStatus}</span>}
          {filterFloor && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Этаж: {filterFloor}</span>}
          <button 
            onClick={resetFilters}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Очистить все
          </button>
        </div>
      )}

      {/* Статистика */}
      {offices.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Всего офисов</div>
            <div className="text-2xl font-bold">{offices.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Свободных</div>
            <div className="text-2xl font-bold text-green-600">
              {offices.filter(o => o.статус === 'свободен').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Для брони</div>
            <div className="text-2xl font-bold text-blue-600">
              {offices.filter(o => o.статус === 'только для брони').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Арендуются</div>
            <div className="text-2xl font-bold text-red-600">
              {offices.filter(o => o.статус === 'арендуется').length}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : offices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Офисы не найдены по выбранным фильтрам
          </p>
          <button
            onClick={resetFilters}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Показать все офисы
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offices.map((office) => (
            <div key={office.id_офиса} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    Офис {formatOfficeNumber(office.номер_офиса)}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {office.id_офиса}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  office.статус === 'свободен' ? 'bg-green-100 text-green-700' : 
                  office.статус === 'только для брони' ? 'bg-blue-100 text-blue-700' :
                  office.статус === 'арендуется' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {office.статус || 'Неизвестно'}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>Этаж: {office.этаж || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-gray-400" />
                  <span>Площадь: {office.площадь || 0} м²</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-800">
                    {office.стоимость ? office.стоимость.toLocaleString() : '0'} ₽/мес
                  </span>
                </div>
              </div>
              {user?.role === 'admin' && (
                <div className="mt-4">
                  <button
                    onClick={() => openStatusModal(office)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    Изменить статус
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal изменения статуса */}
      {showStatusModal && selectedOffice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Изменить статус офиса {selectedOffice.номер_офиса}
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Текущий статус:</p>
                <p className="font-medium">{selectedOffice.статус}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Новый статус</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Выберите статус</option>
                  <option value="свободен">Свободен</option>
                  <option value="арендуется">Арендуется</option>
                  <option value="только для брони">Только для брони</option>
                  <option value="на обслуживании">На обслуживании</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedOffice(null);
                    setNewStatus('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!newStatus}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    newStatus 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bookings Tab
const BookingsTab = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOffice, setFilterOffice] = useState(''); // Фильтр по офису
  const [formData, setFormData] = useState({
    id_офиса: '',
    начало_брони: '',
    окончание_брони: '',
    статус: 'активна'
  });
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkExpiredLoading, setCheckExpiredLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsData, officesData] = await Promise.all([
        api.getBookings(),
        api.getOffices({ status: 'только для брони' }),
      ]);
      
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setOffices(Array.isArray(officesData) ? officesData : []);
    } catch (error) {
      console.error(error);
      setBookings([]);
      setOffices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExpired = async () => {
    setCheckExpiredLoading(true);
    try {
      const result = await api.checkExpiredBookings();
      setCheckResult(result);
      // Обновляем данные
      await loadData();
      
      // Автоматически закрываем модалку через 3 секунды
      setTimeout(() => {
        setShowCheckModal(false);
        setCheckResult(null);
      }, 3000);
    } catch (error) {
      alert('Ошибка при проверке истекших броней: ' + error.message);
    } finally {
      setCheckExpiredLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking(formData);
      setShowModal(false);
      setFormData({ id_офиса: '', начало_брони: '', окончание_брони: '', статус: 'активна' });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Аннулировать бронь?')) return;
    try {
      await api.deleteBooking(id);
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  // Функция для получения номера офиса по ID
  const getOfficeNumber = (officeId) => {
    const office = offices.find(o => o.id_офиса === officeId);
    return office ? `Офис ${office.номер_офиса}` : `Офис ${officeId}`;
  };

  // Фильтрация броней
  const filteredBookings = bookings.filter(booking => {
    // Фильтр по статусу
    if (filterStatus && booking.статус !== filterStatus) return false;
    
    // Фильтр по офису
    if (filterOffice && booking.id_офиса !== parseInt(filterOffice)) return false;
    
    return true;
  });

  // Получаем уникальные офисы из броней для фильтра
  const availableOffices = [...new Set(bookings
    .map(b => b.id_офиса)
    .filter(id => offices.some(o => o.id_офиса === id))
  )].map(officeId => {
    const office = offices.find(o => o.id_офиса === officeId);
    return {
      id: officeId,
      number: office?.номер_офиса || officeId
    };
  }).sort((a, b) => a.number - b.number);

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Брони</h2>
        <div className="flex gap-2">
          {/* Кнопка проверки истекших броней (только для админов) */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCheckModal(true)}
              className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              <RefreshCw className="w-5 h-5" />
              Проверить истекшие
            </button>
          )}
          {user?.role === 'tenant' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              Забронировать офис
            </button>
          )}
        </div>
      </div>

      {/* Фильтры для админа */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Все статусы</option>
                <option value="активна">Активна</option>
                <option value="аннулирована">Аннулирована</option>
                <option value="истекла">Истекла</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Офис</label>
              <select
                value={filterOffice}
                onChange={(e) => setFilterOffice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Все офисы</option>
                {availableOffices.map(office => (
                  <option key={office.id} value={office.id}>
                    Офис {office.number}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterOffice('');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {bookings.length === 0 
              ? 'У вас пока нет бронирований' 
              : 'Брони не найдены по выбранным фильтрам'}
          </p>
          {user?.role === 'tenant' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Забронировать офис
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Офис</th>
                {user?.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Арендатор</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Начало</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Окончание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                {(user?.role === 'tenant' || user?.role === 'admin') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id_брони}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getOfficeNumber(booking.id_офиса)}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ID {booking.id_арендатора}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.начало_брони).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.окончание_брони).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.статус === 'активна' ? 'bg-green-100 text-green-700' : 
                      booking.статус === 'аннулирована' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.статус}
                    </span>
                  </td>
                  {(user?.role === 'tenant' || user?.role === 'admin') && (
                    <td className="px-6 py-4 text-sm">
                      {booking.статус === 'активна' && (
                        <button
                          onClick={() => handleDelete(booking.id_брони)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Аннулировать
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно для проверки истекших броней */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Проверка истекших броней</h3>
            
            {checkResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  checkResult.expired_count > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <p className="font-medium">
                    {checkResult.expired_count > 0
                      ? `Найдено и обновлено ${checkResult.expired_count} истекших броней`
                      : 'Истекших броней не найдено'
                    }
                  </p>
                </div>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Обновление данных...</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Эта операция проверит все активные брони и обновит статус на "истекла" для тех, у которых истек срок.
                </p>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowCheckModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={checkExpiredLoading}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCheckExpired}
                    disabled={checkExpiredLoading}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {checkExpiredLoading ? 'Проверка...' : 'Проверить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно для бронирования */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Забронировать офис</h3>
            {offices.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">Нет доступных офисов для бронирования. Офисы должны иметь статус "только для брони".</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Офис</label>
                  <select
                    value={formData.id_офиса}
                    onChange={(e) => setFormData({ ...formData, id_офиса: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Выберите офис</option>
                    {offices.map((office) => (
                      <option key={office.id_офиса} value={office.id_офиса}>
                        Офис {office.номер_офиса} (Этаж {office.этаж}, {office.площадь}м²) - {office.стоимость ? office.стоимость.toLocaleString() : '0'} ₽/мес
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
                  <input
                    type="date"
                    value={formData.начало_брони}
                    onChange={(e) => setFormData({ ...formData, начало_брони: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
                  <input
                    type="date"
                    value={formData.окончание_брони}
                    onChange={(e) => setFormData({ ...formData, окончание_брони: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Забронировать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Contracts Tab
const ContractsTab = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [offices, setOffices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenantId, setFilterTenantId] = useState('');
  const [filterContractId, setFilterContractId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id_договора');
  const [sortOrder, setSortOrder] = useState('desc');
  const [checkingExpired, setCheckingExpired] = useState(false);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [terminatingContract, setTerminatingContract] = useState(null);
  const [formData, setFormData] = useState({
    id_офиса: '',
    дата_начала: '',
    дата_окончания: '',
    id_арендатора: user?.role === 'tenant' ? user.id : ''
  });

  useEffect(() => {
    loadData();
    loadExpiringContracts();
  }, []);

  const loadData = async () => {
    try {
      const contractsData = await api.getContracts();
      setContracts(contractsData);
    } catch (error) {
      console.error('Ошибка загрузки договоров:', error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExpiringContracts = async () => {
    if (user?.role !== 'admin' && user?.role !== 'staff') return;
    
    try {
      const response = await api.getExpiringContracts(7);
      setExpiringContracts(response.expiring_contracts || []);
    } catch (error) {
      console.error('Ошибка загрузки истекающих договоров:', error);
      setExpiringContracts([]);
    }
  };

  const loadModalData = async () => {
    setModalLoading(true);
    try {
      const [officesData, tenantsData] = await Promise.all([
        (user?.role === 'tenant' || user?.role === 'admin') 
          ? api.getOffices({ status: 'свободен' })
          : Promise.resolve([]),
        user?.role === 'admin' ? api.getTenants() : Promise.resolve([])
      ]);
      
      setOffices(officesData);
      setTenants(tenantsData);
    } catch (error) {
      console.error('Ошибка загрузки данных для модалки:', error);
      setOffices([]);
      setTenants([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenModal = async () => {
    await loadModalData();
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createContract(formData);
      setShowModal(false);
      setFormData({ 
        id_офиса: '', 
        дата_начала: '', 
        дата_окончания: '',
        id_арендатора: user?.role === 'tenant' ? user.id : '' 
      });
      loadData();
      loadExpiringContracts();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleViewDetails = (contract) => {
    setSelectedContract(contract);
    setShowDetailsModal(true);
  };

  // Расторжение договора
  const handleTerminateContract = async (contractId) => {
    if (!window.confirm('Вы уверены, что хотите расторгнуть этот договор? Офис будет освобожден.')) {
      return;
    }

    setTerminatingContract(contractId);
    try {
      await api.deleteContract(contractId);
      alert('Договор успешно расторгнут');
      loadData();
      loadExpiringContracts();
    } catch (error) {
      alert('Ошибка при расторжении договора: ' + error.message);
    } finally {
      setTerminatingContract(null);
    }
  };

  const calculateDaysLeft = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (contract) => {
    const daysLeft = calculateDaysLeft(contract.дата_окончания);
    
    if (contract.статус === 'расторгнут') {
      return { text: 'Расторгнут', class: 'bg-red-100 text-red-700' };
    }
    if (contract.статус === 'завершён') {
      return { text: 'Завершён', class: 'bg-gray-100 text-gray-700' };
    }
    if (daysLeft < 0) {
      return { text: 'Завершён', class: 'bg-red-100 text-red-700' };
    }
    if (daysLeft <= 30) {
      return { text: `Заканчивается (${daysLeft} д.)`, class: 'bg-orange-100 text-orange-700' };
    }
    return { text: 'Активен', class: 'bg-green-100 text-green-700' };
  };

  // Проверка и завершение истекших договоров
  const handleCheckExpiredContracts = async () => {
    setCheckingExpired(true);
    try {
      const result = await api.checkExpiredContracts();
      alert(result.message);
      loadData();
      loadExpiringContracts();
    } catch (error) {
      alert('Ошибка при проверке договоров: ' + error.message);
    } finally {
      setCheckingExpired(false);
    }
  };

  // Фильтрация и сортировка
  const filteredAndSortedContracts = contracts
    .filter(contract => {
      if (filterStatus && contract.статус !== filterStatus) return false;
      if (filterTenantId && contract.id_арендатора !== parseInt(filterTenantId)) return false;
      if (filterContractId && contract.id_договора !== parseInt(filterContractId)) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          contract.id_договора.toString().includes(searchLower) ||
          contract.id_офиса.toString().includes(searchLower) ||
          contract.id_арендатора.toString().includes(searchLower) ||
          (contract.номер_офиса && contract.номер_офиса.toLowerCase().includes(searchLower)) // Добавляем поиск по номеру офиса
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy.includes('дата')) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Договоры</h2>
          <p className="text-gray-600 text-sm mt-1">
            Всего договоров: {contracts.length} | Показано: {filteredAndSortedContracts.length}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Кнопка проверки истекших договоров (только для админа и staff) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <button
              onClick={handleCheckExpiredContracts}
              disabled={checkingExpired}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                checkingExpired 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {checkingExpired ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Проверка...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Проверить завершение
                </>
              )}
            </button>
          )}
          {(user?.role === 'tenant' || user?.role === 'admin') && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Создать договор
            </button>
          )}
        </div>
      </div>

      {/* Уведомление о истекающих договорах */}
      {(user?.role === 'admin' || user?.role === 'staff') && expiringContracts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Скоро истекают: {expiringContracts.length} договоров
              </span>
            </div>
            <button
              onClick={loadExpiringContracts}
              className="text-yellow-600 hover:text-yellow-700 text-sm"
            >
              Обновить
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringContracts.slice(0, 3).map(contract => (
              <div key={contract.id_договора} className="text-sm text-yellow-700 bg-yellow-100 rounded px-3 py-1">
                Договор №{contract.id_договора} - {contract.дней_осталось} д.
              </div>
            ))}
            {expiringContracts.length > 3 && (
              <div className="text-sm text-yellow-600">
                +{expiringContracts.length - 3} еще...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Улучшенные фильтры */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ID договора, офиса или арендатора..."
            />
          </div>
          {user?.role === 'admin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Все статусы</option>
                  <option value="активен">Активен</option>
                  <option value="завершён">Завершён</option>
                  <option value="расторгнут">Расторгнут</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Арендатора</label>
                <input
                  type="number"
                  value={filterTenantId}
                  onChange={(e) => setFilterTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ID арендатора"
                />
              </div>
            </>
          )}
          {user?.role === 'tenant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID Договора</label>
              <input
                type="number"
                value={filterContractId}
                onChange={(e) => setFilterContractId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ID договора"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="id_договора">По номеру {getSortIcon('id_договора')}</option>
              <option value="дата_начала">По дате начала {getSortIcon('дата_начала')}</option>
              <option value="дата_окончания">По дате окончания {getSortIcon('дата_окончания')}</option>
              <option value="стоимость">По стоимости {getSortIcon('стоимость')}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              loadData();
              loadExpiringContracts();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Обновить
          </button>
          <button
            onClick={() => {
              setFilterStatus('');
              setFilterTenantId('');
              setFilterContractId('');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Сбросить фильтры
          </button>
        </div>
      </div>

      {filteredAndSortedContracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {contracts.length === 0 ? 'У вас пока нет договоров' : 'Договоры не найдены'}
          </p>
          {(user?.role === 'tenant' || user?.role === 'admin') && (
            <button
              onClick={handleOpenModal}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Создать договор
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredAndSortedContracts.map((contract) => {
          const statusInfo = getStatusBadge(contract);
          const daysLeft = calculateDaysLeft(contract.дата_окончания);
          const canTerminate = user?.role === 'admin' && contract.статус === 'активен';
          
          return (
            <div key={contract.id_договора} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      Договор №{contract.id_договора}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>Офис: {contract.номер_офиса || `ID: ${contract.id_офиса}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Арендатор: {contract.id_арендатора}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                    {statusInfo.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600 text-xs">Начало:</p>
                    <p className="font-medium">{new Date(contract.дата_начала).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Окончание:</p>
                    <p className="font-medium">{new Date(contract.дата_окончания).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Стоимость:</p>
                    <p className="font-medium text-indigo-600">
                      {contract.стоимость ? contract.стоимость.toLocaleString() : '0'} ₽
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Осталось дней:</p>
                    <p className="font-medium text-gray-800">
                      {daysLeft > 0 ? daysLeft : '0'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(contract)}
                    className="flex-1 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Подробнее
                  </button>
                  
                  {/* Кнопка расторжения договора (только для админа и активных договоров) */}
                  {canTerminate && (
                    <button
                      onClick={() => handleTerminateContract(contract.id_договора)}
                      disabled={terminatingContract === contract.id_договора}
                      className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${
                        terminatingContract === contract.id_договора
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {terminatingContract === contract.id_договора ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Модалка создания договора */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Создать договор</h3>
            
            {modalLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Загрузка данных...</p>
              </div>
            ) : offices.length === 0 ? (
              <div className="text-center py-4">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Нет доступных офисов для аренды</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Арендатор</label>
                    <select
                      value={formData.id_арендатора}
                      onChange={(e) => setFormData({ ...formData, id_арендатора: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Выберите арендатора</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id_арендатора} value={tenant.id_арендатора}>
                          {tenant.название_компании} (ID: {tenant.id_арендатора})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Офис</label>
                  <select
                    value={formData.id_офиса}
                    onChange={(e) => setFormData({ ...formData, id_офиса: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Выберите офис</option>
                    {offices.map((office) => (
                      <option key={office.id_офиса} value={office.id_офиса}>
                        Офис {office.номер_офиса} (Этаж {office.этаж}, {office.площадь}м²)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
                    <input
                      type="date"
                      value={formData.дата_начала}
                      onChange={(e) => setFormData({ ...formData, дата_начала: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
                    <input
                      type="date"
                      value={formData.дата_окончания}
                      onChange={(e) => setFormData({ ...formData, дата_окончания: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Модалка деталей договора */}
      {showDetailsModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Договор №{selectedContract.id_договора}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Основная информация</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Офис:</span>
                      <span className="font-medium">{selectedContract.номер_офиса || `ID: ${selectedContract.id_офиса}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID Арендатора:</span>
                      <span className="font-medium">{selectedContract.id_арендатора}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusBadge(selectedContract).class
                      }`}>
                        {getStatusBadge(selectedContract).text}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Финансы</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Стоимость:</span>
                      <span className="font-medium text-indigo-600">
                        {selectedContract.стоимость ? selectedContract.стоимость.toLocaleString() : '0'} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Даты</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Начало:</span>
                      <span className="font-medium">{new Date(selectedContract.дата_начала).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Окончание:</span>
                      <span className="font-medium">{new Date(selectedContract.дата_окончания).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Заключен:</span>
                      <span className="font-medium">{new Date(selectedContract.дата_заключения).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
                
                {selectedContract.статус === 'активен' && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Прогресс</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Осталось дней:</span>
                        <span className="font-medium">{calculateDaysLeft(selectedContract.дата_окончания)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Кнопка расторжения в модалке деталей */}
            {user?.role === 'admin' && selectedContract.статус === 'активен' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleTerminateContract(selectedContract.id_договора);
                  }}
                  disabled={terminatingContract === selectedContract.id_договора}
                  className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    terminatingContract === selectedContract.id_договора
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {terminatingContract === selectedContract.id_договора ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Расторжение...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Расторгнуть договор
                    </>
                  )}
                </button>
              </div>
            )}

            {(!user?.role === 'admin' || selectedContract.статус !== 'активен') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// Payments Tab
const PaymentsTab = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterContractId, setFilterContractId] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [expandedContracts, setExpandedContracts] = useState(new Set());

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterContractId) params.contract_number = filterContractId;
      
      const paymentsData = await api.getPayments(params);
      setPayments(paymentsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Группируем платежи по договорам
  const groupedPayments = payments.reduce((acc, payment) => {
    const contractId = payment.id_договора;
    if (!acc[contractId]) {
      acc[contractId] = [];
    }
    acc[contractId].push(payment);
    return acc;
  }, {});

  // Получаем список договоров
  const contracts = Object.keys(groupedPayments);

  const handlePayment = async (id) => {
    if (!window.confirm('Подтвердить оплату?')) return;
    try {
      await api.payPayment(id);
      loadPayments();
    } catch (error) {
      alert(error.message);
    }
  };

  const checkOverdue = async () => {
    try {
      const result = await api.checkOverduePayments();
      alert(result.detail);
      loadPayments();
    } catch (error) {
      alert(error.message);
    }
  };

  const openStatusModal = (payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.статус);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!selectedPayment || !newStatus) return;
    try {
      if (newStatus === 'оплачен') {
        await api.payPayment(selectedPayment.id_платежа);
      }
      setShowStatusModal(false);
      setSelectedPayment(null);
      setNewStatus('');
      loadPayments();
    } catch (error) {
      alert(error.message);
    }
  };

  const applyFilters = () => {
    loadPayments();
  };

  const toggleContract = (contractId) => {
    setExpandedContracts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };

  const toggleAllContracts = () => {
    if (expandedContracts.size === contracts.length) {
      setExpandedContracts(new Set());
    } else {
      setExpandedContracts(new Set(contracts));
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Платежи</h2>
        <div className="flex gap-2">
          {contracts.length > 0 && (
            <button
              onClick={toggleAllContracts}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
            >
              {expandedContracts.size === contracts.length ? 'Свернуть все' : 'Развернуть все'}
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'tenant') && (
            <button
              onClick={checkOverdue}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              <AlertCircle className="w-5 h-5" />
              Проверить просрочку
            </button>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Все статусы</option>
              <option value="не оплачен">Не оплачен</option>
              <option value="оплачен">Оплачен</option>
              <option value="просрочен">Просрочен</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ID Договора</label>
            <input
              type="number"
              value={filterContractId}
              onChange={(e) => setFilterContractId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="ID договора"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Применить
            </button>
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterContractId('');
                loadPayments();
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Платежи не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contractId) => {
            const contractPayments = groupedPayments[contractId];
            const isExpanded = expandedContracts.has(contractId);
            const totalAmount = contractPayments.reduce((sum, p) => sum + (p.сумма || 0), 0);
            const paidAmount = contractPayments
              .filter(p => p.статус === 'оплачен')
              .reduce((sum, p) => sum + (p.сумма || 0), 0);
            const pendingAmount = contractPayments
              .filter(p => p.статус === 'не оплачен')
              .reduce((sum, p) => sum + (p.сумма || 0), 0);
            const overdueAmount = contractPayments
              .filter(p => p.статус === 'просрочен')
              .reduce((sum, p) => sum + (p.сумма || 0), 0);

            return (
              <div key={contractId} className="bg-white rounded-lg shadow-md border border-gray-200">
                {/* Заголовок договора */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleContract(contractId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}>
                      ▶
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">
                        Договор №{contractId}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>Всего: {totalAmount.toLocaleString()} ₽</span>
                        <span className="text-green-600">Оплачено: {paidAmount.toLocaleString()} ₽</span>
                        <span className="text-yellow-600">Ожидает: {pendingAmount.toLocaleString()} ₽</span>
                        {overdueAmount > 0 && (
                          <span className="text-red-600">Просрочено: {overdueAmount.toLocaleString()} ₽</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {contractPayments.length} платеж(ей)
                  </div>
                </div>

                {/* Содержимое - платежи договора */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Срок оплаты</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата платежа</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {contractPayments.map((payment) => (
                          <tr key={payment.id_платежа}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {payment.сумма ? payment.сумма.toLocaleString() : '0'} ₽
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(payment.срок_оплаты).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {payment.дата_платежа ? new Date(payment.дата_платежа).toLocaleDateString('ru-RU') : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                payment.статус === 'оплачен' ? 'bg-green-100 text-green-700' : 
                                payment.статус === 'просрочен' ? 'bg-red-100 text-red-700' : 
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {payment.статус}
                              </span>
                            </td>
                            <td className="px-6 py-4 flex gap-2">
                              {/* ИЗМЕНЕНИЕ: арендатор может оплачивать как неоплаченные, так и просроченные платежи */}
                              {user?.role === 'tenant' && (payment.статус === 'не оплачен' || payment.статус === 'просрочен') && (
                                <button
                                  onClick={() => handlePayment(payment.id_платежа)}
                                  className={`px-3 py-1 text-white rounded-lg hover:opacity-90 text-xs ${
                                    payment.статус === 'просрочен' 
                                      ? 'bg-red-600 hover:bg-red-700' 
                                      : 'bg-green-600 hover:bg-green-700'
                                  }`}
                                >
                                  {payment.статус === 'просрочен' ? 'Оплатить просрочку' : 'Оплатить'}
                                </button>
                              )}
                              {user?.role === 'admin' && payment.статус !== 'просрочен' && (
                                <button
                                  onClick={() => openStatusModal(payment)}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Статус
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal изменения статуса */}
      {showStatusModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Изменить статус платежа №{selectedPayment.id_платежа}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Новый статус</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="не оплачен">Не оплачен</option>
                  <option value="оплачен">Оплачен</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Статус "просрочен" устанавливается автоматически при проверке просрочки
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleStatusChange}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};