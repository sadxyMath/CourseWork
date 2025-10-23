import React, { useState, useEffect, createContext, useContext } from 'react';
import { AlertCircle, Building2, FileText, Calendar, CreditCard, Users, ClipboardList, LogOut, Menu, X, Plus, Edit2, Trash2, Eye } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

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
  async getOffices() {
    return this.request('/offices/');
  }

  async getOffice(id) {
    return this.request(`/offices/${id}`);
  }

  async createOffice(data) {
    return this.request('/offices/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateOffice(id, data) {
    return this.request(`/offices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteOffice(id) {
    return this.request(`/offices/${id}`, { method: 'DELETE' });
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

  async updateBooking(id, data) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteBooking(id) {
    return this.request(`/bookings/${id}`, { method: 'DELETE' });
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
  async getPayments() {
    return this.request('/payments/');
  }

  async createPayment(data) {
    return this.request('/payments/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkOverduePayments() {
    return this.request('/payments/check-overdue', { method: 'POST' });
  }

  // Requests
  async getRequests() {
    return this.request('/requests/');
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

  async deleteRequest(id) {
    return this.request(`/requests/${id}`, { method: 'DELETE' });
  }

  // Tenants
  async getTenants() {
    return this.request('/tenants/');
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
    const userData = {
      id: response.user_id,
      role: response.user_role,
      phone
    };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (data) => {
    const response = await api.register(data);
    api.setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('user', JSON.stringify(response.user));
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
    { id: 'tenants', label: 'Арендаторы', icon: Users, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

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
          <p className="text-indigo-300 text-sm mt-2">{user?.role === 'admin' ? 'Администратор' : user?.role === 'tenant' ? 'Арендатор' : 'Персонал'}</p>
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
  const [showModal, setShowModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [formData, setFormData] = useState({
    адрес: '',
    площадь: '',
    количество_комнат: '',
    стоимость_аренды: '',
    статус: 'свободен'
  });

  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      const data = await api.getOffices();
      setOffices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOffice) {
        await api.updateOffice(editingOffice.id_офиса, formData);
      } else {
        await api.createOffice(formData);
      }
      setShowModal(false);
      setEditingOffice(null);
      setFormData({ адрес: '', площадь: '', количество_комнат: '', стоимость_аренды: '', статус: 'свободен' });
      loadOffices();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить офис?')) return;
    try {
      await api.deleteOffice(id);
      loadOffices();
    } catch (error) {
      alert(error.message);
    }
  };

  const openEditModal = (office) => {
    setEditingOffice(office);
    setFormData({
      адрес: office.адрес,
      площадь: office.площадь,
      количество_комнат: office.количество_комнат,
      стоимость_аренды: office.стоимость_аренды,
      статус: office.статус
    });
    setShowModal(true);
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Офисы</h2>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingOffice(null);
              setFormData({ адрес: '', площадь: '', количество_комнат: '', стоимость_аренды: '', статус: 'свободен' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Добавить офис
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offices.map((office) => (
          <div key={office.id_офиса} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-gray-800">{office.адрес}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                office.статус === 'свободен' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {office.статус}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Площадь: {office.площадь} м²</p>
              <p>Комнат: {office.количество_комнат}</p>
              <p className="font-semibold text-gray-800">
                {office.стоимость_аренды.toLocaleString()} ₽/мес
              </p>
            </div>
            {user?.role === 'admin' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEditModal(office)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100"
                >
                  <Edit2 className="w-4 h-4" />
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(office.id_офиса)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingOffice ? 'Редактировать офис' : 'Новый офис'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <input
                  type="text"
                  value={formData.адрес}
                  onChange={(e) => setFormData({ ...formData, адрес: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Площадь (м²)</label>
                <input
                  type="number"
                  value={formData.площадь}
                  onChange={(e) => setFormData({ ...formData, площадь: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество комнат</label>
                <input
                  type="number"
                  value={formData.количество_комнат}
                  onChange={(e) => setFormData({ ...formData, количество_комнат: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость аренды (₽)</label>
                <input
                  type="number"
                  value={formData.стоимость_аренды}
                  onChange={(e) => setFormData({ ...formData, стоимость_аренды: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={formData.статус}
                  onChange={(e) => setFormData({ ...formData, статус: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="свободен">Свободен</option>
                  <option value="арендуется">Арендуется</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingOffice(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingOffice ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
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
  const [formData, setFormData] = useState({
    id_офиса: '',
    начало_брони: '',
    окончание_брони: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsData, officesData] = await Promise.all([
        api.getBookings(),
        api.getOffices()
      ]);
      setBookings(bookingsData);
      setOffices(officesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking(formData);
      setShowModal(false);
      setFormData({ id_офиса: '', начало_брони: '', окончание_брони: '' });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Отменить бронь?')) return;
    try {
      await api.deleteBooking(id);
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Брони</h2>
        {(user?.role === 'admin' || user?.role === 'tenant') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Забронировать офис
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Офис</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Начало</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Окончание</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id_брони}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {offices.find(o => o.id_офиса === booking.id_офиса)?.адрес || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(booking.начало_брони).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(booking.окончание_брони).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-6 py-4 text-sm">
                  {(user?.role === 'admin' || user?.role === 'tenant') && (
                    <button
                      onClick={() => handleDelete(booking.id_брони)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Забронировать офис</h3>
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
                  {offices.filter(o => o.статус === 'свободен').map((office) => (
                    <option key={office.id_офиса} value={office.id_офиса}>
                      {office.адрес} - {office.стоимость_аренды.toLocaleString()} ₽/мес
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const data = await api.getContracts();
      setContracts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Договоры</h2>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <div key={contract.id_договора} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-800">Договор №{contract.id_договора}</h3>
                <p className="text-sm text-gray-600 mt-1">ID офиса: {contract.id_офиса}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                contract.статус === 'активен' ? 'bg-green-100 text-green-700' : 
                contract.статус === 'завершён' ? 'bg-gray-100 text-gray-700' : 
                'bg-red-100 text-red-700'
              }`}>
                {contract.статус}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Дата начала:</p>
                <p className="font-medium">{new Date(contract.дата_начала).toLocaleDateString('ru-RU')}</p>
              </div>
              <div>
                <p className="text-gray-600">Дата окончания:</p>
                <p className="font-medium">{new Date(contract.дата_окончания).toLocaleDateString('ru-RU')}</p>
              </div>
              <div>
                <p className="text-gray-600">Стоимость:</p>
                <p className="font-medium text-indigo-600">{contract.стоимость.toLocaleString()} ₽</p>
              </div>
              <div>
                <p className="text-gray-600">Залог:</p>
                <p className="font-medium">{contract.залог.toLocaleString()} ₽</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Payments Tab
const PaymentsTab = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id_договора: '',
    сумма: '',
    дата_платежа: '',
    статус: 'не оплачен'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsData, contractsData] = await Promise.all([
        api.getPayments(),
        api.getContracts()
      ]);
      setPayments(paymentsData);
      setContracts(contractsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createPayment(formData);
      setShowModal(false);
      setFormData({ id_договора: '', сумма: '', дата_платежа: '', статус: 'не оплачен' });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const checkOverdue = async () => {
    try {
      const result = await api.checkOverduePayments();
      alert(result.detail);
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Платежи</h2>
        <div className="flex gap-2">
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <button
              onClick={checkOverdue}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              <AlertCircle className="w-5 h-5" />
              Проверить просрочку
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'tenant') && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              Добавить платеж
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Договора</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id_платежа}>
                <td className="px-6 py-4 text-sm text-gray-900">№{payment.id_договора}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {payment.сумма.toLocaleString()} ₽
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(payment.дата_платежа).toLocaleDateString('ru-RU')}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый платеж</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Договор</label>
                <select
                  value={formData.id_договора}
                  onChange={(e) => setFormData({ ...formData, id_договора: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Выберите договор</option>
                  {contracts.map((contract) => (
                    <option key={contract.id_договора} value={contract.id_договора}>
                      Договор №{contract.id_договора} - {contract.стоимость.toLocaleString()} ₽
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                <input
                  type="number"
                  value={formData.сумма}
                  onChange={(e) => setFormData({ ...formData, сумма: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата платежа</label>
                <input
                  type="date"
                  value={formData.дата_платежа}
                  onChange={(e) => setFormData({ ...formData, дата_платежа: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={formData.статус}
                  onChange={(e) => setFormData({ ...formData, статус: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="не оплачен">Не оплачен</option>
                  <option value="оплачен">Оплачен</option>
                  <option value="просрочен">Просрочен</option>
                </select>
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

// Requests Tab
const RequestsTab = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id_договора: '',
    тип_заявки: '',
    описание: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsData, contractsData] = await Promise.all([
        api.getRequests(),
        api.getContracts()
      ]);
      setRequests(requestsData);
      setContracts(contractsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createRequest(formData);
      setShowModal(false);
      setFormData({ id_договора: '', тип_заявки: '', описание: '' });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.updateRequest(id, { статус: newStatus });
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить заявку?')) return;
    try {
      await api.deleteRequest(id);
      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Заявки</h2>
        {(user?.role === 'admin' || user?.role === 'tenant') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Создать заявку
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <div key={request.id_заявки} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-800">{request.тип_заявки}</h3>
                <p className="text-sm text-gray-600 mt-1">Договор №{request.id_договора}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                request.статус === 'новая' ? 'bg-blue-100 text-blue-700' : 
                request.статус === 'в работе' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {request.статус}
              </span>
            </div>
            <p className="text-gray-700 mb-4">{request.описание}</p>
            <p className="text-sm text-gray-500 mb-4">
              Создана: {new Date(request.дата_создания).toLocaleDateString('ru-RU')}
            </p>
            <div className="flex gap-2">
              {user?.role === 'staff' && request.статус !== 'выполнена' && (
                <button
                  onClick={() => updateStatus(request.id_заявки, request.статус === 'новая' ? 'в работе' : 'выполнена')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  {request.статус === 'новая' ? 'Взять в работу' : 'Завершить'}
                </button>
              )}
              {(user?.role === 'admin' || user?.role === 'tenant') && (
                <button
                  onClick={() => handleDelete(request.id_заявки)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новая заявка</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Договор</label>
                <select
                  value={formData.id_договора}
                  onChange={(e) => setFormData({ ...formData, id_договора: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Выберите договор</option>
                  {contracts.map((contract) => (
                    <option key={contract.id_договора} value={contract.id_договора}>
                      Договор №{contract.id_договора}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип заявки</label>
                <input
                  type="text"
                  value={formData.тип_заявки}
                  onChange={(e) => setFormData({ ...formData, тип_заявки: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Например: Ремонт, Уборка"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={formData.описание}
                  onChange={(e) => setFormData({ ...formData, описание: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder="Опишите проблему подробно"
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

// Tenants Tab
const TenantsTab = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await api.getTenants();
      setTenants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Арендаторы</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tenants.map((tenant) => (
          <div key={tenant.id_арендатора} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="font-semibold text-lg text-gray-800 mb-3">{tenant.название_компании}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Контактное лицо:</span> {tenant.контактное_лицо}</p>
              <p><span className="font-medium">Телефон:</span> {tenant.телефон}</p>
              {tenant.email && <p><span className="font-medium">Email:</span> {tenant.email}</p>}
            </div>
          </div>
        ))}
      </div>
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