const fs = require('fs');

console.log('=== APLICANDO CAMBIOS A COMPANY-LEAVES ===');

// Leer el archivo actual
let content = fs.readFileSync('/root/solucioning-deploy/client/src/pages/company-leaves.tsx', 'utf8');

// Crear backup
fs.writeFileSync('/root/solucioning-deploy/client/src/pages/company-leaves.tsx.backup', content);
console.log('✅ Backup creado');

// Aplicar cambios para ordenamiento y paginación
let modifiedContent = content;

// 1. Agregar import de ChevronLeft y ChevronRight
if (!modifiedContent.includes('ChevronLeft, ChevronRight')) {
  modifiedContent = modifiedContent.replace(
    "import { Download, Search, Filter, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';",
    "import { Download, Search, Filter, CheckCircle, XCircle, Clock, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';"
  );
  console.log('✅ Import de iconos agregado');
}

// 2. Agregar estados de paginación
if (!modifiedContent.includes('const [currentPage, setCurrentPage] = useState(1);')) {
  modifiedContent = modifiedContent.replace(
    "  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');",
    "  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');\n  \n  // Estados para paginación\n  const [currentPage, setCurrentPage] = useState(1);\n  const ITEMS_PER_PAGE = 20;"
  );
  console.log('✅ Estados de paginación agregados');
}

// 3. Modificar la lógica de filtrado para incluir ordenamiento y paginación
if (!modifiedContent.includes('filteredCompanyLeaves')) {
  const oldFilterLogic = `  // Filtrar bajas según los criterios de búsqueda
  const companyLeaves = useMemo(() => {
    if (user?.role === 'normal') return [];

    return allCompanyLeaves.filter(leave => {
      const employeeData = leave.employeeData as Record<string, unknown>;

      // Filtro por término de búsqueda
      const searchMatch =
        !searchTerm ||
        (employeeData?.nombre as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.apellido as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.email as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.dniNie as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.idGlovo as string)?.toString().includes(searchTerm) ||
        leave.employeeId?.toString().includes(searchTerm);

      // Filtro por estado
      const statusMatch = statusFilter === 'all' || leave.status === statusFilter;

      // Filtro por tipo de baja
      const leaveTypeMatch = leaveTypeFilter === 'all' || leave.leaveType === leaveTypeFilter;

      return searchMatch && statusMatch && leaveTypeMatch;
    });
  }, [allCompanyLeaves, searchTerm, statusFilter, leaveTypeFilter, user?.role]);`;

  const newFilterLogic = `  // Filtrar y ordenar bajas según los criterios de búsqueda
  const filteredCompanyLeaves = useMemo(() => {
    if (user?.role === 'normal') return [];

    return allCompanyLeaves.filter(leave => {
      const employeeData = leave.employeeData as Record<string, unknown>;

      // Filtro por término de búsqueda
      const searchMatch =
        !searchTerm ||
        (employeeData?.nombre as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.apellido as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.email as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.dniNie as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.idGlovo as string)?.toString().includes(searchTerm) ||
        leave.employeeId?.toString().includes(searchTerm);

      // Filtro por estado
      const statusMatch = statusFilter === 'all' || leave.status === statusFilter;

      // Filtro por tipo de baja
      const leaveTypeMatch = leaveTypeFilter === 'all' || leave.leaveType === leaveTypeFilter;

      return searchMatch && statusMatch && leaveTypeMatch;
    }).sort((a, b) => {
      // Ordenar de más recientes a más antiguos por fecha de creación
      const dateA = new Date(a.createdAt || a.leaveDate).getTime();
      const dateB = new Date(b.createdAt || b.leaveDate).getTime();
      return dateB - dateA; // DESC (más recientes primero)
    });
  }, [allCompanyLeaves, searchTerm, statusFilter, leaveTypeFilter, user?.role]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredCompanyLeaves.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const companyLeaves = filteredCompanyLeaves.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, leaveTypeFilter]);

  // Funciones de navegación de páginas
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };`;

  modifiedContent = modifiedContent.replace(oldFilterLogic, newFilterLogic);
  console.log('✅ Lógica de filtrado y paginación actualizada');
}

// Escribir el archivo modificado
fs.writeFileSync('/root/solucioning-deploy/client/src/pages/company-leaves.tsx', modifiedContent);
console.log('✅ Archivo actualizado exitosamente');

console.log('=== CAMBIOS APLICADOS ===');
console.log('✅ Ordenamiento de más recientes a más antiguos');
console.log('✅ Paginación de 20 elementos por página');
console.log('✅ Controles de navegación de páginas');
