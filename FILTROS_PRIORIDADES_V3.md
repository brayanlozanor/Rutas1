# Filtros y colores de prioridades V3

Cambios:
- Filtro de órdenes por tipo: Comunidad, Torre, Troncal y Punto de venta.
- Filtro de órdenes por zona usando el catálogo REGS actual.
- Prioridades con colores consistentes: Muy alta rojo, Alta naranja, Media amarillo, Baja verde.
- Colores aplicados también a detalles visibles en planificación y ruta del técnico.
- No requiere cambios de esquema ni reimportación D1.

Despliegue:

```powershell
npx.cmd wrangler deploy
```

Después recargar con Ctrl + F5.
