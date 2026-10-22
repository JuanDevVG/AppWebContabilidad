# React Login Setup for Django JWT API

Este archivo explica los pasos necesarios en el frontend con React para que funcione el login con el backend Django configurado con JWT.

## 1. Instalar dependencias

En el proyecto React instala `axios`:

```bash
npm install axios
# o
yarn add axios
```

## 2. Configurar URL base de la API

Crea un archivo de configuración de entorno en React, por ejemplo `.env` o `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Asegúrate de reiniciar el servidor de React después de cambiar el `.env`.

## 3. Crear cliente Axios

Crea un archivo `src/utils/apiClient.js` o similar:

```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // opcional si usas cookies, pero para JWT no es estrictamente necesario
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

## 4. Crear el formulario de login

Ejemplo de componente `src/components/LoginForm.jsx`:

```javascript
import { useState } from 'react';
import apiClient from '../utils/apiClient';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await apiClient.post('/api/login/', {
        email,
        password,
      });

      const { access_token, refresh_token, user } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      if (onLogin) {
        onLogin(user);
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Error en el login';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit">Ingresar</button>
    </form>
  );
}

export default LoginForm;
```

## 5. Usar el token en peticiones protegidas

En cualquier componente o hook usa `apiClient` para pedir datos protegidos:

```javascript
const response = await apiClient.get('/api/usuarios/');
```

El interceptor añade automáticamente el header:

```http
Authorization: Bearer <access_token>
```

## 6. Refrescar token (opcional)

Si quieres refrescar el token, usa la ruta del backend:

```javascript
const refreshToken = localStorage.getItem('refresh_token');
const response = await apiClient.post('/api/token/refresh/', {
  refresh: refreshToken,
});
localStorage.setItem('access_token', response.data.access);
```

> En este backend Django la ruta `token/refresh/` está registrada en `apps/usuarios/urls.py`.

## 7. Manejar logout

Para cerrar sesión elimina los tokens y el usuario:

```javascript
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('user');
```

## 8. Recomendaciones de seguridad

- No almacenes la contraseña en el frontend.
- Guarda solo tokens y datos necesarios.
- Para producción considera `httpOnly cookies` o un almacenamiento más seguro.
- Asegúrate de usar HTTPS en el frontend y backend cuando sea necesario.

## 9. Validar rutas protegidas

Puedes usar un contexto o un estado global para saber si el usuario está autenticado y redirigir a login cuando no haya token.

Ejemplo rápido con React Router:

```javascript
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
}
```

## 10. Resumen de URLs del backend

- `POST /api/login/` -> login con `email` y `password`
- `POST /api/token/refresh/` -> refrescar `access_token`
- Peticiones protegidas deben usar header `Authorization: Bearer <access_token>`
