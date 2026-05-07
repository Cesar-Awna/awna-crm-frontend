# 📖 Guía de Paginación

## Uso Básico

### 1. En un componente, importar el hook:

```jsx
import { usePagination } from '../hooks/usePagination.js';
import PaginationControls from '../components/PaginationControls.jsx';
```

### 2. Inicializar paginación:

```jsx
const pagination = usePagination(1, 20); // página inicial, límite
// pagination.currentPage, pagination.limit, pagination.totalPages, etc.
```

### 3. Cargar datos con paginación:

```jsx
useEffect(() => {
  const loadData = async () => {
    try {
      const res = await UsersService.getAll({
        page: pagination.currentPage,
        limit: pagination.limit,
        sort: '-createdAt',
      });
      
      if (res?.success) {
        setUsers(res.data);
        pagination.updatePaginationData(res.pagination);
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };
  
  loadData();
}, [pagination.currentPage, pagination.limit]);
```

### 4. Renderizar controles:

```jsx
<PaginationControls
  currentPage={pagination.currentPage}
  totalPages={pagination.totalPages}
  limit={pagination.limit}
  totalDocs={pagination.totalDocs}
  hasNextPage={pagination.hasNextPage}
  hasPrevPage={pagination.hasPrevPage}
  onPageChange={pagination.goToPage}
  onLimitChange={pagination.changeLimit}
/>
```

---

## Parámetros de Query

| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| `page` | number | Página (1-based) | 1 |
| `limit` | number | Items por página (1-100) | 20 |
| `sort` | string | Campo y orden (ej: `-createdAt`, `name`) | `-createdAt` |

### Ejemplos:

```javascript
// Página 1, 50 items
{ page: 1, limit: 50 }

// Página 3, ordenado por nombre ascendente
{ page: 3, sort: 'name' }

// Página 2, ordenado por fecha descendente
{ page: 2, sort: '-createdAt' }
```

---

## Estructura de Respuesta

```javascript
{
  success: true,
  message: "Users retrieved successfully",
  data: [...],
  pagination: {
    currentPage: 1,
    totalPages: 5,
    totalDocs: 95,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false
  }
}
```

---

## Validaciones Backend

- `page < 1` → resetea a 1
- `limit < 1` → resetea a 20
- `limit > 100` → limita a 100
- `sort` por defecto: `-createdAt`

---

## Métodos del Hook

```javascript
const pagination = usePagination();

// Navegar
pagination.goToPage(3);           // Ir a página 3
pagination.goToNextPage();        // Siguiente
pagination.goToPrevPage();        // Anterior

// Cambiar límite
pagination.changeLimit(50);       // 50 items por página

// Actualizar datos (desde response API)
pagination.updatePaginationData(res.pagination);

// Reset
pagination.reset();               // Resetea todo a inicial
```

---

## Ejemplo Completo (Users.jsx)

```jsx
import { usePagination } from '../hooks/usePagination.js';
import PaginationControls from '../components/PaginationControls.jsx';
import UsersService from '../services/Users.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(1, 20);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await UsersService.getAll({
          page: pagination.currentPage,
          limit: pagination.limit,
        });
        
        if (res?.success) {
          setUsers(res.data);
          pagination.updatePaginationData(res.pagination);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [pagination.currentPage, pagination.limit]);

  return (
    <div>
      <table>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>{/* ... */}</tr>
          ))}
        </tbody>
      </table>

      <PaginationControls
        {...pagination}
        onPageChange={pagination.goToPage}
        onLimitChange={pagination.changeLimit}
      />
    </div>
  );
}
```

---

## Dónde Implementar Paginación

- ✅ `Users.jsx` — Listado de usuarios
- ✅ `Companies.jsx` — Listado de empresas
- ✅ `Leads.jsx` (admin) — Listado de leads
- ✅ Cualquier listado con 20+ items

---

## API Query String

```
GET /api/users?page=2&limit=50&sort=-createdAt
GET /api/companies?status=ACTIVE&page=1&limit=20
GET /api/leads?businessUnitId=xxx&page=1&limit=30&sort=name
```
