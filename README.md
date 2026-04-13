# Huellas
Optimización del flujo editorial y desarrollo de una plataforma web para el seguimiento de los artículos científicos en la Revista Huellas.

## Seguridad de credenciales

- Nunca versionar secretos reales en el repositorio. Usa archivos `.env` locales (ya ignorados por Git) y conserva en el repo solo `.env.example` con placeholders.
- Si una credencial fue expuesta, rótala inmediatamente en su proveedor:
	- Firebase service account: regenerar llave privada y revocar la anterior.
	- SMTP: cambiar contraseña o app password.
	- Base de datos: rotar contraseña del usuario de conexión.
- Después de rotar, actualiza únicamente los valores locales y variables de despliegue (CI/CD, contenedor o gestor de secretos).
- En producción, inyecta secretos desde variables de entorno del entorno de ejecución o un gestor de secretos (por ejemplo: Azure Key Vault, AWS Secrets Manager, GCP Secret Manager).
