#!/usr/bin/env python3
"""
Script para crear SQL de UPSERT con los nuevos campos glovo y uber_eats
"""

import pandas as pd
import sys
import os

def clean_sql_value(value):
    """Limpia un valor para SQL, manejando nulos y escapando comillas"""
    if pd.isna(value) or value == '' or value == 'nan':
        return 'NULL'
    
    # Convertir a string y escapar comillas simples
    value_str = str(value).replace("'", "''")
    return f"'{value_str}'"

def clean_sql_numeric(value):
    """Limpia un valor numérico para SQL"""
    if pd.isna(value) or value == '' or value == 'nan':
        return 'NULL'
    
    try:
        # Intentar convertir a número
        num_value = float(value)
        return str(int(num_value)) if num_value.is_integer() else str(num_value)
    except:
        return 'NULL'

def clean_sql_boolean(value):
    """Limpia un valor booleano para SQL"""
    if pd.isna(value) or value == '' or value == 'nan':
        return 'false'
    
    value_str = str(value).lower()
    if value_str in ['true', '1', 'yes', 'si', 'sí']:
        return 'true'
    return 'false'

def crear_upsert_con_plataformas():
    # Archivo de entrada (usando el CSV existente del VPS)
    csv_file = "plantilla_empleados_93.csv"
    sql_file = "upsert_empleados_CON_PLATAFORMAS.sql"
    
    try:
        # Verificar que el archivo existe
        if not os.path.exists(csv_file):
            print(f"❌ Error: No se encontró el archivo '{csv_file}'")
            print(f"📁 Archivos disponibles en el directorio:")
            for file in os.listdir('.'):
                if file.endswith('.csv'):
                    print(f"   - {file}")
            return False
        
        print(f"📖 Leyendo archivo CSV: {csv_file}")
        
        # Leer el archivo CSV
        df = pd.read_csv(csv_file)
        
        print(f"✅ Archivo leído exitosamente")
        print(f"📊 Dimensiones: {df.shape[0]} filas x {df.shape[1]} columnas")
        
        # Crear SQL de UPSERT
        sql_queries = []
        
        # Header del archivo SQL
        sql_queries.append("-- SQL para UPSERT de empleados CON CAMPOS DE PLATAFORMAS")
        sql_queries.append("-- Ejecutar en pgAdmin en la base de datos employee_management")
        sql_queries.append("-- Fecha: " + pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'))
        sql_queries.append("-- INCLUYE: glovo, uber_eats")
        sql_queries.append("")
        
        # Procesar cada fila
        processed_count = 0
        for index, row in df.iterrows():
            if pd.isna(row['id_glovo']) or row['id_glovo'] == '':
                print(f"⚠️ Fila {index + 1}: ID Glovo vacío, saltando...")
                continue
            
            try:
                # Crear query de UPSERT usando ON CONFLICT con la estructura CORRECTA + plataformas
                sql_query = f"""
-- Empleado: {row['nombre']} {row['apellido']} (ID: {row['id_glovo']})
INSERT INTO employees (
    id_glovo,
    email_glovo,
    turno_1,
    nombre,
    apellido,
    telefono,
    email,
    horas,
    cdp,
    complementaries,
    ciudad,
    citycode,
    dni_nie,
    iban,
    direccion,
    vehiculo,
    naf,
    fecha_alta_seg_soc,
    status_baja,
    estado_ss,
    informado_horario,
    cuenta_divilo,
    proxima_asignacion_slots,
    jefe_trafico,
    coments_jefe_de_trafico,
    incidencias,
    fecha_incidencia,
    faltas_no_check_in_en_dias,
    cruce,
    status,
    penalization_start_date,
    penalization_end_date,
    original_hours,
    flota,
    vacaciones_disfrutadas,
    vacaciones_pendientes,
    turno_2,
    puesto,
    glovo,
    uber_eats,
    updated_at
) VALUES (
    {clean_sql_value(row['id_glovo'])},
    {clean_sql_value(row['email_glovo'])},
    {clean_sql_value(row['turno_1'])},
    {clean_sql_value(row['nombre'])},
    {clean_sql_value(row['apellido'])},
    {clean_sql_value(row['telefono'])},
    {clean_sql_value(row['email'])},
    {clean_sql_numeric(row['horas'])},
    {clean_sql_numeric(row['cdp'])},
    {clean_sql_value(row['complementaries'])},
    {clean_sql_value(row['ciudad'])},
    {clean_sql_value(row['citycode'])},
    {clean_sql_value(row['dni_nie'])},
    {clean_sql_value(row['iban'])},
    {clean_sql_value(row['direccion'])},
    {clean_sql_value(row['vehiculo'])},
    {clean_sql_value(row['naf'])},
    {clean_sql_value(row['fecha_alta_seg_soc'])},
    {clean_sql_value(row['status_baja'])},
    {clean_sql_value(row['estado_ss'])},
    {clean_sql_boolean(row['informado_horario'])},
    {clean_sql_value(row['cuenta_divilo'])},
    {clean_sql_value(row['proxima_asignacion_slots'])},
    {clean_sql_value(row['jefe_trafico'])},
    {clean_sql_value(row['coments_jefe_de_trafico'])},
    {clean_sql_value(row['incidencias'])},
    {clean_sql_value(row['fecha_incidencia'])},
    {clean_sql_numeric(row['faltas_no_check_in_en_dias'])},
    {clean_sql_value(row['cruce'])},
    {clean_sql_value(row['status'])},
    {clean_sql_value(row['penalization_start_date'])},
    {clean_sql_value(row['penalization_end_date'])},
    {clean_sql_numeric(row['original_hours'])},
    {clean_sql_value(row['flota'])},
    {clean_sql_numeric(row['vacaciones_disfrutadas'])},
    {clean_sql_numeric(row['vacaciones_pendientes'])},
    {clean_sql_value(row['turno_2'])},
    {clean_sql_value(row['puesto'])},
    {clean_sql_value(row.get('glovo', ''))},  -- Campo nuevo
    {clean_sql_value(row.get('uber_eats', ''))},  -- Campo nuevo
    CURRENT_TIMESTAMP
)
ON CONFLICT (id_glovo) DO UPDATE SET
    email_glovo = EXCLUDED.email_glovo,
    turno_1 = EXCLUDED.turno_1,
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    horas = EXCLUDED.horas,
    cdp = EXCLUDED.cdp,
    complementaries = EXCLUDED.complementaries,
    ciudad = EXCLUDED.ciudad,
    citycode = EXCLUDED.citycode,
    dni_nie = EXCLUDED.dni_nie,
    iban = EXCLUDED.iban,
    direccion = EXCLUDED.direccion,
    vehiculo = EXCLUDED.vehiculo,
    naf = EXCLUDED.naf,
    fecha_alta_seg_soc = EXCLUDED.fecha_alta_seg_soc,
    status_baja = EXCLUDED.status_baja,
    estado_ss = EXCLUDED.estado_ss,
    informado_horario = EXCLUDED.informado_horario,
    cuenta_divilo = EXCLUDED.cuenta_divilo,
    proxima_asignacion_slots = EXCLUDED.proxima_asignacion_slots,
    jefe_trafico = EXCLUDED.jefe_trafico,
    coments_jefe_de_trafico = EXCLUDED.coments_jefe_de_trafico,
    incidencias = EXCLUDED.incidencias,
    fecha_incidencia = EXCLUDED.fecha_incidencia,
    faltas_no_check_in_en_dias = EXCLUDED.faltas_no_check_in_en_dias,
    cruce = EXCLUDED.cruce,
    status = EXCLUDED.status,
    penalization_start_date = EXCLUDED.penalization_start_date,
    penalization_end_date = EXCLUDED.penalization_end_date,
    original_hours = EXCLUDED.original_hours,
    flota = EXCLUDED.flota,
    vacaciones_disfrutadas = EXCLUDED.vacaciones_disfrutadas,
    vacaciones_pendientes = EXCLUDED.vacaciones_pendientes,
    turno_2 = EXCLUDED.turno_2,
    puesto = EXCLUDED.puesto,
    glovo = EXCLUDED.glovo,
    uber_eats = EXCLUDED.uber_eats,
    updated_at = CURRENT_TIMESTAMP;
"""
                
                sql_queries.append(sql_query)
                processed_count += 1
                
            except Exception as e:
                print(f"⚠️ Error procesando fila {index + 1}: {str(e)}")
                continue
        
        # Escribir archivo SQL
        print(f"\n💾 Creando archivo SQL con plataformas: {sql_file}")
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_queries))
        
        print(f"✅ Archivo SQL con plataformas creado exitosamente!")
        print(f"📁 Archivo: {sql_file}")
        print(f"📊 Queries generadas: {processed_count}")
        print(f"🔧 Nuevos campos incluidos: glovo, uber_eats")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante la creación del SQL: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔄 Iniciando creación de SQL de UPSERT CON PLATAFORMAS...")
    success = crear_upsert_con_plataformas()
    
    if success:
        print("\n🎉 ¡SQL de UPSERT CON PLATAFORMAS creado! Usa el archivo 'upsert_empleados_CON_PLATAFORMAS.sql' en pgAdmin.")
    else:
        print("\n💥 La creación del SQL falló. Revisa el error anterior.")
        sys.exit(1)
