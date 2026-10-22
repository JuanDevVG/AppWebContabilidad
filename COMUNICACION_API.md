# Guía de Comunicación Frontend-Backend

## 📋 Resumen de cambios

1. **Login.jsx actualizado** - Comunica con Django para validar credenciales
2. **apiService.js** - Servicio reutilizable para todas las peticiones API
3. **.env.local** - Configuración de URL del backend
4. **DJANGO_CONFIG.md** - Guía completa para configurar Django

## 🚀 Flujo de Login

```
Usuario ingresa email/password
         ↓
Login.jsx hace petición POST a /api/login/
         ↓
Django valida credenciales
         ↓
Backend retorna access_token + user info
         ↓
Frontend guarda token en localStorage
         ↓
Token incluido en headers de futuras peticiones
         ↓
Si token expira (401), redirige a login
```

## 💻 Usar en otros componentes

### Ejemplo 1: Obtener datos protegidos

```javascript
import { useEffect, useState } from 'react';
import { getData } from '../utils/apiService';

export function ControlInversiones() {
  const [inversiones, setInversiones] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getData('/api/inversiones/');
        setInversiones(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      {inversiones.map(inv => (
        <div key={inv.id}>{inv.nombre}</div>
      ))}
    </div>
  );
}
```

### Ejemplo 2: Crear inversión

```javascript
import { createData } from '../utils/apiService';

async function handleCreateInversion(formData) {
  try {
    const response = await createData('/api/inversiones/', {
      nombre: formData.nombre,
      monto: formData.monto,
      fecha: formData.fecha,
    });
    console.log('Inversión creada:', response);
    // Recargar lista o actualizar estado
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Ejemplo 3: Actualizar datos

```javascript
import { updateData } from '../utils/apiService';

async function handleUpdateInversion(id, updatedData) {
  try {
    const response = await updateData(`/api/inversiones/${id}/`, updatedData);
    console.log('Actualizado:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Ejemplo 4: Eliminar datos

```javascript
import { deleteData } from '../utils/apiService';

async function handleDeleteInversion(id) {
  try {
    await deleteData(`/api/inversiones/${id}/`);
    console.log('Eliminado correctamente');
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Ejemplo 5: Cerrar sesión

```javascript
import { logout } from '../utils/apiService';

function handleLogout() {
  logout();
  window.location.href = '/login';
}
```

## 🔐 Rutas protegidas

Usa `ProtectedRoute` para proteger componentes que requieren autenticación:

```javascript
import ProtectedRoute from './utils/ProtectedRoute';
import Dashboard from './Componentes/Dashboard';

<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

## ⚙️ Configuración necesaria

### En .env.local
```
VITE_API_BASE_URL=http://localhost:8000
```

### En Django (ver DJANGO_CONFIG.md)
- Instalar `django-cors-headers`
- Configurar CORS
- Crear endpoint `/api/login/`
- Usar JWT para tokens

## 🐛 Debugging

### Ver token guardado
```javascript
console.log(localStorage.getItem('access_token'));
```

### Verificar usuario autenticado
```javascript
import { isAuthenticated, getCurrentUser } from './utils/apiService';
console.log(isAuthenticated()); // true/false
console.log(getCurrentUser()); // datos del usuario
```

### Ver errores en Network
1. Abre DevTools (F12)
2. Ve a la pestaña Network
3. Busca la petición a `/api/login/`
4. Verifica la respuesta y headers

## 📞 Endpoints esperados en Django

| Método | URL | Descripción |
|--------|-----|------------|
| POST | `/api/login/` | Validar credenciales |
| GET | `/api/inversiones/` | Listar inversiones |
| POST | `/api/inversiones/` | Crear inversión |
| PUT | `/api/inversiones/{id}/` | Actualizar inversión |
| DELETE | `/api/inversiones/{id}/` | Eliminar inversión |

## 🔑 Headers automáticos

El servicio apiService.js automáticamente agrega:
- `Content-Type: application/json`
- `Authorization: Bearer {token}` (si está guardado)
- `credentials: include` (para cookies)

## ❌ Errores comunes

### Error: "Credenciales inválidas"
- ✅ Verifica que el usuario existe en Django
- ✅ Usa el email correcto registrado en la BD

### Error: CORS error
- ✅ Verifica CORS_ALLOWED_ORIGINS en Django settings
- ✅ Incluye http://localhost:5173 (o tu puerto)

### Error: Token inválido (401)
- ✅ Se limpian datos automáticamente
- ✅ Se redirige a login
- ✅ Regenera nuevo token

## 📚 Recursos útiles

- [Django REST Framework](https://www.django-rest-framework.org/)
- [Django CORS Headers](https://pypi.org/project/django-cors-headers/)
- [JWT Simple Django](https://pypi.org/project/djangorestframework-simplejwt/)
- [Fetch API MDN](https://developer.mozilla.org/es/docs/Web/API/Fetch_API)
