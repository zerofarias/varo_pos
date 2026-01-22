/**
 * VARO POS - Página de Gestión de Usuarios
 * Diseño responsive con cards premium
 */

import { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Edit, Trash2, Shield, Mail, Phone,
    Image as ImageIcon, X, Save, Eye, EyeOff, Camera, Check
} from 'lucide-react';
import userService, { User, Role, CreateUserDTO, UpdateUserDTO } from '@/services/user.service';

export const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string>('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: '',
        avatar: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAll(),
                userService.getRoles()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                password: '',
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone || '',
                roleId: user.roleId,
                avatar: user.avatar || ''
            });
            setAvatarPreview(user.avatar || '');
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                phone: '',
                roleId: roles[0]?.id || '',
                avatar: ''
            });
            setAvatarPreview('');
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (!formData.username || !formData.email || !formData.firstName || !formData.lastName || !formData.roleId) {
                alert('Por favor completa todos los campos obligatorios');
                return;
            }

            if (!editingUser && !formData.password) {
                alert('La contraseña es obligatoria para usuarios nuevos');
                return;
            }

            const data: any = {
                ...formData,
                avatar: avatarPreview || null
            };

            if (!data.password) {
                delete data.password;
            }

            if (editingUser) {
                await userService.update(editingUser.id, data);
            } else {
                await userService.create(data as CreateUserDTO);
            }

            setShowModal(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Error al guardar usuario');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
        try {
            await userService.delete(id);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar usuario');
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            await userService.update(user.id, { isActive: !user.isActive });
            loadData();
        } catch (error) {
            console.error(error);
            alert('Error al cambiar estado');
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('La imagen no debe superar 2MB');
                return;
            }
            const base64 = await userService.uploadAvatar(file);
            setAvatarPreview(base64);
        }
    };

    const filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const getRoleColor = (roleName: string) => {
        const colors: Record<string, string> = {
            'Admin': 'bg-purple-100 text-purple-700 border-purple-200',
            'Vendedor': 'bg-blue-100 text-blue-700 border-blue-200',
            'Cajero': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Gerente': 'bg-amber-100 text-amber-700 border-amber-200'
        };
        return colors[roleName] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <Users className="text-indigo-600" size={32} />
                                </div>
                                Gestión de Usuarios
                            </h1>
                            <p className="text-slate-500 mt-2">Administra los usuarios y permisos del sistema</p>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 justify-center"
                        >
                            <Plus size={20} />
                            Nuevo Usuario
                        </button>
                    </div>

                    {/* Search */}
                    <div className="mt-6 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, usuario o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                        />
                    </div>
                </div>

                {/* Users Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-slate-500">Cargando usuarios...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <Users className="mx-auto text-slate-300 mb-4" size={64} />
                        <h3 className="text-xl font-semibold text-slate-600 mb-2">No hay usuarios</h3>
                        <p className="text-slate-400">
                            {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'Comienza creando tu primer usuario'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300 group"
                            >
                                {/* Card Header with Avatar */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 relative">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.firstName}
                                                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white shadow-lg flex items-center justify-center">
                                                    <span className="text-2xl font-bold text-white">
                                                        {getInitials(user.firstName, user.lastName)}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xl font-bold text-white">
                                                    {user.firstName} {user.lastName}
                                                </h3>
                                                <p className="text-white/80 text-sm">@{user.username}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${user.isActive
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {user.isActive ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6 space-y-4">
                                    {/* Role Badge */}
                                    <div className="flex items-center gap-2">
                                        <Shield size={16} className="text-slate-400" />
                                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getRoleColor(user.role?.name || '')}`}>
                                            {user.role?.name || 'Sin rol'}
                                        </span>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail size={16} className="text-slate-400" />
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                        {user.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone size={16} className="text-slate-400" />
                                                <span>{user.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Branch */}
                                    {user.branch && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <p className="text-xs text-slate-500">Sucursal</p>
                                            <p className="text-sm font-semibold text-slate-700">{user.branch.name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer - Actions */}
                                <div className="bg-slate-50 px-6 py-4 flex gap-2 border-t border-slate-100">
                                    <button
                                        onClick={() => openModal(user)}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit size={16} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm">Total Usuarios</p>
                        <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm">Activos</p>
                        <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.isActive).length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm">Inactivos</p>
                        <p className="text-2xl font-bold text-slate-400">{users.filter(u => !u.isActive).length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm">Roles</p>
                        <p className="text-2xl font-bold text-indigo-600">{roles.length}</p>
                    </div>
                </div>
            </div>

            {/* Modal de Crear/Editar Usuario */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Users size={24} />
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="text-white" size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-200">
                                <div className="relative">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-4 border-indigo-100">
                                            <ImageIcon className="text-indigo-400" size={32} />
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                                        <Camera className="text-white" size={16} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <p className="text-sm text-slate-500">Click para subir foto (max 2MB)</p>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Juan"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Apellido *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Usuario *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                        placeholder="jperez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="juan@ejemplo.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="+54 11 1234-5678"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Rol *
                                    </label>
                                    <select
                                        value={formData.roleId}
                                        onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Seleccionar rol...</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Contraseña {editingUser ? '(dejar vacío para mantener)' : '*'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder={editingUser ? 'Nueva contraseña' : 'Contraseña'}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-200">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center gap-2 shadow-lg"
                            >
                                <Save size={18} />
                                {editingUser ? 'Actualizar' : 'Crear Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
