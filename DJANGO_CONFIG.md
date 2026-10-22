# Configuración de Django para comunicarse con React

## 1. Instalar django-cors-headers

```bash
pip install django-cors-headers
```

## 2. Configurar settings.py

```python
# settings.py

INSTALLED_APPS = [
    # ...
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Debe ir al principio
    'django.middleware.common.CommonMiddleware',
    # ... resto de middleware
]

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Puerto por defecto de Vite
    "http://localhost:3000",  # Si usas otro puerto
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ALGORITHM': 'HS256',
}
```

## 3. Crear vista de Login

```python
# views.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        # Buscar usuario por email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Validar contraseña
        user = authenticate(username=user.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_200_OK)
```

## 4. Registrar URL en Django

```python
# urls.py
from django.urls import path
from .views import LoginView

urlpatterns = [
    # ...
    path('api/login/', LoginView.as_view(), name='login'),
]
```

## 5. Headers que React enviará

La petición desde React incluirá estos headers:
- `Content-Type: application/json`
- El token JWT en futuras peticiones debe ir en el header:
  ```
  Authorization: Bearer {access_token}
  ```

## Crear Interceptor en React (Opcional pero recomendado)

En `src/utils/axiosConfig.js` o similar:

```javascript
import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// Agregar token a todas las peticiones
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;
```

## Usar en componentes:

```javascript
import apiClient from '../utils/axiosConfig';

// GET con token
const response = await apiClient.get('/api/datos/');

// POST con token
await apiClient.post('/api/crear/', { data });
```

## Troubleshooting

### Error CORS
- Verifica que `CORS_ALLOWED_ORIGINS` incluya la URL de tu frontend
- Asegúrate que `corsheaders` está en INSTALLED_APPS y MIDDLEWARE

### Token inválido
- Usa el token del `access_token`, no del `refresh_token`
- El header debe ser: `Authorization: Bearer <token>`

### Credenciales inválidas
- Verifica que el usuario existe en Django
- Usa `python manage.py createsuperuser` para crear un usuario de prueba
