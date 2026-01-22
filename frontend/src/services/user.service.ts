/**
 * VARO POS - Servicio de Usuarios
 */

import api from './api';

export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    isActive: boolean;
    roleId: string;
    role?: {
        id: string;
        name: string;
        description?: string;
    };
    branchId?: string;
    branch?: {
        id: string;
        name: string;
        code: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystem: boolean;
}

export interface CreateUserDTO {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    roleId: string;
    branchId?: string;
}

export interface UpdateUserDTO {
    username?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    roleId?: string;
    branchId?: string;
    isActive?: boolean;
}

const userService = {
    async getAll(): Promise<User[]> {
        const response = await api.get('/users');
        return response.data.data;
    },

    async getById(id: string): Promise<User> {
        const response = await api.get(`/users/${id}`);
        return response.data.data;
    },

    async create(data: CreateUserDTO): Promise<User> {
        const response = await api.post('/users', data);
        return response.data.data;
    },

    async update(id: string, data: UpdateUserDTO): Promise<User> {
        const response = await api.put(`/users/${id}`, data);
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/users/${id}`);
    },

    async getRoles(): Promise<Role[]> {
        const response = await api.get('/users/roles');
        return response.data.data;
    },

    async uploadAvatar(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('avatar', file);

        // Por ahora convertimos a base64
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
        });
    }
};

export default userService;
