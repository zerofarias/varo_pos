# VARO POS - Backend

Sistema de Punto de Venta Multi-Sucursal con arquitectura Offline-First.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- MySQL 8+
- Base de datos `varopos` creada

### Instalación

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:push

# Poblar base de datos con datos iniciales
npm run prisma:seed

# Iniciar servidor de desarrollo
npm run dev
```

### Credenciales de Acceso

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| vendedor | vendedor123 | Vendedor |

## 📚 Documentación API

Una vez iniciado el servidor, accede a:
- **Swagger UI**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/api/health

## 🏗️ Estructura del Proyecto

```
backend/
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   └── seed.js          # Datos iniciales
├── src/
│   ├── config/
│   │   ├── database.js  # Cliente Prisma
│   │   └── swagger.js   # Configuración Swagger
│   ├── controllers/     # Lógica de controladores
│   ├── routes/          # Definición de rutas + docs
│   ├── middlewares/     # Auth, validación, etc.
│   ├── services/        # Lógica de negocio
│   └── index.js         # Servidor Express
├── .env                 # Variables de entorno
└── package.json
```

## 🔑 Variables de Entorno

```env
DATABASE_URL="mysql://root:@localhost:3306/varopos"
PORT=3001
NODE_ENV=development
JWT_SECRET=tu_secret_key
JWT_EXPIRES_IN=7d
```

## 📋 Endpoints Principales

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

### Products
- `GET /api/products` - Listar productos
- `GET /api/products/barcode/:barcode` - Buscar por código de barras
- `POST /api/products` - Crear producto

### Sales
- `POST /api/sales` - Crear venta
- `GET /api/sales` - Listar ventas
- `POST /api/sales/:id/cancel` - Cancelar venta

### Customers
- `GET /api/customers` - Listar clientes
- `POST /api/customers/:id/payment` - Registrar pago

### Sync
- `GET /api/sync/catalog` - Descargar catálogo
- `POST /api/sync/upload-sales` - Subir ventas

## 🔄 Arquitectura de Sincronización

```
┌─────────────────┐         ┌─────────────────┐
│   PC MAESTRA    │◄───────►│   VPN / LAN     │
│   (Central)     │         └────────┬────────┘
│                 │                  │
│  - Productos    │         ┌────────┴────────┐
│  - Precios      │         │                 │
│  - Usuarios     │    ┌────┴────┐       ┌────┴────┐
└─────────────────┘    │ SUC. A  │       │ SUC. B  │
                       │ (Local) │       │ (Local) │
                       └─────────┘       └─────────┘
```

- **Push (Maestro → Sucursales)**: Precios, productos, usuarios
- **Pull (Sucursales → Maestro)**: Ventas, movimientos

## 📄 Licencia

MIT
