// Endpoint para obtener empleados reactivados desde bajas empresa
app.get('/api/employees/reactivated-from-leaves', isAuthenticated, async (req: any, res) => {
  if (process.env.NODE_ENV !== 'production') console.log(' Getting reactivated employees from leaves');
  try {
    const user = req.user as { email?: string; role?: string };
    
    if (user?.role === 'normal') {
      return res.status(403).json({ message: 'No tienes permisos para ver esta información' });
    }

    // Obtener empleados que fueron reactivados desde company_leaves
    const reactivatedEmployees = await storage.getReactivatedEmployeesFromLeaves();
    
    res.json({ reactivatedEmployees });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(' Error getting reactivated employees:', error);
    res.status(500).json({ message: 'Failed to get reactivated employees' });
  }
});

// Endpoint para reactivar empleado desde baja empresa
app.post('/api/employees/:id/reactivate', isAuthenticated, async (req: any, res) => {
  if (process.env.NODE_ENV !== 'production') console.log(' Reactivating employee from company leave');
  try {
    const user = req.user as { email?: string; role?: string };
    
    if (user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Solo los super administradores pueden reactivar empleados' });
    }

    const { id } = req.params;
    
    // Reactivar empleado desde company_leaves
    const reactivatedEmployee = await storage.reactivateEmployeeFromLeave(id);
    
    if (!reactivatedEmployee) {
      return res.status(404).json({ message: 'Empleado no encontrado en bajas empresa' });
    }

    // Log audit
    await AuditService.logAction({
      userId: user.email || '',
      userRole: (user.role as 'super_admin' | 'admin') || 'normal',
      action: 'reactivate_employee_from_company_leave',
      entityType: 'employee',
      entityId: reactivatedEmployee.idGlovo,
      entityName: \\ \\,
      description: \Empleado reactivado desde baja empresa: \ \ (\)\,
      newData: reactivatedEmployee,
    });

    res.json(reactivatedEmployee);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(' Error reactivating employee:', error);
    res.status(500).json({ message: 'Failed to reactivate employee' });
  }
});
