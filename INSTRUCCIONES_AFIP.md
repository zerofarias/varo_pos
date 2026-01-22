# Integración ARCA / AFIP - Instrucciones de Activación

Has solicitado la integración URGENTE con ARCA (AFIP). El sistema ya está preparado en el Backend.

Sigue estos pasos para activarlo:

## 1. Instalación de Dependencias
En la carpeta `backend`, ejecuta:
```bash
npm install @afipsdk/afip.js
```

## 2. Actualización de Base de Datos
Debes aplicar los cambios del esquema (nuevos campos `afip_cae`, `afip_qr`, etc.) ejecutando en `backend`:
```bash
npx prisma migrate dev --name add_afip_fields
```

## 3. Configuración de Certificados
Necesitas obtener tu certificado `.crt` y clave `.key` desde el sitio de AFIP (Relación de confianza para WSFE).

Una vez los tengas, puedes configurarlos mediante la API (o futura interfaz) enviando un POST a `/api/afip/config` con:
```json
{
  "cuit": "20123456789",
  "salesPoint": 1,
  "production": false, 
  "cert": "-----BEGIN CERTIFICATE-----...",
  "key": "-----BEGIN PRIVATE KEY-----..."
}
```
*Nota: `production: false` usa el entorno de homologación.*

## 4. Emitir Factura desde POS
Al crear una venta, el frontend debe enviar en el cuerpo del POST:
```json
{
  "isFiscal": true,
  "invoiceType": "B", // (A, B o C)
  ... resto de datos
}
```

El sistema intentará autorizar la factura. Si tiene éxito, la respuesta incluirá `cae` y `fiscalNumber`. Si falla, la venta se guarda igual pero con `afipStatus: REJECTED` y el motivo en `afipError`.

## 5. Visualización
El Backend devolverá el objeto `sale` actualizado con:
- `fiscalNumber`: Número de comprobante (ej. 0001-00001234)
- `cae`: Código de autorización.
- `caeExpiration`: Vencimiento del CAE.

¡Listo para facturar!
