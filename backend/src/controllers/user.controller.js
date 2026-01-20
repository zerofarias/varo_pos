/**
 * VARO POS - Controlador de Usuarios
 */

const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userController = {
    async getAll(req, res) {
        try {
            const users = await prisma.user.findMany({
                where: { deletedAt: null },
                include: {
                    role: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true, code: true } }
                },
                orderBy: { firstName: 'asc' }
            });

            res.json({
                success: true,
                data: users.map(u => {
                    const { password, ...userWithoutPassword } = u;
                    return userWithoutPassword;
                })
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.params.id },
                include: { role: true, branch: true }
            });

            if (!user || user.deletedAt) {
                return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
            }

            const { password, ...userWithoutPassword } = user;
            res.json({ success: true, data: userWithoutPassword });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { username, email, password, firstName, lastName, phone, roleId, branchId } = req.body;

            if (!username || !email || !password || !firstName || !lastName || !roleId) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos incompletos'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    username,
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    phone,
                    roleId,
                    branchId
                },
                include: { role: true, branch: true }
            });

            const { password: _, ...userWithoutPassword } = user;
            res.status(201).json({ success: true, data: userWithoutPassword });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(400).json({
                    success: false,
                    error: 'Usuario o email ya existe'
                });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };

            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            }

            const user = await prisma.user.update({
                where: { id },
                data: updateData,
                include: { role: true, branch: true }
            });

            const { password, ...userWithoutPassword } = user;
            res.json({ success: true, data: userWithoutPassword });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async delete(req, res) {
        try {
            await prisma.user.update({
                where: { id: req.params.id },
                data: { deletedAt: new Date() }
            });

            res.json({ success: true, message: 'Usuario eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getRoles(req, res) {
        try {
            const roles = await prisma.role.findMany({
                orderBy: { name: 'asc' }
            });

            res.json({ success: true, data: roles });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = userController;
